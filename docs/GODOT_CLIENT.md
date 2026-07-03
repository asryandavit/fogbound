# FOGBOUND — Godot Client Implementation Guide

Active client: Godot 4.6.3 standard GDScript build.
Unity game/ is frozen as a read-only fallback (Decision 033).
Architecture overview: docs/ARCHITECTURE.md.
All architectural decisions: docs/DECISIONS.md entries 033–049.

---

## Unity → Godot Translation Table

| Unity (frozen, game/) | Godot equivalent (godot/) | Decision |
|---|---|---|
| Unity 6 LTS (6000.x) | Godot 4.6.3 stable | 035 |
| C# MonoBehaviour (View) | GDScript Node | 034 |
| VContainer DI (024) | Autoload singletons + signals as event bus | 039, 042 |
| UI Toolkit + UGUI hybrid (023) | Control nodes + Theme resources | — |
| PrimeTween (023) | Built-in create_tween() | — |
| Cinemachine 3 rig (025) | Camera2D + custom rig script | 047 |
| New Input System multitouch (025) | InputEventScreenTouch / Drag / MagnifyGesture | — |
| Addressables (026) | .pck packs / Play Asset Delivery | — |
| ScriptableObject TileDefinition (026) | Godot Resource (.tres) subclass | — |
| Google-Sheets → SO importer (026) | Google-Sheets → .tres importer | — |
| Unity Localization | Godot localization (CSV/PO + tr()) | — |
| UGS Cloud Save + Remote Config | Existing NestJS + Postgres endpoints | — |
| C# Colyseus SDK (NuGet) | Colyseus native GDScript SDK 0.17.11 (GDExtension) | 036 |

---

## Folder Structure

```
godot/
├── autoloads/
│   ├── config.gd            # env + server URL, NO secrets
│   ├── network_manager.gd   # Colyseus connection (ONLY Colyseus.* importer)
│   └── game_state.gd        # state store + signals (no Colyseus import)
├── scenes/
│   ├── match/
│   │   ├── board/           # BoardLayer.tscn, FogLayer.tscn (TileMapLayer)
│   │   ├── explorers/       # Explorer.tscn + ExplorerController.gd
│   │   └── hud/             # TopBar.tscn, ActionStrip.tscn, ExplorerMiniCard.tscn
│   ├── menu/                # MainMenu.tscn, Settings.tscn, Lobby.tscn
│   └── shared/              # Reusable UI components
├── scripts/
│   └── network/
│       └── state_mapper.gd  # translates raw SDK data → game_state updates
├── resources/
│   └── tile_definitions/    # TileDefinition.tres instances (one per tile type)
├── assets/
│   ├── art/                 # source textures (not bundled in APK base)
│   └── audio/               # source audio
├── tests/                   # GUT test files
└── addons/
    └── colyseus/            # SDK pinned 0.17.11 — never auto-update
```

---

## Autoload Registration Order

Register in Project → Project Settings → Autoload in this order (order matters):

| Order | Path | Global name |
|---|---|---|
| 1 | autoloads/config.gd | Config |
| 2 | autoloads/network_manager.gd | NetworkManager |
| 3 | autoloads/game_state.gd | GameState |

config.gd must be first so NetworkManager can read the server URL at startup.

---

## config.gd — Environment and Endpoints

config.gd holds only non-secret, public-facing values.

```gdscript
# autoloads/config.gd
extends Node

const SERVER_URL_LOCAL := "ws://localhost:4567"
const SERVER_URL_PROD  := "wss://api.fogbound.game:4567"  # placeholder

var server_url: String:
    get:
        # Set FOGBOUND_ENV=production in export environment to use prod URL.
        # Never hardcode credentials or secrets here.
        if OS.get_environment("FOGBOUND_ENV") == "production":
            return SERVER_URL_PROD
        return SERVER_URL_LOCAL
```

---

## Schema Definition Pattern (GDScript inner-class limit)

GDScript 4 cannot `extends Colyseus.Schema` in a standalone file with `class_name`.
Define all schema classes as inner classes within a single `schema_defs.gd`:

