# FOGBOUND — Tile Data Registry

Companion to Decisions 081/082. Describes the tile registry's design and
current implementation state.

**Status: the registry exists** — `backend/src/colyseus/model/TileRegistry.ts`.
`GameRules`/`BotAI`/`BoardSetup` all read it; none hardcode a tile-id string
anymore. Not yet done: seeding it to Postgres, and the other 44 GDD tiles
beyond the 6 entries below (see "What's left" at the bottom).

## Why: themes and the map editor both need this

Post-launch reskins (new visual theme, same mechanics) and a future map
editor both need tile *behavior* to be independent of tile *art*, and both
need to add new tiles without touching the rules engine or the bot each
time. Hardcoding each tile as its own `if` branch means every new tile is a
code change in three places (rules, bot heuristic, client art mapping) —
that cost is fine for 2 tiles (today) and not fine for 48 (the full GDD
library).

## Before the registry (historical — no longer true, kept for context)

Tiles used to be just two free-form strings on `TileSchema`
(`backend/src/colyseus/schemas/TileSchema.ts`): `tileType` (terrain) and
`treasureType` (content), plus a numeric `treasureValue` — still true of the
wire format (Decision 043 pure-renderer boundary is unchanged), but the
*server-side rules* no longer hardcode against these strings directly. The
old pattern, now replaced: `GameRules.isValidMove` compared `tileType`
directly to `'water'`; `GameRules.applyMove` had three individual
`treasureType === 'bag'/'shield'/'boat'` checks; `BoardSetup.placeTreasure`
hardcoded `'coin'`/`'shield'` literals and their spawn chances as module
constants (`COIN_CHANCE`, `SHIELD_CHANCE`). `BotAI`'s heuristic already
checked genericly ("is there anything pickup-worthy here") and needed no
hardcoded-id fix, only a switch to reading the registry's `category`.

## Current design (implemented)

`backend/src/colyseus/model/TileRegistry.ts` exports a discriminated union
on `behavior` (mirrors `BotAction` in `BotAI.ts`, this codebase's existing
pattern for this kind of tagged data):

```ts
type TileCategory = 'terrain' | 'treasure' | 'combat_item' | 'movement' | 'hazard' | 'special';

type TileEffect =
  | { behavior: 'walkable' | 'blocks_without_boat' }
  | { behavior: 'grants_equip'; equipFlag: 'hasShield' | 'hasBag' | 'hasBoat' }
  | { behavior: 'treasure_value'; valueRange: readonly [number, number] }
  | { behavior: 'arrow_push'; direction: 'north' | 'south' | 'east' | 'west' }
  | { behavior: 'cannon_launch'; direction: 'north' | 'south' | 'east' | 'west' }
  | { behavior: 'immobilize' };

type TileDefinition = TileEffect & { id: string; category: TileCategory; spawnWeight: number };
```

**Category vocabulary note:** these 6 categories are deliberately NOT the
same list as GDD.md's Tile Library table (`Treasure/Movement/Terrain/Combat/
Structure/Events/Alliance`, 7 values, Title Case). GDD's list is a
design-facing content catalog (which tier/table a tile ships in); this
registry's categories are engine-facing tags `GameRules`/`BotAI` branch on
in code. They're allowed to diverge — GDD answers "what is this tile,"
this registry answers "how does the engine treat it" — but the mismatch is
called out explicitly here so it doesn't read as an unreconciled error.

Fifteen entries exist today (6 original + 9 added in Decision 086):

| id | category | behavior | spawnWeight | notes |
|---|---|---|---|---|
| grass | terrain | walkable | 0 | the only terrain; not spawned via chance, GameRoom fills it unconditionally |
| water | terrain | blocks_without_boat | 0 | catalog-only — nothing spawns it yet (Decision 082) |
| coin | treasure | treasure_value, [1,3] | 0.12 | migrated unchanged from `COIN_CHANCE` |
| shield | combat_item | grants_equip, hasShield | 0.03 | migrated unchanged from `SHIELD_CHANCE` |
| bag | special | grants_equip, hasBag | 0 | catalog-only (Decision 082) |
| boat | movement | grants_equip, hasBoat | 0 | catalog-only (Decision 082) |
| arrow_north, arrow_south, arrow_east, arrow_west | movement | arrow_push | 0.01 each (0.04 total) | pushes explorer 1 tile in direction; stays put if OOB or blocked |
| cannon_north, cannon_south, cannon_east, cannon_west | movement | cannon_launch | 0 (was 0.0075 each) | launches to last walkable tile in direction; stays put at edge. Zeroed for expansion scope (Decision 103) — definitions retained so an existing board still resolves the behavior |
| trap | hazard | immobilize | 0.04 | sets immobilizedUntilTurn = turnNumber + playerCount; prevents movement for one player-turn |

`getTileDefinition(id)` is the lookup `GameRules`/`BotAI` use instead of a
literal-string comparison. `getSpawnableTreasureTiles()` returns the
`spawnWeight > 0`, non-terrain entries in declaration order (coin, shield,
arrow_north, arrow_south, arrow_east, arrow_west, trap — the cannon variants
drop out of this list at weight 0) —
`BoardSetup.placeTreasure` walks this list as a cumulative-probability
table, so that order is load-bearing (see `TileRegistry.spec.ts`'s explicit
ordering test).

**Known follow-up risk, not yet fixed:** the Godot client's tile-art swatch
list (`godot/scenes/match/board/board_layer.gd`) already lists a `"sword"`
nothing sends and has no swatch for `"bag"`/`"boat"`. Harmless while those
stay at `spawnWeight: 0` — but the first task that gives either a nonzero
weight needs a companion client fix, or this becomes an immediately visible
rendering bug (silent fallback to plain terrain color).

`arrow_north` etc., cannon, and trap now have gray-box swatches + text labels
in `board_layer.gd` (added alongside their server-side tile definitions —
Decision 086). The remaining gap is `"sword"`, `"bag"`, and `"boat"` only.

## What's left

The registry mechanism is done; most of its *content* isn't:
1. Seed to Postgres (still TypeScript-only right now) — needed for the map
   editor / live-ops tuning to edit tiles without a code deploy.
2. Add the remaining GDD tiles as data (sword, water/boat as genuinely
   spawnable, jungle/quicksand/ice/desert terrain, and so on) — each is now
   a data entry, not a new `if` in three files, which was the point.
   **Done (Decision 086):** arrow_north/south/east/west, cannon_north/south/east/west, trap.
3. Whenever water/boat/sword becomes real content: fix the client art-swatch gap
   above first (or it'll spawn invisibly). Arrow/cannon/trap already have
   gray-box swatches — no gap for them.
