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
Build the Colyseus game server and fix Unity visuals.
By end of session:
- Colyseus server running on port 2567
- Unity starting rows showing terrain colors
- Both services startable without errors

---

## Task 1 — Fix Unity Visual Issue (starting rows dark)

### Problem
Starting rows (top and bottom) are dark/black instead
of showing grass color. Fog quads are covering revealed
tiles even after RevealTile is called.

### Root Cause
FogOfWarManager.HideFogObject sets fog inactive but
TileController.UpdateVisual is not being called after
reveal, so tiles stay showing fog color.

### Fix Steps

1. Read these files first:
   game/Assets/_Game/Scripts/Board/FogOfWarManager.cs
   game/Assets/_Game/Scripts/Board/TileController.cs
   game/Assets/_Game/Scripts/Board/BoardManager.cs
   game/Assets/_Game/Scripts/Core/GameInitializer.cs

2. In BoardManager.cs verify GetTileController exists:
   public TileController GetTileController(Vector2Int pos)
   If missing add it:
   gets tileObject from _tileObjects dictionary
   returns tileObject.GetComponent<TileController>()
   returns null if not found

3. In FogOfWarManager.RevealTile():
   After calling HideFogObject(position) add:
   var tc = BoardManager.Instance?.GetTileController(position)
   tc?.UpdateVisual()

4. In GameInitializer.SpawnTestExplorers():
   After revealing all tiles in bottom row loop
   add a second loop to force UpdateVisual:
   for (int x = 0; x < boardWidth; x++)
     var tc = BoardManager.Instance?.GetTileController(
       new Vector2Int(x, 0))
     tc?.UpdateVisual()
   Same for top row (y = boardHeight - 1)

5. In TileController.UpdateVisual():
   Verify _spriteRenderer is not null
   Add at top of method:
   if (_spriteRenderer == null)
     _spriteRenderer = GetComponent<SpriteRenderer>()
   if (_spriteRenderer == null) return

6. Save all files
7. Read Console and fix any errors
8. Verify in Unity Play mode that rows show green

---

## Task 2 — Set Up Colyseus Server

### Context
Colyseus server does not exist yet.
NestJS runs on port 3007.
Colyseus must run on port 2567.
Both can run from the same backend/ project.

### Steps

#### Step 2.1 — Install Colyseus
In terminal from backend/ folder:
```bash
npm install colyseus
npm install @colyseus/schema
npm install --save-dev @types/node
```

#### Step 2.2 — Create folder structure
```bash
mkdir -p src/colyseus/rooms
mkdir -p src/colyseus/schemas
touch src/colyseus/rooms/GameRoom.ts
touch src/colyseus/schemas/GameState.ts
touch src/colyseus/schemas/TileSchema.ts
touch src/colyseus/schemas/ExplorerSchema.ts
touch src/colyseus/schemas/PlayerSchema.ts
touch src/colyseus/colyseus.module.ts
touch src/colyseus/colyseus.server.ts
```

#### Step 2.3 — Create TileSchema.ts
```typescript
import { Schema, type } from '@colyseus/schema'

export class TileSchema extends Schema {
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('string') tileType: string = 'unknown'
  @type('boolean') isRevealed: boolean = false
  @type('string') treasureType: string = 'none'
  @type('number') treasureValue: number = 0
  @type('boolean') isOccupied: boolean = false
}
```

#### Step 2.4 — Create ExplorerSchema.ts
```typescript
import { Schema, type } from '@colyseus/schema'

export class ExplorerSchema extends Schema {
  @type('string') explorerId: string = ''
  @type('string') playerId: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('string') state: string = 'idle'
  @type('number') score: number = 0
  @type('number') coinCount: number = 0
  @type('boolean') hasBag: boolean = false
  @type('boolean') hasBoat: boolean = false
  @type('boolean') isBot: boolean = false
  @type('number') botMoveCount: number = 0
}
```

#### Step 2.5 — Create PlayerSchema.ts
```typescript
import { Schema, type } from '@colyseus/schema'

export class PlayerSchema extends Schema {
  @type('string') playerId: string = ''
  @type('string') username: string = ''
  @type('number') score: number = 0
  @type('boolean') isBot: boolean = false
  @type('boolean') isConnected: boolean = true
  @type('number') slotNumber: number = 0
  @type('string') teamColor: string = 'red'
}
```

