## Current Sprint — Explorer Movement End to End

### Goal
By end of sprint:
- Player taps a valid adjacent tile → Unity sends move to Colyseus
- Colyseus validates move, updates state, broadcasts new positions
- Unity receives state update and renders explorer at new position

### Task 1 — Send Move from Unity to Server

1. Read game/Assets/_Game/Scripts/Input/InputManager.cs
2. When a tile is clicked and an explorer is selected, call:
   NetworkManager.Instance.SendAction("move", new { explorerId, targetX, targetY })
   Wrap in try/catch — log error, don't crash
3. Read game/Assets/_Game/Scripts/Network/NetworkManager.cs
   Confirm SendAction sends the message to Colyseus correctly
4. Check Unity Console — 0 errors required

### Task 2 — Validate Move in Colyseus

1. Read backend/src/colyseus/GameRoom.ts (or wherever room is defined)
2. Add onMessage("move") handler:
   - Validate: explorer belongs to current player
   - Validate: target is adjacent (orthogonal, 1 tile)
   - Validate: it is this player's turn
   - If valid: update explorer position in state, advance turn
   - If invalid: send error message back to client
3. Broadcast updated state to all clients after valid move

### Task 3 — Render Updated Positions in Unity

1. Read game/Assets/_Game/Scripts/Network/GameStateSync.cs
2. On state_update message, parse explorer positions
3. Call ExplorerManager.Instance.MoveExplorer(id, newPos)
4. Read game/Assets/_Game/Scripts/Gameplay/ExplorerController.cs
   Add MoveToPosition(Vector2Int pos) coroutine if not present
5. Check Unity Console — 0 errors required

### Task 4 — Commit All Changes

git add .
git commit -m "feat: explorer movement end to end"
git push origin develop

### Task 5 — Update This File

After completing tasks update this AGENT.md:
- Move completed tasks to Completed History
- Write next sprint tasks:
  - Fog reveal on explorer move
  - Combat when two explorers meet
  - Turn timer and auto-advance

---

## Completed History

### Sprint — Fix Terrain Colors + Connect to Colyseus ✓

**Task 1 — Fix Terrain Colors (Unity)** DONE
- Root cause: sprite fields null on prefab, color had no effect on transparent sprite
- Fix: in TileController.UpdateVisual(), after sprite assignment, if sprite is still null
  create a 1×1 white Texture2D and assign as fallback sprite so terrain colors render

**Task 2 — Setup .claude Configuration** DONE
- Created .claude/settings.json with model + permissions
- .claude/ already gitignored; settings.local.json already in .gitignore

**Task 3 — Connect Unity NetworkManager to Colyseus** DONE
- Added Step 8 to GameInitializer.InitializeGame() coroutine
- Calls NetworkManager.Instance.Initialize("test_token", "player_1")
- Fires ConnectToRoom("test_map") as fire-and-forget (no block on coroutine)
- Wrapped in try/catch — logs error, does not crash if server is down

**Task 4 — Commit** DONE

**Console errors at end of sprint: 0**
