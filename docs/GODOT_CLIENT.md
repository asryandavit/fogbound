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
│   ├── game_state.gd        # state store + signals (no Colyseus import)
│   └── game_flow.gd         # scene transitions + selected match mode (no SDK)
├── scenes/
│   ├── match/
│   │   ├── board/           # BoardLayer.tscn, FogLayer.tscn (TileMapLayer)
│   │   ├── explorers/       # Explorer.tscn + ExplorerController.gd
│   │   ├── hud/             # Hud.tscn (turn banner, End Turn, Undo)
│   │   └── results/         # Results.tscn — win/lose + scores overlay (Decision 070)
│   ├── menu/                # MainMenu.tscn (run/main_scene) — vs Bot / vs Player / Quit
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
| 4 | autoloads/game_flow.gd | GameFlow |

config.gd must be first so NetworkManager can read the server URL at startup.
GameFlow is last — it only calls NetworkManager (already registered) and drives
scene transitions.

## Game Flow (Decision 070/071/072)

`run/main_scene` is `scenes/menu/MainMenu.tscn`, not the match. Flow:
`MainMenu → (GameFlow.start_match) → Match.tscn → (GameState.match_ended) →
Results overlay → (GameFlow.play_again / to_main_menu)`. `GameFlow` carries the
chosen mode (`vs_bot`) across the `change_scene_to_file` boundary, since a
freshly-loaded scene can't be handed args; the match connects from its own
`_ready()` via `NetworkManager.connect_to_match(GameFlow.join_options())`.

- "vs Bot" → SDK `create()` (fresh room); "vs Player" → `join_or_create()`.
- `connect_to_match` calls `GameState.reset()` first (autoloads outlive the
  scene — a Play Again must not inherit the prior match). Called directly, NOT
  via a StateMapper static helper: that forwarding method was found to silently
  no-op in this Godot build (Decision 072) while direct calls work.
- `disconnect_from_match` disconnects all room signal handlers and nulls the
  client, so a left room can never call back into GameState (fixed a live
  cross-room player-merge bug, Decision 071).

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

## State Observation Pattern (Decision 069 — supersedes Decision 044)

**The `Colyseus.Callbacks` approach below this line's history (`on_add` /
`on_remove` / `listen`) is NOT what the client actually uses — do not
reimplement it.** It was the original GC2 design and looked correct in
testing, but was proven broken during live AI-opponent testing: per-field
`listen()` registered on a MapSchema collection item (tiles/explorers/
players, obtained via `on_add`) never fires again after its initial
registration in SDK 0.17.11. This wasn't caught earlier because every prior
test only ever exercised a single update to a given field; a real multi-move
match (many sequential updates to the same explorer's x/y) is what exposed
it — confirmed by a debug print inside the listen callback that fired zero
times across ten real server-side moves, while the backend's own logs proved
the moves were happening.

**What the client actually does:** `network_manager.gd` connects to
`room.state_changed` (a plain signal, not a Callbacks object) — confirmed
reliable across every task built in this project — and on every firing,
re-reads the ENTIRE state fresh and pushes every tile/explorer/player/
turnState through `state_mapper.gd` unconditionally:

```gdscript
# Inside network_manager.gd:
func _setup_state_callbacks() -> void:
    var state = _room.get_state()
    _sync_all_from_state(state)   # initial snapshot

func _on_state_changed() -> void:
    var state = _room.get_state()
    if state != null:
        _sync_all_from_state(state)

func _sync_all_from_state(state) -> void:
    var tiles = state.get("tiles")
    if tiles is Dictionary:
        for key in tiles.keys():
            StateMapper.apply_tile_change(key, tiles[key])

    var explorers = state.get("explorers")
    if explorers is Dictionary:
        for existing_id in GameState.explorers.keys():
            if not explorers.has(existing_id):
                StateMapper.remove_explorer(existing_id)
        for key in explorers.keys():
            StateMapper.apply_explorer_change(key, explorers[key])

    var players = state.get("players")
    if players is Dictionary:
        for key in players.keys():
            StateMapper.apply_player_change(key, players[key])

    var turn_state = state.get("turnState")
    if turn_state != null:
        StateMapper.apply_turn_change(turn_state)

    if not GameState.is_initialized:
        StateMapper.finalize_initialization()
```

No `Colyseus.Callbacks.of(room)`, no `on_add`/`on_remove`/`listen` calls
anywhere in the current implementation. `state.get("tiles")` /
`.get("explorers")` / `.get("players")` on the long-held `state` reference
DO stay correctly query-able and up to date on every call (confirmed via
`_log_state_counts`, which has shown correct, growing counts throughout this
project's whole testing history) — it's specifically the granular
per-field `listen()` callback that doesn't fire, not the underlying data.

**Trade-off:** this re-processes every tile/explorer/player on every delta
instead of reacting only to what changed. Cheap at this project's scale
(≤289 tiles, a handful of explorers/players) — revisit only if profiling
ever shows this mattering at a larger scale.

**If a future SDK release is believed to fix per-field `listen()` on
collection items:** re-verify against MANY sequential updates to the SAME
field before trusting it again, not just the first update — that's exactly
the gap that let this bug (and a related turnState one, Decision 063) go
unnoticed for multiple tasks.

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