#### Step 2.6 — Create GameState.ts
```typescript
import { Schema, MapSchema, type } from '@colyseus/schema'
import { TileSchema } from './TileSchema'
import { ExplorerSchema } from './ExplorerSchema'
import { PlayerSchema } from './PlayerSchema'

export class GameState extends Schema {
  @type('string') status: string = 'pending'
  @type('number') currentTurn: number = 0
  @type('string') currentPlayerId: string = ''
  @type('string') matchId: string = ''
  @type('string') winCondition: string = 'all_treasure'
  @type('number') turnTimerSeconds: number = 60
  @type({ map: TileSchema }) tiles = new MapSchema<TileSchema>()
  @type({ map: ExplorerSchema }) explorers = new MapSchema<ExplorerSchema>()
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>()
}
```

#### Step 2.7 — Create GameRoom.ts
```typescript
import { Room, Client } from 'colyseus'
import { GameState } from '../schemas/GameState'
import { TileSchema } from '../schemas/TileSchema'
import { ExplorerSchema } from '../schemas/ExplorerSchema'
import { PlayerSchema } from '../schemas/PlayerSchema'

export class GameRoom extends Room<GameState> {
  private turnTimer: any = null
  private botMoveCounts: Map<string, number> = new Map()

  onCreate(options: any) {
    this.setState(new GameState())
    this.state.matchId = options.matchId || 
      `match_${Date.now()}`
    this.state.winCondition = 
      options.winCondition || 'all_treasure'
    this.state.turnTimerSeconds = 
      options.turnTimerSeconds || 60
    this.setPatchRate(50)
    this.initializeBoard(
      options.gridRows || 13,
      options.gridCols || 13
    )
    this.onMessage('move_explorer', (client, message) => {
      this.handleMoveExplorer(client, message)
    })
    this.onMessage('end_turn', (client, _message) => {
      this.handleEndTurn(client)
    })
    console.log(`GameRoom created: ${this.state.matchId}`)
  }

  async onJoin(client: Client, options: any) {
    const playerId = options.playerId || client.sessionId
    const username = options.username || 'Player'
    const slotNumber = this.state.players.size
    const colors = ['red', 'blue', 'green', 'yellow']
    const player = new PlayerSchema()
    player.playerId = playerId
    player.username = username
    player.slotNumber = slotNumber
    player.teamColor = colors[slotNumber] || 'red'
    player.isConnected = true
    this.state.players.set(playerId, player)
    console.log(`Player joined: ${username} (${playerId})`)
    if (this.state.players.size >= 2) {
      this.startMatch()
    }
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.findPlayerBySession(client.sessionId)
    if (!player) return
    player.isConnected = false
    console.log(`Player disconnected: ${player.playerId}`)
    if (!consented) {
      try {
        await this.allowReconnection(client, 60)
        player.isConnected = true
        console.log(`Player reconnected: ${player.playerId}`)
      } catch {
        player.isBot = true
        this.botMoveCounts.set(player.playerId, 0)
        console.log(
          `Player replaced by bot: ${player.playerId}`
        )
        this.checkAllBots()
      }
    }
  }

  onDispose() {
    if (this.turnTimer) clearTimeout(this.turnTimer)
    console.log(`GameRoom disposed: ${this.state.matchId}`)
  }

  private initializeBoard(rows: number, cols: number) {
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const tile = new TileSchema()
        tile.x = x
        tile.y = y
        tile.tileType = 'grass'
        tile.isRevealed = false
        const key = `${x}_${y}`
        this.state.tiles.set(key, tile)
      }
    }
    this.revealStartingRows(rows, cols)
  }

  private revealStartingRows(rows: number, cols: number) {
    for (let x = 0; x < cols; x++) {
      const bottom = this.state.tiles.get(`${x}_0`)
      if (bottom) bottom.isRevealed = true
      const top = this.state.tiles.get(`${x}_${rows - 1}`)
      if (top) top.isRevealed = true
    }
  }

  private startMatch() {
    this.state.status = 'in_progress'
    const firstPlayerId = Array.from(
      this.state.players.keys()
    )[0]
    this.state.currentPlayerId = firstPlayerId
    this.startTurnTimer()
    console.log(`Match started: ${this.state.matchId}`)
  }

  private startTurnTimer() {
    if (this.turnTimer) clearTimeout(this.turnTimer)
    this.turnTimer = setTimeout(() => {
      this.advanceTurn()
    }, this.state.turnTimerSeconds * 1000)
  }

  private advanceTurn() {
    const playerIds = Array.from(this.state.players.keys())
    const currentIndex = playerIds.indexOf(
      this.state.currentPlayerId
    )
    const nextIndex = (currentIndex + 1) % playerIds.length
    this.state.currentPlayerId = playerIds[nextIndex]
    this.state.currentTurn++
    const nextPlayer = this.state.players.get(
      this.state.currentPlayerId
    )
    if (nextPlayer?.isBot) {
      const botCount = (
        this.botMoveCounts.get(
          this.state.currentPlayerId
        ) || 0
      ) + 1
      this.botMoveCounts.set(
        this.state.currentPlayerId, botCount
      )
      if (botCount >= 3) {
        nextPlayer.isBot = true
      }
      setTimeout(() => this.advanceTurn(), 2000)
    } else {
      this.startTurnTimer()
    }
  }

  private handleMoveExplorer(client: Client, message: any) {
    const player = this.findPlayerBySession(client.sessionId)
    if (!player) return
    if (player.playerId !== this.state.currentPlayerId) {
      client.send('error', { message: 'NOT_YOUR_TURN' })
      return
    }
    const { explorerId, targetX, targetY } = message
    const explorer = this.state.explorers.get(explorerId)
    if (!explorer) return
    if (explorer.playerId !== player.playerId) return
    if (!this.isValidMove(explorer, targetX, targetY)) {
      client.send('error', { message: 'INVALID_MOVE' })
      return
    }
    explorer.x = targetX
    explorer.y = targetY
    const tileKey = `${targetX}_${targetY}`
    const tile = this.state.tiles.get(tileKey)
    if (tile && !tile.isRevealed) {
      tile.isRevealed = true
    }
    this.advanceTurn()
  }

  private handleEndTurn(client: Client) {
    const player = this.findPlayerBySession(client.sessionId)
    if (!player) return
    if (player.playerId !== this.state.currentPlayerId) return
    this.advanceTurn()
  }

  private isValidMove(
    explorer: ExplorerSchema,
    targetX: number,
    targetY: number
  ): boolean {
    const dx = Math.abs(explorer.x - targetX)
    const dy = Math.abs(explorer.y - targetY)
    if (dx + dy !== 1) return false
    const tileKey = `${targetX}_${targetY}`
    const tile = this.state.tiles.get(tileKey)
    if (!tile) return false
    if (tile.tileType === 'water' && !explorer.hasBoat)
      return false
    return true
  }

  private findPlayerBySession(
    sessionId: string
  ): PlayerSchema | null {
    for (const [, player] of this.state.players) {
      if ((player as any)._sessionId === sessionId)
        return player
    }
    return null
  }

  private checkAllBots() {
    const allBots = Array.from(
      this.state.players.values()
    ).every(p => p.isBot)
    if (allBots) {
      this.state.status = 'abandoned'
      console.log('All players are bots — match abandoned')
      this.disconnect()
    }
  }
}
```

