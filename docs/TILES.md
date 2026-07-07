# FOGBOUND — Tile Data Registry

Companion to Decision 081. Describes the target design for tile content and
the concrete gap between it and what exists today.

## Why: themes and the map editor both need this

Post-launch reskins (new visual theme, same mechanics) and a future map
editor both need tile *behavior* to be independent of tile *art*, and both
need to add new tiles without touching the rules engine or the bot each
time. Hardcoding each tile as its own `if` branch means every new tile is a
code change in three places (rules, bot heuristic, client art mapping) —
that cost is fine for 2 tiles (today) and not fine for 48 (the full GDD
library).

## Current baseline (what exists today, pre-registry)

Tiles are just two free-form strings on `TileSchema`
(`backend/src/colyseus/schemas/TileSchema.ts`): `tileType` (terrain) and
`treasureType` (content), plus a numeric `treasureValue`. Nothing enforces
what values are valid — a typo'd tile type would silently do nothing rather
than fail. Concretely hardcoded today, each a separate thing to update if a
tile is added:

- `GameRules.isValidMove`: `tile.tileType === 'water' && !explorer.hasBoat`
  — one hardcoded terrain check.
- `GameRules.applyMove`: three individual hardcoded equality checks —
  `treasureType === 'bag'` → `hasBag = true`, `=== 'shield'` → `hasShield`,
  `=== 'boat'` → `hasBoat`. A 4th equip-like item needs a 4th branch.
- `BotAI.ts` heuristic: `treasureType !== 'none' && !== ''` for "is there
  something pickup-worthy here," with no distinction between item kinds.
- `BoardSetup.placeTreasure`: hardcodes `'coin'`/`'shield'` string literals
  and their spawn chances (`COIN_CHANCE = 0.12`, `SHIELD_CHANCE = 0.03`)
  directly in the placement loop.
- Only 2 of the GDD's 48 tile types exist in any of the above (coins,
  shields). Everything else in the Tile Library (GDD.md) is unimplemented.

This is the exact pattern Decision 081 replaces — not because it's broken
today (it works fine for 2 tiles), but because it doesn't scale to 48.

## Target design

Every tile is a data record:

```ts
interface TileDefinition {
  id: string;            // 'coin' | 'sword' | 'quicksand' | ... (48 total, GDD.md)
  category: 'treasure' | 'movement' | 'terrain' | 'combat' | 'structure' | 'events' | 'alliance';
  behavior: string;      // what it DOES — e.g. 'blocks_without_boat', 'grants_equip:hasShield',
                          // 'grants_equip:hasBoat', 'score_on_pickup', 'combat_modifier', ...
  spawnWeight: number;   // relative placement probability, replaces per-tile *_CHANCE constants
  effectValue?: number;  // e.g. coin value range, damage, duration — behavior-specific
}
```

- Lives as a TypeScript registry (source of truth for types + IDE
  autocomplete), seeded into a Postgres table on boot/migration so it's
  queryable and editable without a code deploy (needed for the map editor
  and any live-ops tuning later).
- `GameRules` and `BotAI` branch on `category`/`behavior`, never on a
  specific `id`. The three hardcoded `treasureType === 'bag'/'shield'/
  'boat'` checks collapse into one generic "apply this tile's
  `grants_equip:*` behavior" branch that works for any current or future
  equip tile without a new `if`.
- `BoardSetup.placeTreasure` draws from the registry's `spawnWeight`s
  instead of hardcoded per-type constants — adding a new treasure tile
  becomes a data entry, not a code change to the placement function.
- The client stays exactly what it already is (Decision 043's pure-renderer
  rule, unchanged): it still only ever receives `tileType`/`treasureType`
  strings over the wire and maps `id -> art` via a per-theme resource. The
  registry's `behavior`/`category`/`spawnWeight` are server-only — the
  client never needs to know a tile's *behavior*, only how to draw it.

## Migration shape (not yet started)

1. Define the registry + all 48 GDD tiles as data (start with Tier 1's 20,
   per GDD's own tiering).
2. Seed to Postgres (new migration + Drizzle schema, following the existing
   `node-pg-migrate` + Drizzle pattern in `backend/db/`).
3. Replace the hardcoded checks listed above in `GameRules`/`BotAI`/
   `BoardSetup` with registry lookups, one at a time, with the existing
   Jest suite (`GameRules.spec.ts`, `BotAI.spec.ts`, `BoardSetup.spec.ts`)
   as the regression guard — behavior for coin/shield must not change.
4. Only then add genuinely new tiles (sword, water/boat, etc.) — adding them
   post-migration means adding data records, not new code paths.
