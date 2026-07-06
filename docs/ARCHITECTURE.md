# FOGBOUND — System Architecture

## Data Flow (one-directional)

```
Colyseus server
    │  binary delta (WebSocket, @colyseus/schema 0.17)
    ▼
network_manager.gd    [autoload — ONLY file that imports Colyseus.*]
    │  raw Dictionary or Schema instances
    ▼
state_mapper.gd       [scripts/network/ — translates + validates]
    │  clean GDScript structs
    ▼
game_state.gd         [autoload — state store, emits change signals]
    │  signals: tile_changed, explorer_moved, turn_changed …
    ▼
View layer            [scenes/match/ — renders state, no mutations]
    │
    │  player input (tap → move request)
    ▼
network_manager.gd    [room.send_message("move_explorer", payload)]
    │  request only — client never applies its own moves
    ▼
Colyseus server       [validates + applies → sends delta → loop]
```

## Layer Responsibilities

| Layer | File | Responsibility |
|---|---|---|
| Config | autoloads/config.gd | Server URL, env flags. No secrets. |
| Transport | autoloads/network_manager.gd | Connection lifecycle, send/receive, reconnection. Only Colyseus importer. |
| Translation | scripts/network/state_mapper.gd | Map raw SDK data to clean structs. Validate shapes. Never imported by views. |
| State Store | autoloads/game_state.gd | Authoritative local copy of server state. Emits change signals. No Colyseus import. |
| Flow | autoloads/game_flow.gd | Scene transitions (menu ↔ match ↔ results) + carries the selected match mode across scene changes. No SDK, no game state — drives matches only via NetworkManager's public API. |
| View | scenes/menu/, scenes/match/ | Subscribe to game_state signals. Render. Forward input to network_manager. Menu/results are gray-box Controls (Decision 058). |

## SDK Boundary Rule (Decision 043)

Only `network_manager.gd` may import or reference `Colyseus.*`.
Only `state_mapper.gd` may consume raw SDK data (Dictionary / Schema instances).
No other file in the project references the SDK or raw server data shapes.
When the SDK API changes, only `network_manager.gd` and `state_mapper.gd` require edits.

## Signal Set (Decision 048)

### network_manager.gd — transport signals
| Signal | Args | Fired when |
|---|---|---|
| connection_state_changed | state: String | connect / disconnect / reconnect cycle |
| server_message | type: String, data: Dictionary | server sends a custom message |

### game_state.gd — game-truth signals
| Signal | Args | Fired when |
|---|---|---|
| state_initialized | — | first full state received after join |
| tile_changed | coord: String | tile's revealed / type / content changes |
| explorer_added | id: String | new explorer appears in state |
| explorer_moved | id: String | explorer x or y changes |
| explorer_removed | id: String | explorer leaves state |
| player_changed | id: String | player data changes |
| turn_changed | — | turnState changes (phase, player, number) |
| match_ended | winner_id: String | win condition met |

View nodes subscribe to game_state signals only — never to SDK events directly.

## Match Scene Tree (Decision 047)

```
Match (Node — scene root)
├── GameWorld (Node2D — moves with Camera2D)
│   ├── BoardLayer  (TileMapLayer — terrain + tile type)
│   ├── FogLayer    (TileMapLayer — fog overlay, from tile.isRevealed)
│   ├── Explorers   (Node2D — children are Explorer.tscn instances)
│   └── Camera2D    (rig per Decision 025 math)
└── HUD (CanvasLayer, layer 1 — fixed to screen, immune to camera)
    ├── TopBar
    ├── ActionStrip
    └── ExplorerMiniCard
```

Board uses two TileMapLayer nodes — never one node per tile (Decision 021 perf rule).
Explorers are individually instanced scenes: count is small (1–3 per player), interactive,
require per-instance signals.
Fog is derived entirely from `tile.isRevealed` in server state — never computed client-side.
Camera auto-pan fires only on the local player's turn start (Decision 025 fog-integrity rule;
camera is static during opponent turns to prevent information leak).

## Scene Flow (Decision 070/071/072)

```
MainMenu.tscn  (run/main_scene — Play vs Bot / vs Player / Quit)
    │  GameFlow.start_match(vs_bot)  → change_scene_to_file
    ▼
Match.tscn     (_ready → NetworkManager.connect_to_match(GameFlow.join_options()))
    │  GameState.match_ended  (from server "match_ended" → StateMapper → GameState)
    ▼
Results overlay (CanvasLayer above HUD — win/lose + scores)
    │  GameFlow.play_again()  ─┐        GameFlow.to_main_menu() ──► MainMenu.tscn
    └──────────────────────────┘ change_scene_to_file → Match.tscn (reconnects)
```

