## Current Sprint — Colyseus Server Foundation

### Context
The Unity client (game/) has a working 13×13 board with fog,
explorers, and input. NetworkManager.cs and GameStateSync.cs
are stubs. The Colyseus server does not exist yet — it is the
single biggest missing piece before any multiplayer works.
The previous sprint (Explorer Movement End to End) is blocked
until Colyseus exists.

Build sequence follows the Section E priority order from the
6-month architecture blueprint agreed on 2026-04-22.

---

### Phase 1 — Grid Abstraction + Model Layer (Weeks 1–2)

#### Task 1 — ICoordinate / IGrid interfaces
Create backend/src/colyseus/model/grid/ICoordinate.ts
Create backend/src/colyseus/model/grid/IGrid.ts
  - Neighbors(coord, moveRuleset): coord[]
  - Distance(a, b): number
  - Range(center, radius): coord[]
  - FindPath(from, to, cost): coord[]
Create SquareCoord implementing ICoordinate
Implement SquareGrid implementing IGrid<SquareCoord>
  4-directional neighbors only (no diagonal by default)
  Manhattan distance
  BFS pathfinding with move cost support

#### Task 2 — Pure Game Model (no Colyseus dependency)
Create backend/src/colyseus/model/GameState.ts
  Board as Map<string, TileState> (key = "x,y")
  Explorers as Map<string, ExplorerState>
  Players as Map<string, PlayerState>
  TurnState: currentPlayerId, turnNumber, phase
Create backend/src/colyseus/model/GameRules.ts
  isValidMove(state, explorerId, targetCoord): boolean
  applyMove(state, explorerId, targetCoord): GameState
  resolveCombat(state, attackerId, defenderId): GameState
  checkWinCondition(state): string | null (winnerId or null)
No Unity, no Colyseus imports — plain TypeScript only
Write unit tests for all rules functions

#### Task 3 — Unit Tests
cd backend && npm run test
All model tests must pass before moving to Phase 2

---

### Phase 2 — Colyseus Room + Schema Sync (Weeks 3–5)

#### Task 4 — Create Colyseus GameRoom
Create backend/src/colyseus/GameRoom.ts
  Extends Room from @colyseus/core
  onCreate: initialize GameState, set turn timer
  onJoin: assign player side, spawn explorers on starting row
  onLeave: start 60s soft reconnection window, then bot takeover
    after bot makes 3 moves → seat permanently replaced
    emit "player_afk_bot_controlling" to all clients
    (Decision 029: visible badging required)
  onMessage "move_explorer": validate via GameRules.isValidMove
    if valid → applyMove → broadcast state delta
    if invalid → send error only to sender

#### Task 5 — Colyseus Schema
Create backend/src/colyseus/schema/FogboundState.ts
  Use @colyseus/schema decorators
  FogboundState: players (MapSchema), tiles (MapSchema),
    explorers (MapSchema), turnState (Schema)
  Delta sync only — never send full board every turn

#### Task 6 — Wire Colyseus into NestJS
Create backend/src/colyseus/colyseus.module.ts
Register GameRoom with the Colyseus server on port 4567
Export ColyseusService that NestJS can query for room status

#### Task 7 — Reconnection Logic
Use Colyseus allowReconnection(client, 60) for soft window
After 60s or 3 bot moves → seat converted
Bot move counter tracked per-seat in room state
On reconnect before limit → restore control, no penalty
On reconnect after limit → observer only, zero rewards
(Decisions 011, 012, 029)

---

### Phase 3 — Unity NetworkManager Wired (Weeks 4–6, parallel)

#### Task 8 — NetworkManager.cs: connect to real Colyseus room
Update game/Assets/_Game/Scripts/Network/NetworkManager.cs
  Connect to ws://localhost:4567 on Start
  JoinOrCreate "fogbound_room"
  SendMoveExplorer(explorerId, x, y): room.Send("move_explorer", payload)
  Handle "player_afk_bot_controlling" message: show badge on explorer

#### Task 9 — GameStateSync.cs: apply delta state
Update game/Assets/_Game/Scripts/Network/GameStateSync.cs
  OnStateChange: deserialize FogboundState delta
  Update BoardManager tiles from state.tiles
  Update ExplorerManager positions from state.explorers
  Update FogOfWarManager reveals from state.tiles[].revealed
  Update TurnManager from state.turnState

