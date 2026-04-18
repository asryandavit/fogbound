# FOGBOUND — AI Agent Briefing Document
# Read this ENTIRE file before doing ANYTHING
# This is your complete context as lead developer

## Who You Are
You are the lead developer of FOGBOUND, a turn-based
multiplayer strategy mobile board game. You work
autonomously, make smart decisions, fix issues you
find along the way, and report clearly what you did.

## Project Location
/Users/davitasryan/repos/github/davoasrn/fogbound/

## How To Start Each Session
1. Read this entire AGENT.md file
2. Run: git log --oneline -10 to see recent changes
3. Read docs/GDD.md for game rules
4. Read docs/DECISIONS.md for past decisions
5. Verify sprint tasks against git log (may be stale)
6. Check Unity Console if working on Unity tasks
7. Execute Current Sprint Tasks in order
8. Report back clearly when done

## How To Report Back
1. Each task: DONE / FAILED / SKIPPED + reason
2. Issues found and how they were fixed
3. Decisions made and why
4. Anything needing human visual verification
5. Terminal/Console error count
6. Recommended next steps

---

## Current Sprint — Session Goal
Connect Unity to Colyseus and implement explorer movement.
By end of session:
- Unity NetworkManager connecting to Colyseus on ws://localhost:2567
- Explorer movement synced end-to-end (client → Colyseus → broadcast)
- Minimap UI showing fog state

---

## Task 1 — Connect Unity NetworkManager to Colyseus

### Context
Colyseus server is running on port 2567 with GameRoom.
NetworkManager.cs and GameStateSync.cs are stubs.
Unity client must send player actions and receive state.

### Steps
1. Install NativeWebSocket or Colyseus Unity SDK in Unity
2. Update NetworkManager.cs to open WebSocket to ws://localhost:2567
3. Implement join room and send/receive messages
4. Update GameStateSync.cs to apply received GameState to Unity scene

---

## Task 2 — Explorer Movement End-to-End

### Context
Explorer taps are captured by InputManager.
Colyseus GameRoom handles move_explorer messages.
Need to wire the full flow: tap → send → validate → broadcast → render.

### Steps
1. On tile tap in InputManager, send move_explorer message via NetworkManager
2. In GameStateSync, on state patch, update ExplorerController positions
3. Test: tapping adjacent tile moves explorer, fog reveals, turn advances

---

## Task 3 — Minimap UI

### Context
No minimap exists yet. Should show fog/revealed state at small scale.

### Steps
1. Create MinimapManager.cs that renders a small overview
2. Show fog as dark, revealed tiles as color-coded terrain
3. Show explorer positions as colored dots
4. Attach to UI canvas in GameBoard scene

---

## ✅ Completed This Session (2026-04-18)

### Task 1 — Fix Unity Visual Issue — DONE
Added null guard for _spriteRenderer in TileController.UpdateVisual().
All other fixes (GetTileController, RevealTile chain, explicit UpdateVisual
loops in SpawnTestExplorers) were already done in prior sessions.

### Task 2 — Set Up Colyseus Server — DONE
Installed colyseus@0.14.24 + @colyseus/schema@1.x (CJS-compatible).
Note: colyseus@0.17 is ESM-only and incompatible with NestJS CJS; 0.14.24
is the correct version for this project.
Created backend/src/colyseus/ with GameRoom, schemas, module, server.
Both NestJS (port 3007) and Colyseus (port 2567) start from npm run start:dev.
Used require() in ColyseusModule constructor instead of dynamic import()
to avoid node16 module resolution issues.

### Task 3 — AGENT.md Updated — DONE

### Task 4 — Commit — DONE (see git log)

---

## Completed Tasks (History)

### Session 1-3 — Project Foundation
✅ Folder structure and GitHub setup
✅ Docker Compose (PostgreSQL port 5444, Redis port 6399)
✅ GDD documented (tile library, combat, scoring, bots)
✅ 9 database migration files created and run
✅ NestJS 8 modules built and running on port 3007

### Session 4-6 — Unity Foundation  
✅ Unity 6 LTS project created (Universal 2D)
✅ GameBoard scene with all manager singletons
✅ BoardManager, FogOfWarManager, TileController
✅ ExplorerManager, ExplorerController, ExplorerData
✅ CameraController (pinch zoom, pan, strategic view)
✅ InputManager (tile tap, explorer selection)
✅ NetworkManager stub (Colyseus client)
✅ GameStateSync stub (server state → Unity)
✅ GameInitializer (boots 13x13 board on Play)
✅ Tile and Explorer prefabs created
✅ Grid lines and terrain color coding added
✅ MCP Unity integration via Coplay configured

### Session 7 — Colyseus Server + Unity Visual Fix (2026-04-18)
✅ TileController.UpdateVisual() null guard for _spriteRenderer added
✅ Colyseus server built in backend/src/colyseus/ (colyseus@0.14.24)
✅ GameRoom, GameState, TileSchema, ExplorerSchema, PlayerSchema created
✅ ColyseusModule integrated into NestJS AppModule
✅ Both services verified: port 3007 (NestJS) + port 2567 (Colyseus)