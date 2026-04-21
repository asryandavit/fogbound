## Current Sprint — Explorer Movement End to End

### Goal
Player taps tile → Unity sends move to Colyseus →
Colyseus validates and applies → All Unity clients
see the explorer move to new position.

### Task 1 — Update NetworkManager to send moves
Read game/Assets/_Game/Scripts/Network/NetworkManager.cs
Add method SendMoveExplorer(string explorerId, 
int targetX, int targetY):
  sends message "move_explorer" with payload:
    { explorerId, targetX, targetY }
  uses _room.Send("move_explorer", payload)

### Task 2 — Update InputManager to send moves
Read game/Assets/_Game/Scripts/Core/InputManager.cs
In MoveSelectedExplorer method:
After calling ExplorerManager.MoveExplorer
Also call:
NetworkManager.Instance?.SendMoveExplorer(
  _selectedExplorerId, 
  targetPosition.x, 
  targetPosition.y)

### Task 3 — Update GameStateSync to handle updates
Read game/Assets/_Game/Scripts/Network/GameStateSync.cs
Make sure it handles state_update messages from server
When state changes update BoardManager tiles
When explorer positions change update via 
ExplorerManager.MoveExplorer

### Task 4 — Connect NetworkManager OnStateChange
In NetworkManager.cs SetupRoomListeners:
Replace the state_update handler
Instead use _room.OnStateChange += (state, isFirstState) =>
  GameStateSync.Instance.ApplyState(state)

### Task 5 — Verify End to End
1. Start backend: cd backend && npm run start:dev
2. Start Unity Play mode
3. In Unity Console should see:
   Connected to room
4. Tap your explorer
5. Tap adjacent tile
6. Explorer should move
7. Check Colyseus server logs for move received

### Task 6 — Commit and Push
git add .
git commit -m "feat: connect unity movement to colyseus"
git push origin develop

### Task 7 — Update AGENT.md
Mark completed tasks
Next sprint: Combat system, treasure spawning