```gdscript
# scripts/network/schema_defs.gd
# Inner classes extend Colyseus.Schema — this works; standalone class_name files do not.

class TileSchema extends Colyseus.Schema:
    static func definition() -> Array:
        return [
            Colyseus.Schema.Field.new("x",             Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("y",             Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("tileType",      Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("isRevealed",    Colyseus.Schema.BOOLEAN),
            Colyseus.Schema.Field.new("treasureType",  Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("treasureValue", Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("isOccupied",    Colyseus.Schema.BOOLEAN),
        ]

class ExplorerSchema extends Colyseus.Schema:
    static func definition() -> Array:
        return [
            Colyseus.Schema.Field.new("explorerId",   Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("playerId",     Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("x",            Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("y",            Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("state",        Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("score",        Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("coinCount",    Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("hasBag",       Colyseus.Schema.BOOLEAN),
            Colyseus.Schema.Field.new("hasBoat",      Colyseus.Schema.BOOLEAN),
            Colyseus.Schema.Field.new("hasShield",    Colyseus.Schema.BOOLEAN),
            Colyseus.Schema.Field.new("isBot",        Colyseus.Schema.BOOLEAN),
            Colyseus.Schema.Field.new("botMoveCount", Colyseus.Schema.NUMBER),
        ]

class PlayerSchema extends Colyseus.Schema:
    static func definition() -> Array:
        return [
            Colyseus.Schema.Field.new("playerId",    Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("username",    Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("score",       Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("isBot",       Colyseus.Schema.BOOLEAN),
            Colyseus.Schema.Field.new("isConnected", Colyseus.Schema.BOOLEAN),
            Colyseus.Schema.Field.new("slotNumber",  Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("teamColor",   Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("baseX",       Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("baseY",       Colyseus.Schema.NUMBER),
        ]

class TurnStateSchema extends Colyseus.Schema:
    static func definition() -> Array:
        return [
            Colyseus.Schema.Field.new("currentPlayerId", Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("turnNumber",      Colyseus.Schema.INT32),
            Colyseus.Schema.Field.new("phase",           Colyseus.Schema.STRING),
        ]

class FogboundStateSchema extends Colyseus.Schema:
    static func definition() -> Array:
        return [
            Colyseus.Schema.Field.new("matchId",          Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("status",           Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("winCondition",     Colyseus.Schema.STRING),
            Colyseus.Schema.Field.new("turnTimerSeconds", Colyseus.Schema.NUMBER),
            Colyseus.Schema.Field.new("tiles",     Colyseus.Schema.MAP, TileSchema),
            Colyseus.Schema.Field.new("explorers", Colyseus.Schema.MAP, ExplorerSchema),
            Colyseus.Schema.Field.new("players",   Colyseus.Schema.MAP, PlayerSchema),
            Colyseus.Schema.Field.new("turnState", Colyseus.Schema.REF, TurnStateSchema),
        ]
```

Field names verified against backend/src/colyseus/schemas/ (GC1, 2026-06-17).
Dictionary decode (without set_state_type) is CONFIRMED working in 0.17.11 — state arrives as
nested Dictionaries; state_mapper.gd accesses them by key. Typed Schema decode via inner-class
subclasses (above) was not empirically tested in GC1 and requires integration testing in GC2.

---

## State Callback Consumption Pattern (Decision 044)

All state listening goes through `Colyseus.Callbacks.of(room)` in network_manager.gd.
Do not poll `get_state()` in `_process()`.

```gdscript
# Inside network_manager.gd, called after room.joined fires:
func _setup_callbacks(room) -> void:
    var state = room.get_state()   # Dictionary (no set_state_type) or Schema instance
    var cb := Colyseus.Callbacks.of(room)

    # Tiles: on_add back-fills all existing tiles first, then fires for new additions.
    # Attach nested listeners HERE — on_change does not cascade to nested schemas.
    cb.on_add(state, "tiles", func(tile, coord_key: String) -> void:
        cb.listen(tile, "isRevealed", func(_new_val, _old_val) -> void:
            state_mapper.apply_tile_change(coord_key, tile)
        )
        state_mapper.apply_tile_change(coord_key, tile)
    )

    # Explorers
    cb.on_add(state, "explorers", func(explorer, id: String) -> void:
        cb.listen(explorer, "x", func(_n, _o) -> void: state_mapper.apply_explorer_change(id, explorer))
        cb.listen(explorer, "y", func(_n, _o) -> void: state_mapper.apply_explorer_change(id, explorer))
        state_mapper.apply_explorer_change(id, explorer)
    )
    cb.on_remove(state, "explorers", func(_explorer, id: String) -> void:
        state_mapper.remove_explorer(id)
    )

    # Turn state (nested REF schema on root). listen(), NOT on_change("turnState", ...) —
    # the field-keyed on_change() overload crashes the native extension on a root
    # REF field (confirmed in GC2, see Decision 060). listen() is the safe equivalent.
    cb.listen(state, "turnState", func(turn_state, _old_val) -> void:
        state_mapper.apply_turn_change(turn_state)
    )

    # Signal game_state that initial hydration is complete.
    # NOTE: the generic on_change(state, callback) form invokes its callback with
    # ZERO arguments, not one — func(_changes) throws at runtime (Decision 060).
    cb.on_change(state, func() -> void:
        if not GameState.initialized:
            state_mapper.finalize_initialization()
    )
```