- `GameFlow` (autoload) carries the chosen mode across the scene change; the
  match connects from its own `_ready()` so all renderers exist first (the
  "scene present, THEN connect" ordering every GC task relied on).
- **Reset on connect:** `connect_to_match` calls `GameState.reset()` first, so a
  Play Again / new match never inherits the previous match's state (GameState is
  an autoload and outlives the scene). Called directly, not via a StateMapper
  helper — see the static-no-op risk row below.
- **Room lifecycle:** "vs Bot" uses SDK `create()` (fresh room); "vs Player" uses
  `join_or_create()`. Server caps `maxClients = 2` and `lock()s` a solo-bot room
  so matchmaking can't collide. `disconnect_from_match` tears down every room
  signal handler and nulls the client so a left room can't call back in.

## State Observation: full re-sync on state_changed (Decision 069)

`network_manager.gd` does NOT use `Colyseus.Callbacks` (`on_add`/`on_remove`/
`listen`) at all, despite that being the design through GC2-GC7 (Decisions
044/048/060/063). On every `room.state_changed` signal — confirmed reliable
across every task built in this project — `_sync_all_from_state()` re-reads
the entire current state fresh and pushes every tile/explorer/player/
turnState through `state_mapper.gd` unconditionally, rather than reacting to
individual field-level callbacks. This was forced by a real finding (below):
per-field `listen()` on a MapSchema collection item never fires again after
its initial registration in SDK 0.17.11, so granular reactive updates
silently never happened past the first change. Re-deriving everything on
every delta is simpler and provably correct; the cost (re-processing the
whole state each delta) is cheap at this project's board sizes (≤289 tiles,
a handful of explorers/players).

## Known Beta-SDK Risks

The Colyseus native SDK (0.17.11, GDExtension) is in beta. All mitigations are isolated
behind `network_manager.gd` — SDK-specific workarounds never leak to view code.

| Risk | Status | Mitigation |
|---|---|---|
| Per-field `listen()` on a MapSchema collection item (tiles/explorers/players obtained via `on_add`) never fires again after initial registration | Confirmed (Decision 069) | Abandoned Callbacks-based observation entirely — re-sync the full state on every `state_changed` event instead (see above) |
| `on_change(state, "field", func(val,key))` crashes the native extension on a root-level REF field | Confirmed (Decision 060) — no longer applicable, this overload isn't used at all anymore | N/A |
| `GameState.state_initialized` can fire before collections are populated | Confirmed (Decision 061) | Never cache a value derived from a collection (e.g. board row count) gated on `is_initialized` — recompute fresh from current data on every relevant event instead |
| GDScript lambdas capture outer local `var`s by value, not reference | Confirmed (Decision 063, general GDScript behavior, not Colyseus-specific) | Use a Dictionary/Array/RefCounted (reference type) to share mutable state across sibling closures — applies anywhere multiple closures need to share mutable local state, not just Colyseus code |
| A `static` method on a `class_name` script (StateMapper) that only forwards to an autoload method (`GameState.reset()`) silently no-opped — its body never ran, though sibling statics in the same file run fine | Confirmed live (Decision 072, general Godot behavior, not Colyseus-specific) | Call the autoload method directly from the Node context that needs it; verified across full `.godot` cache wipes. Reproduced only for one method — treat static→autoload forwarding as unreliable and prefer direct calls |
| Schema instances may arrive as Dictionary when `set_state_type()` not called | Confirmed | state_mapper.gd handles both; spike confirmed Dictionary decode works for all 169 tiles |
| GDScript inner-class limit: cannot `extends Colyseus.Schema` in a standalone file | Confirmed | Define GDScript schema classes as inner classes within a single schema_defs.gd file |
| Godot .NET/Mono unsupported by native SDK | Confirmed | GDScript standard build only (Decision 034) |

**Corrections vs earlier planning notes (AUTOMATION.MD):**
The installed SDK (0.17.11) DOES expose:
- `Room.reconnected` signal — fires on successful reconnect
- `Room.dropped` signal — fires on permanent disconnect
- `room.set_reconnection_options(options: Dictionary)` — reconnection backoff is tunable

These were listed as missing in earlier planning notes; they are present in the installed SDK.

## Fog-of-War Security Debt (Decision 049)

At launch, full board state is sent over the wire. Client hides unrevealed tiles visually.
A modified client can read hidden tile data.
Server-side StateView filtering is deferred (beta rough edges).
This is an explicit open security debt. Revisit before any public competitive matchmaking.
