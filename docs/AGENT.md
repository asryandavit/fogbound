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

### GC2 — State Store
Files: godot/autoloads/game_state.gd, godot/scripts/network/state_mapper.gd
- game_state.gd: typed signals + state dicts; no Colyseus import (Decision 043)
  Signals: board_updated(coord_key, tile_data), explorer_moved(explorer_id, x, y),
           turn_changed(player_id, turn_number, phase), initialized()
- state_mapper.gd: translates raw SDK Dictionaries → game_state signals
  apply_tile_change(coord_key, tile_dict)
  apply_explorer_change(explorer_id, explorer_dict)
  apply_turn_change(turn_dict)
  finalize_initialization()
- network_manager.gd _setup_state_callbacks(): replace GC1 proof callback with state_mapper routing
- Register GameState autoload third (Config → NetworkManager → GameState)
- Headless test: connect → receive state → verify all signals fire with correct data

### GC3 — Board Renderer
Files: godot/scenes/match/board/BoardLayer.tscn, FogLayer.tscn
- TileMapLayer for terrain; TileMapLayer for fog overlay (revealed/hidden toggle)
- Listens to GameState.board_updated and GameState.initialized signals
- Coordinate mapping: server x,y → TileMap column,row (origin top-left)
- TileDefinition.tres resources for tileType → sprite mapping
- Pure renderer — no game logic

### GC4 — Explorer Renderer
Files: godot/scenes/match/explorers/Explorer.tscn, ExplorerController.gd
- Sprite2D + Label (player name + explorer index)
- Listens to GameState.explorer_moved for position updates
- Smooth lerp movement — 0.2s tween, not teleport
- Bot badge: gray tint when explorer dict isBot == true
- Pure renderer — no game logic

### GC5 — Input Handling
Files: godot/scenes/match/InputController.gd
- Tap → select explorer or target tile
- Selection state tracked locally (not in GameState)
- On confirm: NetworkManager.send_move(explorer_id, x, y) — REQUEST only, never local apply
- Guard: only accept input when GameState.current_player_id == local player
- Never mutate GameState from input — all changes come from server

### GC6 — HUD
Files: godot/scenes/match/hud/TopBar.tscn, ActionStrip.tscn, ExplorerMiniCard.tscn
- TopBar: turn counter, active player avatar, score, settings gear
- ActionStrip: context button (Select Explorer / Confirm Move / End Turn)
  + Undo button (disabled after End Turn)
- ExplorerMiniCard: slides in from right on selection; inventory slots, moves remaining
- Driven by GameState signals only — no direct server calls

### GC7 — Camera Rig
Files: godot/scenes/match/CameraController.gd
- Camera2D; PinchZoom via InputEventMagnifyGesture (fallback: manual 2-finger tracking)
- Double-tap cycle: FitToScreen → Default → Close (5×5), 350ms EaseInOutCubic via create_tween()
- Auto-pan on local player's turn start only (Decision 025 — never on opponent turns)
- Zoom clamp: min = full board + 10% padding; max = 5×5 tiles visible

---

### Playable Milestone (GC1–GC7 complete)
Gray-box board, 2-player match playable end to end on Godot:
- Both players join room; explorers appear and move; fog reveals
- Treasure collected and scored; win condition triggers
- No art required — function only

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
