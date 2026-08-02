## Code comments

Docs are the single source of truth. Write minimal code comments: explain
*why* only where non-obvious; never restate *what* the code does or
duplicate info already in DECISIONS.md / GDD.md / ARCHITECTURE.md. When
code and docs disagree, docs win and the code is fixed. Before any
architectural change, consult DECISIONS.md and draft a new numbered entry
for approval before writing files.

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

### Playable Milestone (GC1–GC7 complete, scene assembled) ✅ (2026-07-05)
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
mutable state across the field-level closures.

Full move → end_turn → turn-advances round trip confirmed live with a
freshly-restarted backend and two real concurrent clients: 5 complete turn
cycles back and forth between both players in ~12 seconds, with backend-side
diagnostic logging (added temporarily, then removed — see Decision 065)
confirming every `advanceTurn()` call and client-observed `current_player_id`
matched in exact lockstep, in the correct order, every time. An initial
re-test also surfaced what looked like a P0 flip-flopping bug (Decision 064)
— investigated and retracted (Decision 065): it was real, legitimate rapid
turn-cycling caused by the test script reacting to "my turn" with zero
pacing, not a defect. No known open issues remain in the GC1-GC7 client.

---

### AI Opponent + Treasure/Win Condition + Critical Sync Fix ✅ DONE (2026-07-06)

Context: after the Playable Milestone, the user asked for a plain-language
status check on what a genuinely "finished" first version still needs, then
chose **AI opponent first** (over menus/matchmaking or more tile content)
and **placeholder assets for now** (over waiting on art). This task covers
the AI opponent plus two prerequisites it exposed as missing: the server
spawned zero treasure and never checked the win condition, so there was
nothing to actually play for and no way for a match to end.

Files:
- backend/src/colyseus/model/BoardSetup.ts (new) — pure, seedable
  `placeTreasure(rows, cols, rng)`: coins (12%, value 1-3) and shields (3%),
  never on the start rows (y=0 / y=rows-1, per GDD)
- backend/src/colyseus/model/BotAI.ts (new) — `chooseBotAction(state, playerId, rng)`:
  root-level UCB1 Monte Carlo over the small per-turn action set (one
  explorer move or pass, Decision 054), self-play rollout with a fast
  heuristic policy, per-ply discounted cumulative reward
- backend/src/colyseus/model/BoardSetup.spec.ts, BotAI.spec.ts (new)
- backend/src/colyseus/rooms/GameRoom.ts (edited) — initializeBoard() calls
  placeTreasure(); new checkForWinner() calls checkWinCondition() and
  broadcasts match_ended; new addPlayer() helper shared by real joins and a
  new vsBot join option (`options.vsBot: true` + only 1 human → spawns a
  synthetic bot player, starts immediately); new shared playAutoTurn()
  used by both bot-turn advancement and turn-timer-expiry auto-move
  (GDD: "auto-selects the safest legal move")
- backend/src/colyseus/schemas/FogboundState.ts (edited) — added `winnerId`
- godot/autoloads/network_manager.gd (edited) — see sync fix below; also
  default join options now include `vsBot: true` (temporary — remove once
  a real menu/matchmaking choice exists)
- godot/scripts/network/state_mapper.gd (edited) — dead code from the
  investigation removed; original apply_*_change functions unchanged,
  now always called with freshly-read data (safe, see below)

**Bot AI design note:** an early version passed 3/5 tests but failed to
prefer grabbing an adjacent coin or attacking an undefended treasure-carrier
*immediately* over doing it a turn or two later — with a long, flat-reward
rollout horizon the bot was provably indifferent to timing. Fixed by
discounting rollout reward per ply (`PER_PLY_DISCOUNT = 0.9`) so earlier
value capture always scores higher than later capture of the same value.
This is a real design improvement, not a test-passing hack — verified
stable across 5 repeated test runs.

**Critical bug found and fixed (bigger than the AI feature itself):**
live-testing the bot exposed that the Godot client's GameState froze at its
initial snapshot — explorer positions, turn number, everything — even
though the backend was genuinely moving pieces every turn (confirmed via
temporary backend-side logging). Root cause, confirmed with a temporary
debug print inside a `listen()` callback: **per-field `listen()` registered
on a MapSchema collection item (tile/explorer/player, obtained via
`on_add`) never fires again after its initial registration** in Colyseus
GDScript SDK 0.17.11 — zero firings recorded across ten real server-side
moves. This directly contradicts Decision 063's claim that collection items
are more reliable than root REF fields; that claim was only ever tested
against a single update. Fixed by abandoning `Colyseus.Callbacks`
(`on_add`/`on_remove`/`listen`) entirely — `network_manager.gd` now just
re-syncs the ENTIRE state fresh on every `room.state_changed` signal (the
one mechanism proven reliable all project long). See Decision 069,
docs/ARCHITECTURE.md, docs/GODOT_CLIENT.md for full detail.

Tests: `cd backend && npx jest` → 58/58 passed (5 suites, all backend model
+ room tests, including the new BoardSetup.spec.ts and BotAI.spec.ts).
`godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gcN -gexit`
for N=2..7 → 25/25 passed, 0 failures, 0 errors (no regressions from the
sync redesign — gc2's apply_*_change tests still cover state_mapper.gd
directly).

Done: verified live against a rebuilt fogbound_backend container with a
real two-turn-cycle-plus bot match: treasure tiles visibly present on
join, a solo client joined with vsBot and played against a bot opponent,
turn number advanced 1→15 and explorer positions/coin counts updated in
lockstep with real backend state on every turn, no crashes or errors.

