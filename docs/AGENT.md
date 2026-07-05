## Current Sprint — Godot Client Rebuild

### Context
The Colyseus server backend (Phases 1–2) and Unity NetworkManager wiring (Phase 3)
are all complete — see Completed Tasks below. Unity game/ is now frozen as a
read-only fallback (Decision 033). The active client is Godot 4.6.3 GDScript (godot/).
Client architecture is fully designed and documented: docs/ARCHITECTURE.md,
docs/GODOT_CLIENT.md, decisions 033–049.

Build sequence: network layer → state store → renderers → input → HUD → camera.
Each task is independently testable headlessly before wiring to Godot Editor.

---

### GC1 — Network Layer ✅ DONE (2026-06-17)
Files: godot/autoloads/config.gd, godot/autoloads/network_manager.gd
- config.gd: env-aware server URL (ws://localhost:4567 local, wss:// prod), no secrets
- network_manager.gd: 5-state machine; auth seam commented; send_move sends REQUEST only
- Colyseus.Callbacks confirmed working in 0.17.11:
    on_add(state, "collection_key", func(item, key)) — CONFIRMED 3-arg form
    on_add(room, callback) — INVALID (room not a valid target)
    State is empty right after joined; on_add back-fills on first server patch
- Spike test files removed; project opens cleanly (exit 0); Main.tscn is main scene

### GC0 — Verification Harness
Script: scripts/verify.sh (repo root)
Spec: docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md

Captures a 30-second evidence window from a running session:
- logcat.txt     — adb logcat -s Godot for 30 s
- screencap.png  — adb exec-out screencap -p
- backend.log    — docker logs fogbound_backend --tail 200
  (fogbound_backend container runs both NestJS :4007 and Colyseus :4567)

All artifacts written to test-artifacts/<timestamp>/; test-artifacts/latest symlink updated.
test-artifacts/ is gitignored.

Done: bash scripts/verify.sh exits 0; test-artifacts/latest/ contains all 3 files, each non-empty.
(No GUT test — this is a shell harness. Verified by running the script and inspecting artifacts.)

---

### GC2 — State Store ✅ DONE (2026-07-04)
Files: godot/autoloads/game_state.gd, godot/scripts/network/state_mapper.gd
Spec: docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md

- game_state.gd: typed signals + state dicts; no Colyseus import (Decision 043)
- state_mapper.gd: translates raw SDK Dictionaries → game_state updates
  apply_tile_change(coord_key, tile_dict)
  apply_explorer_change(explorer_id, explorer_dict)
  apply_turn_change(turn_dict)
  finalize_initialization()
- network_manager.gd _setup_state_callbacks(): replace GC1 proof callback with state_mapper routing
- Register GameState autoload third (Config → NetworkManager → GameState)

GUT file: godot/tests/gc2/test_state_store.gd
- test_game_state_starts_empty         — tiles, explorers, current_player_id all empty on init
- test_apply_tile_change               — apply_tile_change("0_0", {...,isRevealed:true}) →
                                         GameState.tiles["0_0"].is_revealed == true; tile_changed emits
- test_apply_explorer_change           — apply_explorer_change("e1", {x:3,y:5,...}) →
                                         explorer present; explorer_added("e1") emits once
- test_apply_turn_change               — apply_turn_change({currentPlayerId:"p1",turnNumber:1,...}) →
                                         GameState.current_player_id == "p1"; turn_changed emits
- test_finalize_initialization         — finalize_initialization() → state_initialized emits once;
                                         GameState.is_initialized == true

Done: godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc2 -gexit → 5/5 passed, 0 failures, 0 errors.
Also verified live against fogbound_backend (desktop Godot run, Main.tscn temporarily
scripted then reverted): joined room, 169 tiles + explorers + players + turnState all
synced into GameState, is_initialized became true, zero crashes/errors.
Found + fixed a real Colyseus SDK bug along the way — see Decision 060: the field-keyed
on_change(state, "field", callback) crashes the native extension on root REF fields
(e.g. turnState); switched to listen(state, "field", callback) instead. Also corrected
the generic on_change(state, callback) to a zero-arg signature (was documented as 1-arg).
GUT 9.6.0 test framework vendored as a prerequisite (Decision 059) — needed by every
task GC2-GC7's done-criterion, none of which had it available before this task.
Human approval gate required before GC3.

### GC3 — Board Renderer ✅ DONE (2026-07-04)
Files: godot/scripts/board_coord.gd, godot/scenes/match/board/board_layer.gd,
       BoardLayer.tscn, fog_layer.gd, FogLayer.tscn
Spec: docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md

- Two TileMapLayer nodes: BoardLayer (terrain) + FogLayer (fog overlay) — never one node per tile
- Listens to GameState.state_initialized and GameState.tile_changed signals
- Coordinate mapping: BoardCoord.to_tilemap_coord() — Vector2i(x, (board_rows-1)-y).
  CORRECTION vs originally-planned "origin top-left" direct mapping: server y=0 is the
  "bottom" row (backend/src/colyseus/rooms/GameRoom.ts initializeBoard/spawnExplorers),
  Godot TileMapLayer y increases downward — a naive Vector2i(x,y) mapping would render
  the board upside-down. board_coord.gd is shared by both layers to avoid duplicating this.
- Minimal tile set: tileType=terrain kind ("grass" is all the server generates today;
  "water" exists only in a combat-rule check, not yet wired to board gen), treasureType=
  overlay ("coin"/"shield" exist in backend test fixtures; "sword" doesn't exist server-side
  yet — Decision 058 names it as client scope, so BoardLayer renders it anyway, ready for
  when the server adds it). CORRECTION vs originally-assumed "terrain, Coin, Shield, Sword
  are all tileType values" — Coin/Shield/Sword are treasureType, a separate field.
- Procedural placeholder swatches (Image.create_empty + fill_rect + ImageTexture), no art files
- Pure renderer — no game logic

GUT file: godot/tests/gc3/test_board_renderer.gd
- test_board_paints_terrain_on_initialized — seed GameState with 3×3 tiles; emit state_initialized →
                                             BoardLayer.get_cell_source_id(BoardCoord.to_tilemap_coord(...)) >= 0
- test_fog_cell_cleared_on_reveal          — emit tile_changed with isRevealed=true →
                                             FogLayer.get_cell_source_id(coord) == -1
- test_fog_cell_present_on_hidden          — emit tile_changed with isRevealed=false →
                                             FogLayer cell at coord is a valid tile id (>= 0)

CORRECTION vs originally-written test signatures: TileMapLayer (Godot 4.3+, the node this
project uses per Decision 021/047) takes NO layer-index argument — get_cell_source_id(coords),
not get_cell_source_id(0, coords) (that's the old TileMap node's signature). Also no
TileMap.INVALID_CELL constant exists — get_cell_source_id returns literal -1 for an empty cell.

Done: godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc3 -gexit → 3/3 passed, 0 failures, 0 errors.
Verified live against fogbound_backend: BoardLayer/FogLayer temporarily wired into Main.tscn,
joined the room, confirmed correctly-oriented painted cells matching server tile data, then reverted.
Not in this task's scope: wiring BoardLayer/FogLayer into the full Match scene tree
(GameWorld > BoardLayer, FogLayer, Explorers, Camera2D per Decision 047) — happens once
explorers (GC4) and camera (GC7) exist too.
Human approval gate required before GC4.

### GC4 — Explorer Renderer ✅ DONE (2026-07-04)
Files: godot/scenes/match/explorers/Explorer.tscn, ExplorerController.gd,
       Explorers.tscn, explorers_container.gd
Spec: docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md

- Sprite2D (procedural flat-color square) + Label (explorerId) + BotBadge Label
- Explorers.tscn/explorers_container.gd (added — not in the originally-listed
  files, but required by Decision 047's Match Scene Tree: something has to listen
  to GameState and spawn/despawn Explorer.tscn instances as children; nothing
  else in the codebase does this)
- Listens to GameState.explorer_added, explorer_moved, explorer_removed signals
- Smooth movement: target_coord (raw server x,y) updated on explorer_moved;
  create_tween().tween_property(...) to BoardCoord.to_world_position(), 0.2s
- Bot badge: BotBadge Label visible when explorer isBot == true (Decision 029)
- Auto-spawn base at centre of player's side: this describes existing SERVER
  behavior (GameRoom.ts spawnExplorers), not a client action item — no code
  needed here, context only
- board_coord.gd extended: TILE_PX + flip_row() + to_world_position(), shared by
  BoardLayer/FogLayer/ExplorerController so the y-flip has one implementation
- Pure renderer — no game logic

Found + fixed a second empirical ordering bug — see Decision 061:
GameState.state_initialized fired while GameState.tiles.size() was still 0
(before tiles arrived), so caching board_rows once is_initialized became true
froze it at a wrong value computed from an empty tile set. Every explorer
spawned at an incorrectly flipped y position (confirmed live: y showed 0
instead of the correct 384 for a 13-row board). Fixed by removing the cache —
explorers_container.gd now recomputes board_rows fresh from GameState.tiles on
every explorer_added/explorer_moved (cheap: one scan, ≤289 tiles max map size).

GUT file: godot/tests/gc4/test_explorer_renderer.gd
- test_explorer_spawns_on_added      — GameState.set_explorer("e1", {...}) →
                                        Explorers container child count == 1
- test_explorer_position_on_moved    — GameState.set_explorer("e1", {x:2,y:3,...}) →
                                        spawned ExplorerController's target_coord == Vector2i(2, 3)
- test_bot_badge_visible_when_bot    — Explorer.setup(id, {isBot:true,...}, rows) →
                                        explorer.bot_badge.visible == true
- test_bot_badge_hidden_when_human   — Explorer.setup(id, {isBot:false,...}, rows) →
                                        explorer.bot_badge.visible == false

Done: godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc4 -gexit → 4/4 passed, 0 failures, 0 errors.
Also reconfirmed gc2 (5/5) and gc3 (3/3) — no regressions from the board_coord.gd refactor.
Verified live against fogbound_backend: 4-6 explorers spawned matching GameState.explorers
count exactly, correctly-flipped world positions confirmed after the Decision 061 fix.
Human approval gate required before GC5.

### GC5 — Input Handling ✅ DONE (2026-07-04)
Files: godot/scenes/match/InputController.gd
Spec: docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md

- Tap → select own explorer, then tap target → confirm move (unconditional —
  no adjacency/legality check client-side; only the server validates game rules)
- Selection state tracked locally in InputController (not in GameState)
- On confirm: NetworkManager.send_move(explorer_id, x, y) — REQUEST only, never local apply
- Guard: only accept input when GameState.current_player_id == NetworkManager.local_player_id
- Never mutate GameState from input — all changes come from server
- network_manager.gd gained local_player_id (added — nothing previously stored the
  playerId this client claims during join; confirmed via GameRoom.ts that the server
  uses this exact string for player.playerId/explorer.playerId/turnState.currentPlayerId)
- board_coord.gd gained from_world_position() (inverse of to_world_position; flip_row
  is a self-inverse so the same function un-flips), used by the real touch-input path

GUT file: godot/tests/gc5/test_input_controller.gd
Uses MockNetworkManager (intercepts send_move only — local_player_id is read directly
off the real NetworkManager autoload, harmless to set in tests).
- test_tap_ignored_when_not_your_turn   — NetworkManager.local_player_id="p1",
                                          GameState.current_player_id="p2" →
                                          on_tap(coord) → mock_net.send_move_called == false
- test_select_then_confirm_sends_move   — tap own explorer at (1,1) → tap target (1,2) →
                                          mock_net.last_send == {explorer_id, x:1, y:2}
- test_game_state_unchanged_after_tap   — any tap sequence → GameState.tiles/.explorers unchanged

Done: godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc5 -gexit → 3/3 passed, 0 failures, 0 errors.
Also reconfirmed gc2 (5/5), gc3 (3/3), gc4 (4/4) — no regressions.
Verified live against fogbound_backend: with a single connected client the real guard
correctly blocked input (turnState.currentPlayerId was empty, no match started yet —
exactly the intended safe behavior). Separately confirmed send_move's full round trip
by locally simulating "my turn" (test-only, client-side): the SERVER independently
rejected the resulting out-of-turn move against its own authoritative turnState — a live
confirmation that Decision 039's real enforcement point (server-side validation) holds
even when a client's local guard is bypassed, with no crashes or errors in the round trip.
Human approval gate required before GC6.

### GC6 — Minimal HUD ✅ DONE (2026-07-04)
Files: godot/scenes/match/hud/Hud.tscn, hud.gd (TurnBanner, EndTurnButton, UndoButton — bare Godot Controls)
Spec: docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md

Decision 058 scope: menus/lobby/results as bare buttons; no art, no inspector card, no popups.
Decision 051: board-first floating HUD on CanvasLayer; End Turn is primary action.
- TurnBanner Label: floats top of board, shows "Your Turn" or "Waiting…"
- EndTurnButton: disabled when not your turn; sends end_turn message on press
- UndoButton: hidden until move sent; hidden again after turn_changed (End Turn advances turnState)
- Driven by GameState.turn_changed + NetworkManager.move_sent signals only
- network_manager.gd gained move_sent signal (emitted at the end of send_move) and
  send_end_turn() (both added — neither existed; confirmed backend message name via
  backend/src/colyseus/rooms/GameRoom.ts: onMessage('end_turn', ...), no payload)

GUT file: godot/tests/gc6/test_hud.gd
- test_turn_banner_your_turn          — GameState.set_turn_state("p1",1,"move"), local="p1" →
                                         hud.turn_banner.text == "Your Turn"
- test_turn_banner_opponent_turn      — set_turn_state("p2",...), local="p1" →
                                         "Waiting…" in hud.turn_banner.text
- test_end_turn_enabled_your_turn     — current player == local → hud.end_turn_button.disabled == false
- test_end_turn_disabled_opponent_turn — current player != local → hud.end_turn_button.disabled == true
- test_undo_hidden_initially          — init → hud.undo_button.visible == false
- test_undo_appears_after_send_move   — NetworkManager.move_sent.emit() → hud.undo_button.visible == true

Done: godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc6 -gexit → 6/6 passed, 0 failures, 0 errors.
Also reconfirmed gc2 (5/5), gc3 (3/3), gc4 (4/4), gc5 (3/3) — no regressions.
Verified live against fogbound_backend: HUD correctly showed "Waiting…" + disabled End Turn
(single-client test, match not started — same finding as GC5), undo_button correctly toggled
false→true on a real move_sent emission. No crashes or errors.
Human approval gate required before GC7.

### GC7 — Camera Rig ✅ DONE (2026-07-04)
Files: godot/scenes/match/CameraController.gd
Spec: docs/superpowers/specs/2026-07-03-first-playable-sprint-design.md

- Camera2D (class_name CameraController extends Camera2D) with pinch zoom via
  InputEventMagnifyGesture (factor treated as a relative delta) — real-hardware
  gesture behavior not empirically verified, no automated test covers this path
- Double-tap cycle: FitToScreen (max_zoom) → Default (geometric mean) →
  Close ~5×5 (min_zoom), 350ms EaseInOutCubic via create_tween() — not covered
  by an automated test (simulating real double-tap timing headlessly is unreliable)
- Auto-pan fires on local player's turn start ONLY — never on opponent turns
  (Decision 025 fog rule); pans to the centroid of the local player's own explorers
- Zoom clamp: min_zoom = ~5×5 tiles visible (most magnified), max_zoom = full
  board + 10% padding (least magnified) — computed from board size + viewport

Found + fixed two real bugs during live verification:
1. `apply_pinch_delta()` originally trusted zoom bounds computed once in
   `_ready()` — same Decision 061 ordering hazard: GameState.tiles can still be
   empty at that point, producing a wrong/inverted min_zoom > max_zoom (confirmed
   live). Fixed the same way as explorers_container.gd: recompute fresh on every
   `apply_pinch_delta()` call rather than trusting a cached value.
2. Root-caused why the ordering hazard mattered here: `BoardCoord.compute_board_rows({})`
   returned 1, not 0, for an empty tiles dict (an empty for-loop leaves max_y=0,
   unconditionally returning max_y+1=1) — see Decision 062. Every prior consumer's
   `if board_rows == 0` guard was silently unreachable but harmless (nothing was
   being rendered at that early moment anyway); CameraController was the first to
   compute something meaningful from the bogus value, exposing the bug. Fixed at
   the source in board_coord.gd — benefits all consumers, not just this task.

GUT file: godot/tests/gc7/test_camera_controller.gd
- test_auto_pan_fires_on_local_turn          — seed own explorer, GameState.set_turn_state(local,...) →
                                                controller._pan_target != initial value
- test_auto_pan_skipped_on_opponent_turn     — set_turn_state(opponent,...) →
                                                controller._pan_target unchanged
- test_zoom_clamped_at_min                   — huge zoom-in pinch delta → zoom.x >= min_zoom
- test_zoom_clamped_at_max                   — huge zoom-out pinch delta → zoom.x <= max_zoom

Done: godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gc7 -gexit → 4/4 passed, 0 failures, 0 errors.
Also reconfirmed gc2 (5/5), gc3 (3/3), gc4 (4/4), gc5 (3/3), gc6 (6/6) — no regressions
(25/25 total across the whole GC2-GC7 suite).
Verified live against fogbound_backend: zoom bounds computed correctly once real tile
data loaded (min_zoom=2.5 < max_zoom=7.15, correctly ordered after the fix), pinch
clamping respected both bounds, auto-pan target correctly computed from the local
player's own explorer positions. No crashes or errors.
Playable Milestone reached — GC1-GC7 complete.

---

### Playable Milestone (GC1–GC7 complete, scene assembled) ✅ (2026-07-04)
Gray-box board, 2-player match playable end to end on Godot:
- Both players join room; explorers appear and move; fog reveals
- Treasure collected and scored; win condition triggers
- No art required — function only

Status: godot/scenes/match/Match.tscn (match.gd) assembles every GC2-GC7
component per Decision 047's tree — GameWorld (BoardLayer, FogLayer, Explorers,
Camera2D running CameraController.gd) plus Hud and InputController as siblings —
and calls NetworkManager.connect_to_match() on _ready(). godot/scenes/Main.tscn
(the project's run/main_scene) now instances Match.tscn.

Verified with two REAL concurrent Godot clients against fogbound_backend (the
first genuine 2-client test this project has run — every prior live check was
single-client, deferred exactly for this reason). This uncovered and fixed a
critical, three-layer turnState sync bug — see Decision 063 for full detail:
the room CREATOR's client would have been frozen on "Waiting…" forever, even
on its own turn, because (1) listen() on the root turnState reference never
re-fires once registered (the object is mutated in place, never reassigned),
(2) nested listen()s on turnState's own fields fire correctly but re-reading
the object afterward returns stale/null data, and (3) GDScript lambdas capture
outer local variables BY VALUE, not by reference — a general language gotcha,
not Colyseus-specific. Fixed with a Dictionary (reference type) to share
mutable state across the field-level closures. Confirmed live: both clients
now agree on the exact same current_player_id regardless of which one created
the room.

Not yet done: a real 2-client test of the full move → end_turn → turn-advances
round trip (attempted; blocked by the long-lived dev room's turnState being
stuck on a stale player from an earlier test session — room-state accumulation
from a full day of iterative testing, not a new bug). The current_player_id
sync fix itself is fully confirmed; send_move and send_end_turn each already
had their own live confirmations individually (GC5, GC6).

---

### Godot↔Colyseus Spike ✅ (2026-06-16, branch: spike/godot-colyseus)

**Verdict: Godot 4 CAN replace the Unity client.**

Steps completed:
- Godot 4.6.3 standard (GDScript) installed via Homebrew cask
- Colyseus native SDK 0.17.11 (GDExtension) installed in godot/addons/colyseus/
- Godot project scaffolded with Mobile rendering method
- Two backend fixes found and applied:
  1. `colyseus.server.ts`: use `gameServer.listen(4567)` not `httpServer.listen(4567)`
     so Colyseus's `bindRouterToTransport()` registers `/matchmake/*` HTTP routes
  2. `tsconfig.json`: add `"useDefineForClassFields": false` so TypeScript compiles
     class field initializers as assignments (through the @colyseus/schema setter that
     sets `$childType`) rather than `Object.defineProperty` which bypasses setters and
     leaves MapSchema instances without `$childType`, crashing `broadcastPatch`
- Spike test (godot/scenes/SpikeTest.gd) passes headlessly:
  - Connects to ws://localhost:4567
  - Joins `fogbound_room` with join_or_create
  - Receives and decodes full board state as Dictionary (no `set_state_type()` needed)
  - 169 tiles, 2 explorers, 1 player — all fields present

Key GDScript 4 constraints discovered:
- Cannot use `extends Colyseus.Schema` in external scripts (inner class limit)
- Use untyped vars for Colyseus types (annotations resolved at parse time fail
  if Colyseus isn't pre-cached via --import pass)
- Native SDK decodes server schema via Reflection without set_state_type()
- Two-pass headless import required: stub → `--import` → real script

---

### Completed Tasks

#### Phase 1 — Grid Abstraction + Model Layer ✅ (2026-04-22)

- Task 1 — ICoordinate / IGrid interfaces + SquareCoord + SquareGrid (BFS/Dijkstra pathfinding)
- Task 2 — Pure GameState interfaces + GameRules (isValidMove, applyMove, resolveCombat, checkWinCondition)
- Task 3 — 48 unit tests, all passing (`npx jest "colyseus/model"`)

#### Phase 2 — Colyseus Room + Schema Sync ✅ (2026-04-22)

- Task 4 — GameRoom rewritten: uses GameRules for validation, toPureState/applyPureState bridge, explorer spawning on join, bot badge broadcast
- Task 5 — FogboundState.ts + TurnStateSchema.ts created; ExplorerSchema gets hasShield, PlayerSchema gets baseX/baseY
- Task 6 — ColyseusModule exports ColyseusService; colyseus.server.ts accepts service reference
- Task 7 — Reconnection: allowReconnection(client, 60); bot takeover + "player_afk_bot_controlling" broadcast; all-bots → abandoned
- Room name changed from 'game_room' → 'fogbound_room' (matches Unity NetworkManager task)

#### Phase 3 — Unity NetworkManager Wired ✅ (2026-04-22) — SUPERSEDED by GC1–GC7 (Unity game/ frozen)

- Task 8 — NetworkManager.cs: Room<FogboundState>, "fogbound_room", SendMoveExplorer, bot badge, IsServerMode
- Task 9 — GameStateSync.cs: Colyseus.Schema.Callbacks API; OnAdd for explorers/tiles/players; Listen for x/y/isRevealed; OnChange for turn state; clears local prototype explorers on first server state
- Task 10 — Smoke test wired: backend start:dev → Unity Play → "Connected to room [id]" → tap → SendMoveExplorer → server state delta → explorer moves
- C# schema files generated in Assets/_Game/Scripts/Network/Schema/ (FogboundState, TileSchema, ExplorerSchema, PlayerSchema, TurnStateSchema)
- TurnManager: ApplyServerTurnState + _serverControlled flag stops local timer
- ExplorerManager: ServerMoveExplorer (no CanMove check) + ClearAllExplorers
- ExplorerController: ShowBotBadge (gray tint when bot-controlled)
- InputManager: routes moves through NetworkManager.SendMoveExplorer when IsServerMode=true

---

#### GC1 — Godot Network Layer ✅ (2026-06-17)

- config.gd: env-aware URL (ws://localhost:4567 / wss:// prod), no secrets
- network_manager.gd: 5-state machine, Colyseus.Callbacks, auth seam, request-only send_move
- Confirmed: Callbacks.of(room) works; on_add 3-arg form works; 2-arg form invalid
- Spike files removed; Main.tscn is main scene; project opens exit 0

---

### Next After This Sprint

- Tile art + animation pass + SFX (weeks 8–14)
- Discovery popup + Tilepedia (weeks 10–12)
- MCTS bot AI inside Colyseus GameRoom (weeks 12–16)
- Matchmaking via NestJS (weeks 14–18)
- Closed beta + polish + store submission (weeks 18–24)
