# First Playable Sprint Design
Date: 2026-07-03
Decision ref: 058

## Scope

Gray-box, 2-player match playable end to end on Godot client. Function only, no art.
Build sequence: GC0 (harness) → GC2 (state store) → GC3 (board) → GC4 (explorers) →
GC5 (input) → GC6 (HUD) → GC7 (camera).

## Scope cuts (Decision 058 — parked, not cancelled)

- Base placement UI → auto-spawn at centre of player's side (Decision 056 fallback)
- Tile set → terrain + Coins + Shield + Sword only
- Explorer inspection card (055), discovery popups, Tilepedia, onboarding
- Menus/lobby/results as bare buttons only
- Async mode, matchmaking (use join_or_create), auth (Decision 046), push notifications
- All art / audio / animation / juice

## GC0 — Verification Harness

Script: `scripts/verify.sh`

Captures a 30-second window of evidence from a live 2-device (or 2-emulator) session:

| Artifact | Source |
|---|---|
| `logcat.txt` | `adb logcat -s Godot` for 30 s |
| `screencap.png` | `adb exec-out screencap -p` |
| `backend.log` | `docker logs fogbound_backend --tail 200` |

All files written to `test-artifacts/<timestamp>/`; `test-artifacts/latest` symlink updated.
(NestJS port 4007 and Colyseus port 4567 run in the same `fogbound_backend` container.)

Done: `bash scripts/verify.sh` exits 0; all 3 files present and non-empty.

## GC2 — State Store

Files: `godot/autoloads/game_state.gd`, `godot/scripts/network/state_mapper.gd`
GUT: `godot/tests/gc2/test_state_store.gd`

| Test | Assertion |
|---|---|
| `test_game_state_starts_empty` | tiles, explorers, current_player_id all empty on init |
| `test_apply_tile_change` | `apply_tile_change("0_0", {...,isRevealed:true,tileType:"terrain"})` → `GameState.tiles["0_0"].is_revealed == true`; `tile_changed` emits |
| `test_apply_explorer_change` | `apply_explorer_change("e1", {x:3,y:5,...})` → explorer present; `explorer_added` emits once |
| `test_apply_turn_change` | `apply_turn_change({currentPlayerId:"p1",turnNumber:1,...})` → `GameState.current_player_id == "p1"`; `turn_changed` emits |
| `test_finalize_initialization` | `finalize_initialization()` → `state_initialized` emits once; `GameState.is_initialized == true` |

Done: `godot4 --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc2 -gexit` → 0 failures, 0 errors.

## GC3 — Board Renderer

Files: `godot/scenes/match/board/BoardLayer.tscn`, `FogLayer.tscn`
GUT: `godot/tests/gc3/test_board_renderer.gd`

| Test | Assertion |
|---|---|
| `test_board_paints_terrain_on_initialized` | Seed GameState with 3×3 tiles; emit `state_initialized` → `BoardLayer.get_cell_source_id(0, Vector2i(0,0)) >= 0` |
| `test_fog_cell_cleared_on_reveal` | Emit `tile_changed` with `isRevealed=true` → `FogLayer.get_cell_source_id(0, coord) == TileMap.INVALID_CELL` |
| `test_fog_cell_present_on_hidden` | Emit `tile_changed` with `isRevealed=false` → FogLayer cell at coord is a valid tile id |

Done: `godot4 --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc3 -gexit` → 0 failures, 0 errors.

## GC4 — Explorer Renderer

Files: `godot/scenes/match/explorers/Explorer.tscn`, `ExplorerController.gd`
GUT: `godot/tests/gc4/test_explorer_renderer.gd`

| Test | Assertion |
|---|---|
| `test_explorer_spawns_on_added` | Emit `explorer_added("e1")` → `$Explorers.get_child_count() == 1` |
| `test_explorer_position_on_moved` | Emit `explorer_moved("e1", 2, 3)` → Explorer node's `target_coord == Vector2i(2, 3)` |
| `test_bot_badge_visible_when_bot` | Explorer with `isBot=true` → `$BotBadge.visible == true` |
| `test_bot_badge_hidden_when_human` | Explorer with `isBot=false` → `$BotBadge.visible == false` |

Done: `godot4 --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc4 -gexit` → 0 failures, 0 errors.

## GC5 — Input

Files: `godot/scenes/match/InputController.gd`
GUT: `godot/tests/gc5/test_input_controller.gd`
Mock: `MockNetworkManager` — records `send_move` calls, never mutates GameState.

| Test | Assertion |
|---|---|
| `test_tap_ignored_when_not_your_turn` | `GameState.current_player_id="p2"`, local=`"p1"` → `on_tap(coord)` → `mock_net.send_move_called == false` |
| `test_select_then_confirm_sends_move` | Tap explorer at (1,1) → tap valid target (1,2) → `mock_net.last_send == {explorer_id, x:1, y:2}` |
| `test_game_state_unchanged_after_tap` | Any tap sequence → `GameState.tiles` and `.explorers` references unchanged |

Done: `godot4 --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc5 -gexit` → 0 failures, 0 errors.

## GC6 — Minimal HUD

Files: `godot/scenes/match/hud/` (TurnBanner Label, EndTurnButton, UndoButton — bare Godot controls, no art)
GUT: `godot/tests/gc6/test_hud.gd`

| Test | Assertion |
|---|---|
| `test_turn_banner_your_turn` | `current_player_id = local_id`; emit `turn_changed` → `$TurnBanner.text == "Your Turn"` |
| `test_turn_banner_opponent_turn` | Emit `turn_changed` with opponent id → text contains `"Waiting…"` |
| `test_end_turn_enabled_your_turn` | current player == local → `$EndTurnButton.disabled == false` |
| `test_end_turn_disabled_opponent_turn` | current player != local → `$EndTurnButton.disabled == true` |
| `test_undo_hidden_initially` | Init → `$UndoButton.visible == false` |
| `test_undo_appears_after_send_move` | `NetworkManager.move_sent` emits → `$UndoButton.visible == true` |

Done: `godot4 --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc6 -gexit` → 0 failures, 0 errors.

## GC7 — Camera Rig

Files: `godot/scenes/match/CameraController.gd`
GUT: `godot/tests/gc7/test_camera_controller.gd`

| Test | Assertion |
|---|---|
| `test_auto_pan_fires_on_local_turn` | Emit `turn_changed` with local player id → `CameraController._pan_target != initial_position` |
| `test_auto_pan_skipped_on_opponent_turn` | Emit `turn_changed` with opponent id → `CameraController._pan_target` unchanged |
| `test_zoom_clamped_at_min` | Simulate pinch beyond min → `camera.zoom.x >= min_zoom` |
| `test_zoom_clamped_at_max` | Simulate pinch beyond max → `camera.zoom.x <= max_zoom` |

Done: `godot4 --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc7 -gexit` → 0 failures, 0 errors.

## Human approval gates

One gate between each task: "what changed + test results" review before starting the next.
GC2 → GC3 → GC4 → GC5 → GC6 → GC7 — six gates total.