**Confirmed API (GC1 + GC2 empirical tests, SDK 0.17.11):**
- `Colyseus.Callbacks.of(room)` — CONFIRMED working; returns a Callbacks object
- `on_add(state, "collection_key", func(item, key))` — CONFIRMED 3-arg form
- `on_add(room, callback)` — INVALID; room is not a valid target
- State is empty right after `joined`; `on_add` back-fills existing items on first server patch
- `on_remove(state, "collection_key", func(item, key))` — CONFIRMED (GC2), no issues
- `listen(item, "field_name", func(new_val, old_val))` — CONFIRMED (GC2), safe on both
  collection-item schemas (tile, explorer) AND root-level REF fields (turnState)
- `on_change(state, func())` — CONFIRMED (GC2) — **zero-argument** callback, not one.
  `func(_changes)` throws "Method expected 1 argument(s), but called with 0" at runtime.
- `on_change(state, "field_name", func(val, key))` — **CONFIRMED BROKEN** (GC2): crashes
  the native extension with a misaligned-pointer panic when used on a root-level Schema
  REF field (e.g. turnState) — see Decision 060. Use `listen(state, "field_name", ...)`
  instead; same effective behavior, does not crash.

**Critical callback rules:**
- `on_add` back-fills existing items — treat it as "initial + future additions combined"
- `on_change` does NOT cascade to nested schema properties — always attach `listen` calls
  for nested fields inside the `on_add` for their parent collection
- Schema instances arrive as Dictionary (Dictionary decode confirmed); state_mapper accesses
  fields by string key (e.g. `tile_dict["isRevealed"]`)
- Store handles returned by `listen`, `on_add`, `on_remove`, `on_change` and call
  `cb.remove(handle)` on scene cleanup to prevent dangling callbacks

---

## Reconnection Flow (Decision 045)

```
room.left / room.dropped signal fires
→ HUD shows "Reconnecting…" overlay
→ SDK auto-reconnects with exponential backoff
→ room.reconnected signal fires on success
→ network_manager re-calls _setup_callbacks(room) on fresh state
→ GameState fully re-hydrated from server
→ overlay hides
```

Backoff defaults match the TypeScript SDK. Override if needed:
```gdscript
room.set_reconnection_options({
    "max_retries": 5,
    "min_delay_ms": 1000,
    "max_delay_ms": 30000,
})
```

No local state prediction or reconciliation. Server state is always truth.

---

## Camera Rig (Decision 025 math, Godot implementation)

Reuse the exact formulas from Decision 025:

```gdscript
# Pinch zoom
ortho_size -= pinch_delta * 0.5 * ortho_size

# Lerp to target each frame
camera.zoom = lerp(camera.zoom, target_zoom, 12.0 * delta)

# Pivot on finger midpoint in world space
var midpoint_world := camera.get_canvas_transform().affine_inverse() * screen_midpoint
# (shift camera position to keep midpoint fixed while zooming)
```

Zoom clamp: min = full board visible + 10% padding; max = 5×5 tiles visible.
Double-tap: 3-level cycle (fit → default → close 5×5), 350ms EaseInOutCubic via create_tween().
Auto-pan: fires only on the LOCAL player's turn start. Never during opponent turns.
Input: `InputEventMagnifyGesture` for native pinch; fall back to manual 2-finger tracking
via `InputEventScreenTouch` if not available on the target device.

---

## Input Handling

All input handled at Match scene root; dispatched upward to NetworkManager for move requests.

```gdscript
# Tap → select explorer or tile
func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch and event.pressed:
        _handle_tap(event.position)

func _handle_tap(screen_pos: Vector2) -> void:
    var world_pos := get_viewport().get_canvas_transform().affine_inverse() * screen_pos
    var coord    := _world_to_board_coord(world_pos)
    # Dispatch to InputController — never mutate GameState directly
    InputController.on_tap(coord)
```

Never mutate GameState from input handlers. All game state changes come from the server.

---

## Testing

GUT (Godot Unit Test) for logic in state_mapper.gd and game_state.gd.
Call `Colyseus.poll()` manually once per frame in headless GUT tests (the _Poller autonode
is not active in headless mode).
Network-dependent tests use a mock that implements the same signal interface as Room.
