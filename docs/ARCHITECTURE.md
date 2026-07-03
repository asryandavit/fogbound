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
| View | scenes/match/ | Subscribe to game_state signals. Render. Forward input to network_manager. |

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

## Known Beta-SDK Risks

The Colyseus native SDK (0.17.11, GDExtension) is in beta. All mitigations are isolated
behind `network_manager.gd` — SDK-specific workarounds never leak to view code.

| Risk | Status | Mitigation |
|---|---|---|
| `bind_to()` not in GDScript wrapper | Confirmed absent | Use `Colyseus.Callbacks.of(room)` exclusively; never call bind_to() |
| `on_change` does not cascade to nested schemas | Confirmed | Attach nested `listen()` calls inside the `on_add` callback (Decision 044) |
| `on_change(state, "field", func(val,key))` crashes on root REF fields | Confirmed (Decision 060) | Use `listen(state, "field", func(new,old))` instead — never the field-keyed on_change() overload on a root-level Schema REF field |
| Generic `on_change(state, callback)` invokes callback with zero args | Confirmed (Decision 060) | Callback must be `func() -> void`, not `func(_changes)` |
| `GameState.state_initialized` can fire before collections are populated | Confirmed (Decision 061) | Never cache a value derived from a collection (e.g. board row count) gated on `is_initialized` — recompute fresh from current data on every relevant event instead |
| Schema instances may arrive as Dictionary when `set_state_type()` not called | Confirmed | state_mapper.gd handles both; spike confirmed Dictionary decode works for all 169 tiles |
| GDScript inner-class limit: cannot `extends Colyseus.Schema` in a standalone file | Confirmed | Define GDScript schema classes as inner classes within a single schema_defs.gd file |
| Callbacks dispatched off the WebSocket thread | Beta risk | In headless/GUT tests, call `Colyseus.poll()` manually once per frame; auto-polling is active in editor/device via the SDK's internal _Poller node |
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