#### Task 10 — End to End Smoke Test
Start: cd backend && npm run start:dev (NestJS + Colyseus)
Open Unity Play mode
Console should show: "Connected to room [roomId]"
Tap explorer → tap adjacent tile
Explorer moves on screen
Colyseus logs show: "move_explorer received, applied"
All state sync confirmed before moving to Phase 4

---

### Phase 4 — Camera + Input (Weeks 4–6)

#### Task 11 — Cinemachine 3 Camera Rig
Install Cinemachine 3.x via Package Manager
Create CameraTarget empty GameObject (follows explorer centroid)
Add CinemachineCamera virtual camera targeting CameraTarget
Set orthographic; expose OrthoSize as tweenable float
Create MapSizeProfile ScriptableObject with defaultZoom,
  minZoom, maxZoom fields per map size (7,9,11,13,15,17)

#### Task 12 — PinchZoomController.cs
New Input System EnhancedTouch only
Read two-finger delta each frame
Apply: orthoSize -= pinchDelta * 0.5f * orthoSize
Lerp to target at 12/sec
Pivot on finger midpoint in world space (not screen center)
Ignore deltas under 2px
Clamp to min/max from MapSizeProfile

#### Task 13 — DoubleTapCycle.cs
Detect double-tap within 300ms
Cycle: FitToScreen → Default → Close (5×5 center on tap)
Tween 350ms EaseInOutCubic via PrimeTween

#### Task 14 — Auto-Pan on Turn Start
In TurnManager.cs: when it becomes THIS player's turn
  If any explorer is off-screen → pan only (no zoom)
  450ms EaseOutQuad via PrimeTween
  Never pan during opponent turns (fog-integrity rule, Decision 025)

---

### Phase 5 — UI Scaffolding (Weeks 5–8)

#### Task 15 — Portrait HUD (UGUI)
Bottom action strip: context-morphing primary button (right),
  Undo button (left)
Button states: "Select Explorer" / "Confirm Move" / "End Turn"
Undo disabled after End Turn pressed
Top bar: turn counter, active player avatar, score, settings gear
Explorer mini card: slides in from right on selection,
  shows inventory slots, moves remaining, HP/shield icons

#### Task 16 — Main Menu (UI Toolkit)
Bootstrap scene with DI root
Menu scene loaded additively
Start Match, Settings, Leaderboard stubs

#### Task 17 — Settings Panel (UI Toolkit)
Animation speed slider (0.5× / 1× / 2×)
Discovery popup toggle (Always / First time / Never)
Reduced motion toggle
Colorblind mode selector (None / Protanopia / Deuteranopia / Tritanopia)
Haptics on/off

---

### Playable Milestone (Week 8)

Gray-square board, 2-player local/LAN match playable end to end:
- Both players join room
- Explorers move, fog reveals, combat resolves
- Treasure collected and scored
- Win condition triggers
- No art required — function only

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

#### Phase 3 — Unity NetworkManager Wired ✅ (2026-04-22)

- Task 8 — NetworkManager.cs: Room<FogboundState>, "fogbound_room", SendMoveExplorer, bot badge, IsServerMode
- Task 9 — GameStateSync.cs: Colyseus.Schema.Callbacks API; OnAdd for explorers/tiles/players; Listen for x/y/isRevealed; OnChange for turn state; clears local prototype explorers on first server state
- Task 10 — Smoke test wired: backend start:dev → Unity Play → "Connected to room [id]" → tap → SendMoveExplorer → server state delta → explorer moves
- C# schema files generated in Assets/_Game/Scripts/Network/Schema/ (FogboundState, TileSchema, ExplorerSchema, PlayerSchema, TurnStateSchema)
- TurnManager: ApplyServerTurnState + _serverControlled flag stops local timer
- ExplorerManager: ServerMoveExplorer (no CanMove check) + ClearAllExplorers
- ExplorerController: ShowBotBadge (gray tint when bot-controlled)
- InputManager: routes moves through NetworkManager.SendMoveExplorer when IsServerMode=true

---

### Next After This Sprint

- Tile art + animation pass + SFX (weeks 8–14)
- Discovery popup + Tilepedia (weeks 10–12)
- MCTS bot AI inside Colyseus GameRoom (weeks 12–16)
- Matchmaking via NestJS (weeks 14–18)
- Closed beta + polish + store submission (weeks 18–24)