Documentation: updated docs/DECISIONS.md (added entries 066-069: treasure
spawn + win condition wiring, bot AI architecture, vsBot join option, and
the state-sync redesign that corrects Decision 063); updated
docs/ARCHITECTURE.md (new "State Observation: full re-sync on
state_changed" section + Known Beta-SDK Risks table updated); updated
docs/GODOT_CLIENT.md (replaced the obsolete Decision 044 Callbacks-pattern
section with the current state_changed-based approach, since the old code
example would mislead a future reader into reimplementing the broken
pattern).

---

### Game Flow: Menus + Results + Matchmaking Isolation + Turn Limit ✅ DONE (2026-07-06)

Context: with the AI opponent done, the keystone gap to a genuinely "finished,
playable" v1 was the game-flow layer — the app hard-launched into a solo bot
match with no menu, no way to choose an opponent, no results screen (the
server's match_ended broadcast was invisible), and no Play Again. Also found
and fixed along the way: matches could never end, and a Play-Again reconnect
leaked stale players.

Files (client):
- godot/scenes/menu/MainMenu.tscn + main_menu.gd (new) — run/main_scene; bare
  Play vs Bot / Play vs Player / Quit (Decision 058 gray-box)
- godot/scenes/match/results/Results.tscn + results.gd (new) — win/lose +
  final scores overlay on GameState.match_ended; Play Again / Main Menu
- godot/autoloads/game_flow.gd (new, 4th autoload) — scene transitions +
  carries selected mode across change_scene_to_file
- godot/autoloads/network_manager.gd — create vs join_or_create by mode;
  dropped the hardcoded vsBot default; GameState.reset() on connect; routes
  match_ended → StateMapper → GameState; full room-signal teardown + client
  null on disconnect; null-guard on late state_changed
- godot/autoloads/game_state.gd — reset(); end_match() already present
- godot/scripts/network/state_mapper.gd — apply_match_ended (bridge)
- godot/scenes/match/Match.tscn + match.gd — Results wired in; connect via
  GameFlow.join_options()
- godot/scenes/Main.tscn (deleted — orphaned wrapper)

Files (server):
- backend/src/colyseus/rooms/GameRoom.ts — maxClients=2 + lock() on solo bot;
  DEFAULT_MAX_TURNS=300 + maxTurns from options; toPureState passes maxTurns
- backend/src/colyseus/model/GameRules.ts — turn-limit branch in
  checkWinCondition (score leader wins), scoreLeader helper
- backend/src/colyseus/model/GameState.ts — maxTurns? on pure GameState
- backend/src/colyseus/schemas/FogboundState.ts — maxTurns field

Two real bugs found and fixed during live verification (Decisions 071-073):
1. Play-Again reconnect merged the OLD room's players into the new match (4
   players not 2) — two causes: disconnect only nulled _room (old room signals
   stayed live) AND the reset was routed through a StateMapper static helper
   that silently no-ops in this Godot build (its body never ran; sibling
   statics run fine — Decision 072). Fixed with full signal teardown +
   client null, and by calling GameState.reset() directly.
2. An all_treasure match could never end — sparse fog + few explorers leave
   scattered treasure uncollected forever (3/5 still on board after 154
   auto-played turns). Implemented the GDD's "time limit runs out" win
   condition as a turn cap (maxTurns), which also guarantees termination
   (Decision 073).

Tests: `cd backend && npx jest` → 61/61 (58 + 3 new turn-limit tests in
GameRules.spec). `godot --headless -s addons/gut/gut_cmdln.gd -gdir=res://tests/gcN`
for N=2..8 → 33/33 (new tests/gc8/test_game_flow.gd: 8 — reset, match_ended
bridge, Results.outcome_text/format_scores, GameFlow.join_options).

Live-verified against a rebuilt fogbound_backend with a headless 3-phase
harness (written, run, deleted — never committed): (1) vs Bot uses create() →
fresh room with 1 human + 1 bot + treasure, 49 tiles for 7×7; (2) Play Again
disconnect+reconnect → GameState reset to exactly 2 fresh players (no leak),
new player id; (3) a real solo match auto-played by the server to a genuine
turn-limit win → match_ended delivered end to end → correct You Win!/You Lose
+ 2-player scores. err=0, no crashes.

NOT done here (still gray-box, no visual verification possible headlessly):
the actual look/feel of the menu and results screens on a device — needs a
human eye. Everything else in the flow is logic-verified.

Documentation: updated docs/DECISIONS.md (070 flow layer, 071 room
lifecycle/matchmaking isolation, 072 match_ended bridge + reset + the Godot
static no-op, 073 turn-limit win condition); docs/GDD.md (Win Conditions —
turn-limit implemented, all_treasure implemented, score_target rule-only);
docs/ARCHITECTURE.md (Flow layer row, Scene Flow section, static-no-op risk
row); docs/GODOT_CLIENT.md (folder structure, 4th autoload, Game Flow section).

---

### Tile Data Registry Refactor ✅ DONE (2026-07-08)

Context: first execution of Decision 081 — tiles move from hardcoded
per-tile string checks to a data-driven registry, so themes and a future
map editor won't need rules-engine changes per tile. Pure refactor: all 61
pre-existing Jest tests required to pass unmodified, behavior bit-for-bit
identical. Planned via full Plan Mode (Explore agent completeness sweep +
Plan agent design critique) before any file was touched, per the task's
explicit "stop after Plan Mode for approval" instruction.

Files:
- backend/src/colyseus/model/TileRegistry.ts (new) — discriminated-union
  `TileDefinition` (mirrors `BotAction`'s existing pattern), 6 entries:
  grass/water (terrain), coin (treasure), shield (combat_item, migrated
  unchanged from `SHIELD_CHANCE`), bag (special), boat (movement). Only
  coin/shield have nonzero spawnWeight; water/bag/boat are catalog-only
  (Decision 082) so `GameRules` has zero remaining hardcoded tile-id checks,
  not just 3 of 4.
- backend/src/colyseus/model/BoardSetup.ts — `placeTreasure` now walks
  `getSpawnableTreasureTiles()` as a cumulative-probability table instead of
  two hardcoded `if`s; preserves the EXACT rng-call sequence per tile (one
  roll; a second call only for `treasure_value` entries) so all 5 existing
  `BoardSetup.spec.ts` tests pass completely unmodified.
- backend/src/colyseus/model/GameRules.ts — `isValidMove`'s water check and
  `applyMove`'s bag/shield/boat equip-granting now read the registry instead
  of comparing literal strings.
- backend/src/colyseus/model/BotAI.ts — heuristic checks tile `category`
  (`'treasure'` or `'combat_item'`) instead of a raw non-empty-string check;
  must include `'treasure'` for a subtle pre-existing reason (a fully-drained
  coin tile keeps `treasureType:'coin'` forever, never reset — that state
  already reached this branch before the refactor too), documented inline.

Tests: backend/src/colyseus/model/TileRegistry.spec.ts (new, 5 tests —
lookup, unknown-id, spawn order, and a direct assert that migrated
spawnWeights equal the original 0.12/0.03 constants). One new test added to
GameRules.spec.ts (shield pickup → hasShield; this path had zero coverage
before). `BoardSetup.spec.ts` and `BotAI.spec.ts` — confirmed byte-for-byte
unmodified via `git diff --quiet`, both still passing, which is the direct
proof the refactor didn't change observable behavior.

Done: `npx tsc --noEmit` clean; `npx jest` → 67/67 passed, 6 suites (61
original + 6 new — 5 registry + 1 shield-pickup), original per-file test
counts confirmed unchanged (BoardSetup.spec.ts and BotAI.spec.ts still
exactly 5 each).

Documentation: updated docs/DECISIONS.md (082 — water/bag/boat catalog-only
inclusion, drafted and approved during Plan Mode before implementation);
docs/TILES.md (status flipped from "target design" to "implemented,"
category-vocabulary note added distinguishing the registry's 6 engine
categories from GDD's 7 design categories, "what's left" section added:
Postgres seeding and the other 44 GDD tiles are not yet done).

Known follow-up, not addressed here (client explicitly out of scope): the
Godot client's tile-art swatch list (`board_layer.gd`) is already out of
sync with the server tile vocabulary (has a `"sword"` swatch nothing sends;
no swatch for `"bag"`/`"boat"`) — harmless while those stay at
`spawnWeight: 0`, but the first task that makes either spawnable needs a
companion client fix or it'll render invisibly.

---

### Arrow, Cannon, and Trap Tiles ✅ DONE (2026-07-12)

Context: First wave of data-driven tile content after the registry refactor
(Decisions 081/082). Added three signature tile types for playtesting — all
gray-box (colored swatch + text label, no art files).

Files:
- backend/src/colyseus/model/TileRegistry.ts — extended TileEffect union with
  `arrow_push`, `cannon_launch`, `immobilize`; added 9 new tile definitions
  (arrow_north/south/east/west, cannon_north/south/east/west, trap); exported
  `directionDelta`
- backend/src/colyseus/model/GameState.ts — added `immobilizedUntilTurn: number`
  to ExplorerState
- backend/src/colyseus/model/GameRules.ts — `isValidMove` blocks immobilized
  explorers; `applyMove` handles arrow push (1 step), cannon launch (scan to
  last walkable tile), trap (set immobilizedUntilTurn = turnNumber + playerCount)
- backend/src/colyseus/model/BotAI.ts — trap gets -4 heuristic penalty;
  arrow/cannon compute effective landing position for base-distance scoring
- godot/scenes/match/board/board_layer.gd — arrow/cannon/trap swatches (gray)
  + text labels via `_draw()`; GUT tests added in `godot/tests/gc9/`

Design decisions (Decision 086 for full rationale):
- Four registry IDs per directional tile (arrow_north etc.) keeps TileSchema
  unchanged; treasureType = tile id is the existing pattern
- `immobilizedUntilTurn` threshold rather than decrement counter avoids
  advanceTurn firing on the same handler call as applyMove (would drain the
  counter to 0 before the trap affected any turn)

Spawn weights: arrow 0.04 total (0.01 each direction), cannon 0.03 total
(0.0075 each direction), trap 0.04. Combined with coin (0.12) + shield (0.03):
~26% of interior tiles carry content on a 13×13 board.

Tests: all Jest tests pass; GUT tests in godot/tests/gc9/ pass; TypeScript clean.
Verification gate: 2-device in-person playtest still outstanding per project
memory (automated coverage confirmed; real playtest is the final done-gate).

Documentation: updated docs/DECISIONS.md (Decision 086); updated docs/TILES.md
(new rows, updated TileEffect union, updated What's left); updated docs/AGENT.md
(this entry + next sprint tasks below).

---

### Android APK Build + Board Rendering Fix + 2-Device Playtest ✅ DONE (2026-07-20)

Context: After GC1-GC7 and the arrow/cannon/trap tile work, the game had never
been verified on real Android hardware or emulators with two concurrent clients.
Both emulators showed blank black screens. This sprint fixed the root cause,
established a working APK build pipeline, and completed the 2-device playtest.

**Board rendering root cause (Decisions 087/088):**
The Colyseus server sends an initial partial state delta — the second device to
join a room receives fewer tiles than the full board (e.g. 67 of 169). 
`BoardCoord.compute_board_rows(67 tiles)` returns ~8, not 13. All tiles were
placed at wrong TileMapLayer coordinates, producing a blank board that never
corrected. Fixed with `_validated_board_rows()` in both `BoardLayer` and
`FogLayer`: returns the row-count only when `tiles.size() == rows * rows`
(complete square). Both layers defer all painting until the full board arrives,
then repaint all tiles at once.

Camera pan clamping: at max_zoom the 13×13 board is smaller than the emulator
viewport. Added `_clamp_to_board()` — when `half_view >= board_size * 0.5`,
the board fits in the viewport, so force-centre rather than clamp.

**APK build pipeline:**
- `use_gradle_build=false` (template export) avoids recursive Gradle asset nesting
  that produced 319 gdextension copies across multiple builds
- Godot headless export always produces 0-byte Colyseus `.so` — must inject the
  real 31MB library from a known-good APK built with the correct keystore
- Android R+ requires all `.so` files stored uncompressed (`zip -0`) and
  4-byte aligned (`zipalign -f 4`)
- Signed with `~/Library/Application Support/Godot/keystores/debug.keystore`,
  alias=androiddebugkey, password=android

**Backend Docker discovery:**
The NestJS + Colyseus backend runs in the `fogbound_backend` Docker container
(via OrbStack / `docker/docker-compose.yml`), not as a bare Node process.
Use `docker restart fogbound_backend` to clear all Colyseus in-memory rooms
between test sessions, not `pkill` on Node.

**2-device playtest results (verified 2026-07-20):**
- emulator-5554 (player_9915): joined fresh room, "Your Turn", explorers on
  top row, board rendered correctly (13×13, black fog, green starting rows)
- emulator-5556 (player_6018): joined same room, "Waiting…", explorers on
  bottom row, partial state handled correctly by `_validated_board_rows()`
- "End Turn" on 5554: 5554 → "Waiting…", 5556 → "Your Turn" — turn passing confirmed
- 2 players, 4 explorers, correct HUD on both devices

Files changed: `godot/scenes/match/board/board_layer.gd`,
`godot/scenes/match/board/fog_layer.gd`,
`godot/scenes/match/CameraController.gd`,
`godot/export_presets.cfg`

Documentation: updated docs/DECISIONS.md (added entries 087 — validated_board_rows
guard, 088 — camera pan clamping); updated docs/AGENT.md (this entry).

---

### Portrait Lock + HUD Safe-Area + Exit Button ✅ DONE (2026-07-21)

Context: project.godot had no `[display]` section, so Android defaulted to
landscape — the End Turn button rendered off-screen on both emulators. The HUD
also had no safe-area margins and no way to leave a match mid-game.

Files changed:
- `godot/project.godot` — added `[display]` section: `window/handheld/orientation=1`
  (portrait), viewport 720×1280, `canvas_items` stretch, `keep` aspect
- `godot/scenes/match/hud/Hud.tscn` — adjusted offsets for 80px top / 100px bottom
  / 40px side safe-areas; added ExitButton (top-right, 100×48px)
- `godot/scenes/match/hud/hud.gd` — added `exit_button` @onready +
  `_on_exit_pressed()` → `GameFlow.to_main_menu()`
- `godot/tests/gc6/test_hud.gd` — 3 new tests (exit_button exists, visible,
  wired to leave-match handler); all 9 tests pass
- `docs/DECISIONS.md` — added entry 089

Documentation: updated docs/DECISIONS.md (added entry 089 — portrait lock,
HUD safe-area, exit button); updated docs/AGENT.md (this entry).

APK rebuild + emulator visual verification: ✅ DONE (2026-07-21, follow-up session)

**Board was still gray after portrait commit** — separate blocker found and fixed:
`android.permission.INTERNET` was missing from both export presets (empty
`custom_permissions=PackedStringArray()`). Android's iptables drops all TCP packets
from apps without the permission; `nc` from the emulator shell is exempt (shell uid).
C++ SDK returned `UnexpectedConnectFailure` code=0 in ~15ms with zero Docker traffic.

Fix: added `android.permission.INTERNET` to both export presets in
`godot/export_presets.cfg`; re-exported headlessly; applied fix_apk.py (deduplicates
Colyseus .so files, strips Gradle intermediate entries, forces ZIP_STORED); signed
with debug.keystore; installed on emulator-5554. Board now renders: green starting
rows, black fog, 4 explorers. Connection confirmed in logcat and Docker logs.

See Decision 090. Committed as `fix(godot): add android.permission.INTERNET to export presets`.

---

### Interaction Friction Sprint ✅ DONE (2026-07-22)

Context: fun-gate v1 on two emulators revealed five blockers before a clean
playtest was possible: unreliable tapping, phantom undo appearances, no drag-pan
when zoomed, bot-takeover timer firing during client load, and no structured
action log to explain repeated server rejections.

Fixes shipped:

1. **TAP RELIABILITY** (`godot/scripts/board_coord.gd`) — Changed `round()` →
   `int()` in `from_world_position`. `round(3.5)=4` mapped the right half of every
   32px tile to the adjacent cell; `int()` maps the full cell correctly.
   Regression test: `gc10/test_interaction_friction.gd`.

2. **PHANTOM UNDO** (`godot/scenes/match/input_controller.gd` +
   `godot/scenes/match/hud/hud.gd`) — InputController now deselects (instead of
   sending a move) when the tap target equals the explorer's current position.
   hud.gd subscribes to `NetworkManager.server_message` and hides undo_button on
   any `type=error` response. Two-layer defense; neither alone is sufficient.

3. **DRAG-PAN WHILE ZOOMED** (`godot/scenes/match/CameraController.gd`) — Added
   `InputEventScreenDrag` handler to `_input()`. Delta divided by `zoom.x` so
   1 finger-pixel = 1 world-unit at any zoom. Clamps immediately via
   `_clamp_to_board()`. GUT test matrix (6 cases) in `gc10`.

4. **BOT-TAKEOVER GRACE** (`backend/src/colyseus/GameRoom.ts` +
   `godot/autoloads/network_manager.gd`) — Added `readyPlayers: Set<string>`;
   `startTurnTimer()` returns early unless player is a bot or in readyPlayers.
   Client sends `player_ready` once after `finalize_initialization()`, gated by
   `_ready_sent` bool, reset in `disconnect_from_match()`. See Decision 092.
   **REVERTED in a follow-up session — see Decision 094.** This caused a
   WebSocket double-connection regression that disconnected every match before
   any move could be made (below). `player_ready`/`readyPlayers` are gone from
   both client and server; `startTurnTimer()` arms unconditionally again,
   relying on the existing 60s `turnTimerSeconds` safety net instead.

5. **SERVER ACTION LOG** (`backend/src/colyseus/GameRoom.ts`) — Added
   `logAction()` emitting one JSON line per move attempt: matchId, turn, playerId,
   action type, payload summary, verdict (accepted | rejected:REASON). Explains
   the repeated `type=error` rejections from v1. See Decision 093.

Test coverage:
- 44/44 GUT tests pass (gc2–gc10; gc10 adds 13 new interaction-friction tests)
- 105/105 Jest tests pass (backend) — NOTE: the 105 count was NOT fully valid
  at time of original commit; auth.service.spec.ts and auth.service.guest-link.spec.ts
  (8 tests) crashed at worker init due to drizzle-kit@0.31 pushSchema calling
  process.exit on PGlite. Fixed in the Jest baseline sprint (Decision 095);
  all 105 now run and pass.

Verification status:
- Board render, HUD layout, Undo-not-shown-at-start: ✅ confirmed via emulator
  screenshot (probe_1300.png: "Your Turn" banner, Exit top-right, End Turn
  bottom-right, fog board, no Undo visible)
- Tap fix (int vs round): ✅ GUT test matrix; emulator screenshot confirms board
  reaches the match screen with correct starting-row rendering
- Action log JSON lines: ✅ live-verified (follow-up session, see Decision 094)
  — real 2-emulator, 2-human match (`match_1784738538879`) produced
  `verdict:"accepted"` for both players' real moves; a separate throwaway
  diagnostic build (client turn-guard bypassed only in that build, reverted
  before shipping) produced a live `verdict:"rejected:NOT_YOUR_TURN"` line.

Fixed in a follow-up session (see Decision 094 for full detail):
- **WebSocket double-connection bug**: root-caused as an interaction between
  the Colyseus GDExtension SDK (which opens a harmless internal second socket
  on a client's first `send_message` call, always rejected 4002 by design) and
  Decision 092's `player_ready` handshake, which happened to call
  `send_message` at the exact moment that made the SDK propagate the 4002 as a
  full disconnect instead of swallowing it silently. Fix was to revert 092
  rather than patch the SDK. Also uncovered and fixed a process gap: the
  backend Docker image had been stale for 12 days (only ever `restart`ed, never
  rebuilt), silently invalidating this session's early "verification" against
  unbuilt code — `docker compose build fogbound_backend` is now required after
  any backend source change, not just a restart.
- Live-verified with two real emulators as two real human players (not
  solo-vs-bot) via "Play vs Player": both joined `match_1784738538879`, both
  stayed connected with zero disconnects, both completed a real accepted move.

Files changed:
- `godot/scripts/board_coord.gd` — int() fix
- `godot/scenes/match/input_controller.gd` — same-position guard
- `godot/scenes/match/hud/hud.gd` — server_message subscriber hides undo on error
- `godot/scenes/match/CameraController.gd` — drag handler + division by zoom
- `godot/autoloads/network_manager.gd` — player_ready handshake, later reverted
  (Decision 094)
- `backend/src/colyseus/GameRoom.ts` — readyPlayers Set + logAction(); readyPlayers
  later reverted (Decision 094)
- `godot/tests/gc10/test_interaction_friction.gd` — 13 new GUT tests
- `docs/DECISIONS.md` — entries 091, 092, 093, 094

Documentation: updated docs/DECISIONS.md (entries 091–094); updated docs/AGENT.md
(this entry).

Commits: `5ce6651` (godot fixes), `e55fae3` (server ready handshake),
`6bcff74` (server action log); WS-regression revert + live verification
committed in the follow-up session (see git log for hash).

---

### Jest Baseline Fix ✅ DONE (2026-07-23)

An independent `/validate` pass found that the claimed "105/105" Jest count
was false: 97 tests ran, and 8 auth tests (auth.service.spec.ts × 2,
auth.service.guest-link.spec.ts × 6) crashed the Jest worker before running.

Root cause: `test-helpers.ts` used `pushSchema` from `drizzle-kit/api`
to set up PGlite. drizzle-kit@0.31 changed `pushSchema` to introspect the
target DB first ("Pulling schema from database..."), which calls process.exit(1)
when the introspection fails on a fresh PGlite instance — crashing the
Jest worker before any test in that suite ran.

Fix: replaced `pushSchema` with `generateDrizzleJson` + `generateMigration`
(also from `drizzle-kit/api`). These generate CREATE TABLE SQL purely from
the ORM schema objects with no DB connection needed. Same design goal
(DDL driven from the actual schema files), no introspection, no crash.

Files changed: `backend/src/auth/test-helpers.ts`
Result: 105/105 tests pass across all 9 suites. Baseline is now trustworthy.
Decision: 095

---

### Safety Hook + AI Tooling Verdicts ✅ DONE (2026-07-24)

Context: after the Jest baseline fix, closed out two standing gaps for a
solo-dev, single-branch, autonomous-commit workflow: no downside protection
against destructive shell commands, and no locked decision on which AI
tooling (code review, validation, MCP add-ons) is actually adopted vs. still
speculative.

- **PreToolUse danger hook** (Decision 096): `.claude/hooks/block-dangerous.sh`,
  wired on the Bash tool in `.claude/settings.json`. Vetoes `rm -rf`/`-fr`/
  separated/long-form outside `/tmp`; `git push --force`/`-f` unless an
  explicit feature branch is named; `git reset --hard`; `git clean -fd`
  without `-n`; `docker compose/stack down -v`; `docker volume rm`; SQL
  `DROP DATABASE`/`DROP TABLE`/`TRUNCATE`; `chmod -R 777`. Test matrix
  (8 block / 7 pass cases) confirmed clean before commit.
- **AI tooling verdicts locked** (Decision 097): use the already-wired
  `/code-review` slash command for review — do NOT build a custom
  code-reviewer agent or reference `subagent_type: "code-reviewer"`; it does
  not exist in this project (every invocation attempt errors with "Agent
  type 'code-reviewer' not found," confirmed via transcript audit of session
  `a20b3a02`). A prior fallback ran review prompts on an unrestricted
  general-purpose agent with Write/Edit access — not a reviewer, not to be
  repeated; use `subagent_type: "Explore"` for a guaranteed-read-only pass.
  `/validate` cross-session protocol adopted (caught the false 105/105 Jest
  count — see Jest Baseline Fix above). GDAI screenshot MCP ($19) skipped —
  `adb exec-out screencap -p` already free. superpowers TDD/plan-gate and a
  debugger subagent deferred, not rejected — see Decision 097 for trigger
  conditions.
- **Correction**: an earlier "Decision 059 = phase-gated tooling plan"
  reference is not real. Decision 059 is the GUT 9.6.0 GDScript testing
  framework pin — unrelated. A tooling plan was drafted at some point but
  never landed as a numbered decision in this repo. Any external reference
  to it is stale.

Documentation: updated docs/DECISIONS.md (added entries 096, 097); this
AGENT.md entry.

---

### Per-Player View Orientation: Own Base Always at Bottom ✅ DONE (code) — 2026-07-25

Context: an attempt to start the fun-gate v2 playtest (below) surfaced a new
blocker before the playtest itself could proceed: the player whose base
spawns on the server's far edge (Colyseus slot 1, `baseY = rows-1`) saw
their OWN explorers at the top of the screen and the opponent's at the
bottom — the existing universal row-flip only ever reconciled server-y-up
with Godot's y-down convention, identically for both clients, and happened
to put slot 0's base at the bottom "for free" while doing nothing for slot
1. This is a real feature landing (queued, deferred behind blocking bugs),
not a regression.

- `godot/scripts/board_coord.gd` — `to_tilemap_coord`/`to_world_position`/
  `from_world_position` each gained a `flipped: bool = false` param (a 180°
  rotation about the board center, on top of the existing row-flip);
  `is_local_view_flipped(local_base_y)` derives it from
  `GameState.players[local_player_id].baseY`, never hardcoded to a slot.
  Default keeps every existing caller byte-identical.
- `board_layer.gd` / `fog_layer.gd` — threaded through, with a self-healing
  full-repaint guard: if the local player's `baseY` becomes known only
  *after* the first full-board paint (a real risk per Decision 061 — arrival
  order across collections isn't guaranteed), every tile would otherwise be
  stuck in the wrong orientation forever, since single-tile updates don't
  normally trigger a repaint. Found during design, not live testing.
- `explorers_container.gd` / `ExplorerController.gd`, `CameraController.gd`
  (auto-pan target), `InputController.gd` (tap→server-coord inverse) —
  threaded through.
- Design choice: the flip is implemented entirely as a *position* transform
  — no node's `rotation` property ever changes — so labels (explorer id
  text, tile labels) render upright for free, verified with a regression
  test (`rotation == 0` even when flipped).

Tests: `godot/tests/gc11/test_view_orientation.gd` (new, 17 tests) —
coordinate round-trips both orientations, tap-resolves-to-correct-server-
coord both orientations (the critical correctness point), BoardLayer/
FogLayer painting + the late-player-data repaint regression, explorer
positioning + the label-rotation guard. Full regression: all runnable GUT
suites (gc2–gc8, gc10, gc11) — 69/69 pass, zero regressions. (gc9 fails to
load with a pre-existing parse error, confirmed unrelated via `git stash`.)

**Not yet live-verified — this is the actual gate, see Fun-Gate v2 below.**
Rebuilding/redeploying the APK to the two already-running emulators is
itself the multi-step pipeline from the Android APK Build sprint (above) —
out of the chunks scoped for this code change.

**Unrelated finding surfaced while running the standard Jest check:**
`npx jest` currently crashes the whole process on Node v22.21.1
(`ERR_VM_DYNAMIC_IMPORT_CALLBACK_MISSING_FLAG` inside `@electric-sql/
pglite`'s dynamic import) — confirmed via `git status`/`git diff` that zero
backend files were touched by this work, so this is pre-existing backend
drift, not caused here. Different failure than Decision 095's `pushSchema`
crash, on what looks like the same auth spec files. Needs its own
follow-up task — not fixed here (out of scope for a Godot-only goal).

Documentation: updated docs/DECISIONS.md (added entry 098); this AGENT.md
entry.

---

### Stale-Match Resume Fix ✅ DONE (2026-07-26)

Context: the blocker diagnosed in Decision 099 (pressing Play resuming a
stale, contaminated room instead of matchmaking fresh) is now fixed and
live-verified per the approved 7-point specification — see Decision 100
for full detail, the exact live-test sequences, and the root-cause finding
that the Godot client's native SDK never actually sends WebSocket close
code 1000 (an initial `code===1000` fast-path was written, then reverted
as dead code once this was confirmed live).

`backend/src/colyseus/rooms/GameRoom.ts` only — no client change:
- `onJoin` now locks the room the moment both slots fill, for vs-Player
  and solo-vs-bot alike (previously solo-bot only), and refuses outright
  if already at `maxClients` (defense in depth against slot accumulation).
- `checkForWinner()` now disposes the room on every match end (win,
  turn-limit, or tie) — previously it never did, so a finished match's
  room lingered indefinitely.
- `checkAllBots()` (pre-existing) still disposes once every player is
  bot-flagged; confirmed live that locking doesn't interfere with it.

Live-verified on two real emulators, all 5 required sequences: fresh Play
(a), win → Play Again (b), Exit mid-match → Play (c), force-stop mid-match
→ relaunch → Play — the exact Decision 099 repro (d), and a genuine
transport blip resuming the same match via the SDK's own reconnect without
any Play press (e). (d) in particular: the client that was previously
landing as a 3rd player in the stale room now creates a genuinely new one
every time, and the still-connected opponent's player count stayed at 2,
never 3.

**Correction to the "Backend Jest crashes" tech debt item below (was
wrong):** re-tested this session via the project's own `npm run test`
script (which carries the `--experimental-vm-modules` flag already needed
for `@electric-sql/pglite`) and got a clean 105/105, twice. The earlier
"crash" was from running `npx jest` directly, bypassing that flag — a
misdiagnosis in the prior session, not a real regression. The 105/105
baseline (Decision 095) is trustworthy; no follow-up task needed for this.

**New tech debt found while trying to add Jest coverage for this fix**
(see Decision 100 for full detail): `@colyseus/core`'s matchmaking router
depends on `@colyseus/better-call` → `rou3`, a pure-ESM package with no
CommonJS build. Node itself interops with this fine (production
unaffected), but Jest's runtime cannot require() it even under
`--experimental-vm-modules` — confirmed after trying
`transformIgnorePatterns` + `ts-jest`, then + `babel-jest`, both hitting
"Must use import to load ES Module." This means **no Colyseus `Room`
subclass can currently be integration-tested via this project's Jest
setup** — a real, structural gap, not specific to this fix. Verification
for this fix rests entirely on the five live 2-emulator sequences instead
(see Decision 100) plus the pre-existing 105/105 pure-model suite staying
green. Needs its own future task if Room-level Jest coverage is ever
wanted — options noted in Decision 100 (a working ESM transform, or
extracting testable pure logic out of `GameRoom` itself).

---

### Current Milestone: Fun-Gate Playtest v2

Baseline (Jest 105/105, GUT 69/69) and the safety net (danger hook,
tooling verdicts) are in place. The four interaction-friction fixes from
the previous sprint (tap hit-test, phantom undo, drag-pan, bot-takeover
grace revert) were verified individually but never played through together
as one continuous session. The per-player view orientation fix (above)
and the stale-match-resume fix (above) are now BOTH preconditions — either
one being broken would invalidate the "clean 2-emulator match" premise;
both are now fixed and live-verified.

Next 3 tasks:
1. **FUN-GATE V2**: rebuild + redeploy the APK (per the Android APK Build
   sprint pipeline, above) to the two running emulators; clean 2-emulator
   match; self-verify tap / undo / drag-pan / own-base-at-bottom / fresh-
   match-on-Play live, on BOTH devices — none of these have been confirmed
   together in one continuous session; this is a hands-on check, not an
   automated one. For the orientation fix specifically: confirm a tap
   lands correctly on the device that was previously top-oriented (proves
   the inverse tap-mapping, not just the rendering) and that labels stay
   upright. Add one more sequence (Decision 101, server side already
   proven): press Play on ONE device only, leave it sitting on "Waiting…",
   `adb shell am force-stop` it, relaunch, press Play again inside 60s —
   the second device then joins. Expect a normal 2-human match; a first
   turn that never arrives, or 4 explorers with only one opponent, means
   the pre-match seat release did not hold on-device.
2. Answer the fun-gate question directly: Play Again, or put the phone
   down — and why?
3. Depending on that answer: a legibility pass (treasure/carry affordance)
   or a loop redesign.

Tech debt (not blocking, tracked for later):
- Fog enforcement is visual-only (Decision 049) — needs StateView hardening
  before any competitive launch.
- `docs/CONTEXT.md` still describes the Unity stack as if partially active
  (a "Unity Package Stack" section, "Mobile: Unity builds natively to iOS
  and Android") — confirmed stale; needs a Godot-only cleanup pass.
- Danger hook (Decision 096): the `git commit`/`git tag` fast-exit anchors
  only on the *start* of the command string, so a chained command like
  `git commit -m "..." && rm -rf /some/path` still fast-exits and skips all
  checks — confirmed via direct test (`exit=0`, uncaught). Needs tightening
  (e.g. only fast-exit when the command contains no `&&`/`;`/`|`) before
  this hook can be trusted against compound commands, not just bare ones.
- Jest cannot import `colyseus`/`@colyseus/core` at all (see entry above)
  — no Room-lifecycle integration test coverage is possible today.
- **CLOSED 2026-07-31 (Decision 101): Decision 100 point 6 was implemented
  only as an outer cap, not at its two named mechanisms.** Commit 88256c9 added the
  `onJoin` guard (`players.size >= maxClients` → `client.leave(4000)`),
  which does bound the slot count, but the two mechanisms the spec point
  actually called for were NOT done and this was not tracked as open:
  (a) `addPlayer` still computes `const slot = this.state.players.size`
  unconditionally (`GameRoom.ts:182`), and (b) departed players are still
  left as permanent bot-flagged entries, never reclaimed or removed —
  Decision 100 records this as deliberate (bot takeover, Decision
  011/012/029, needs the entry to keep playing), which is correct *during*
  a live match but not before one starts.
  Residual failure scenario — since CONFIRMED live against 88256c9
  unmodified, then fixed (Decision 101): a room
  holding exactly ONE waiting player is not yet locked (lock fires only at
  `size >= 2`) and is not yet full, so the `maxClients` guard does not
  fire. If that player drops and presses Play again inside their 60s
  reconnection window, `join_or_create` can route them back into that same
  room — and because the client mints a fresh `player_%d` id per join
  (`network_manager.gd:63`), they are added as a *second* player at slot 1
  while their own abandoned entry keeps slot 0. Result: the match starts
  2-up with the first turn assigned to the departed ghost, the human waits
  out the 60s window before the ghost becomes a bot, and the board carries
  4 explorers for one human. Live scenarios (c)/(d) in Decision 100 did not
  cover this because both started from an already-locked 2-player room.
  **Resolution (Decision 101):** a departure while `status === 'pending'`
  now releases the seat and its explorers outright
  (`releasePreMatchSeat`, `backend/src/colyseus/rooms/PlayerSlots.ts`,
  called from `GameRoom.onLeave`); in-match departures are byte-identical
  to before. No free-slot allocator was built and `addPlayer`'s
  `slot = players.size` is untouched — with pre-match release, map size is
  again a correct allocator for the only phase that allocates. Verified by
  6 new Jest cases (suite 111/111) and by a live in-process repro that
  FAILS on 88256c9 and PASSES after, plus in-match bot-retention and
  transport-reconnect controls (logs in Decision 101). Still needs the
  on-device version of the repro — no emulator was attached; folded into
  the Fun-Gate V2 checklist below.

Doc-debt found while landing Decision 103, deliberately deferred to after
fun-gate v2 (none of it affects the playtest — all three are docs describing
the code inaccurately, not code misbehaving):
- `docs/GDD.md` Tile Library intro still says "Today only Coins and Shields
  (Tier 1, Treasure/Combat) are implemented." Stale since Decision 086 —
  arrow, cannon, and trap are all in `TileRegistry.ts`. Needs rewording that
  also accounts for cannon now being defined-but-unspawnable (Decision 103).
- Cart vs `arrow_push`: Decision 103 records Cart as the existing arrow
  behavior re-themed. If Cart is meant to be a genuinely different mechanic
  (rails, multi-tile push, rider state), 103's terrain table and the registry
  both need a real definition instead of a rename. Needs a design answer
  before any implementation task picks it up.
- `Decision 021` miscitation: Decision 047 justifies two TileMapLayer nodes
  with "(Decision 021 perf rule)", and `docs/ARCHITECTURE.md:122` repeats it,
  but Decision 021 is *Tile Shape: Squares v1* and contains no perf rule.
  `docs/ART.md` deliberately cites 047 instead. Both call sites need
  correcting — DECISIONS.md is append-only, so 047's line likely needs a
  superseding note rather than an edit.

Parked for post-fun-gate (from v1 playtest findings, still open):
- Treasure affordance — yellow tile not readable as a pick-up.
- Treasure variety + score visibility + carry feedback (GDD backlog).
- Explorer inspection card — show what a player is carrying.
- Player labels oversized / overlapping tiles.

Deferred (was "Next Sprint" before fun-gate v2 took priority — still valid,
not done, just no longer next):
- [ ] Add directional indicator to arrow/cannon swatches (small arrow/chevron in `_draw()`)
- [ ] Add combat check at arrow/cannon secondary landing position
- [ ] Add board-seeding of tile definitions to Postgres (needed for map editor)
- [ ] Add chain-cannon protection (explorer can't be launched into another cannon)

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

**Superseded by Decisions 074/080/081 (2026-07-08)** — see docs/DECISIONS.md,
docs/INFRA.md, docs/MARKETING.md, docs/TILES.md for the full reasoning. Two
changes to the list below vs. what was previously planned:
1. Live-matchmaking polish (lobby, "searching…" state) is now explicitly
   LOWER priority than async formats — Decision 080's liquidity math says a
   promoted real-time queue is actively harmful before there's a population
   to fill it. The mechanical PvP path itself already works and needs no
   further work to remain usable.
2. Tile content work no longer means hardcoding sword/water/boat directly
   into GameRules/BotAI as originally planned — Decision 081 calls for a
   data-record registry first (docs/TILES.md), so those tiles (and the rest
   of the 48) become data entries afterward, not new code paths each time.

- ~~MCTS bot AI inside Colyseus GameRoom~~ ✅ done (2026-07-06, root-level
  UCB1 Monte Carlo — see above); treasure spawn + win condition wiring
  done alongside it as prerequisites
- ~~Menus (main menu, results screen) + choose vs Bot / vs Player~~ ✅ done
  (2026-07-06 — MainMenu + Results + GameFlow; see above). Basic PvP works via
  Colyseus join_or_create (2 humans picking "Play vs Player" get matched) —
  sufficient for now per Decision 080; lobby/matchmaking polish demoted, see above.
- **Async multiplayer (room codes + daily-seed challenges)** — new top
  priority per Decision 080. Concrete build order in docs/INFRA.md: async
  turn-submission REST API (reuses existing GameRules) → room-code join
  flow → seeded daily-board generation (BoardSetup's rng param is already
  injectable) → device push-token storage → actual FCM/APNs delivery
  (**blocked on user-provided Firebase/APNs credentials** — everything
  before that step can be built without them).
- ~~Tile data registry~~ ✅ done (2026-07-08 — see Tile Data Registry
  Refactor above). Registry mechanism + coin/shield migration + zero
  hardcoded tile-id checks in GameRules/BotAI/BoardSetup. **Still open:**
  seed to Postgres, add the other 44 GDD tiles as data (sword, water/boat as
  genuinely spawnable, discovery popup/Tilepedia) — see docs/TILES.md "What's
  left." Sequencing vs. art stays **blend** — tiles lead, real-art swap-in
  for placeholder swatches can start alongside once individual tiles
  stabilize, not gated on all 48 finishing first. Verification standard for
  this and future gameplay features: automated tests (Jest/GUT) first,
  **then an in-person 2-device playtest as the final done-gate** — not
  automated coverage alone (this project's history has repeatedly found
  real bugs, e.g. the turnState sync bug, only visible with two real
  concurrent clients). This task's own automated tests are done; the
  in-person playtest is still outstanding (this session ran a headless
  live-verification pass against the real backend instead — see below —
  which is a substitute, not a replacement, for an actual human playtest).
- Player accounts wired to the Godot client (NestJS auth exists — Google/
  Apple/JWT — but the client doesn't use it yet; every match is anonymous).
  Also a prerequisite for async play (a match needs to find you when you're
  not connected, which needs a real identity, not an anonymous session id).
- Tile art + animation pass + SFX (placeholder procedural swatches only,
  per user's explicit "placeholder assets for now" decision)
- Closed beta + polish + store submission