#### Step 2.8 — Create colyseus.server.ts
```typescript
import { Server } from 'colyseus'
import { createServer } from 'http'
import { GameRoom } from './rooms/GameRoom'

export function createColyseusServer(): Server {
  const httpServer = createServer()
  const gameServer = new Server({ server: httpServer })
  gameServer.define('game_room', GameRoom)
  httpServer.listen(2567, () => {
    console.log('Colyseus server running on port 2567')
  })
  return gameServer
}
```

#### Step 2.9 — Create colyseus.module.ts
```typescript
import { Module } from '@nestjs/common'

@Module({})
export class ColyseusModule {
  constructor() {
    import('./colyseus.server').then(
      ({ createColyseusServer }) => {
        createColyseusServer()
      }
    )
  }
}
```

#### Step 2.10 — Add to app.module.ts
Import ColyseusModule from ./colyseus/colyseus.module
Add ColyseusModule to imports array
Keep all existing modules intact

#### Step 2.11 — Start and verify
```bash
cd backend
npm run start:dev
```
Verify console shows BOTH:
- [Nest] Application is listening on port 3007
- Colyseus server running on port 2567

Fix any TypeScript errors before reporting done.

---

## Task 3 — Update AGENT.md After Completion

After completing Tasks 1 and 2, update this file:
- Mark completed tasks
- Add new sprint tasks for next session
- Next session should focus on:
  - Connecting Unity NetworkManager to Colyseus
  - Explorer movement end-to-end test
  - Minimap UI implementation

---

## Task 4 — Commit All Changes

```bash
git add .
git commit -m "feat: add colyseus server and fix unity fog reveal"
git push origin develop
```

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