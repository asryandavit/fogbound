# CLAUDE.md

This file provides guidance to Claude Code when working
with this repository. Read it fully before any action.

## Project

FOGBOUND — turn-based multiplayer strategy mobile board
game. Explorers move across a fog-covered grid collecting
treasure. Server-authoritative. Inspired by Jackal.

Full context in docs/:
- docs/CONTEXT.md — tech stack + architecture rules
- docs/GDD.md — game design (board, movement, combat)
- docs/DECISIONS.md — decision log (read before reversing)
- docs/AGENT.md — current sprint tasks

## Architecture Invariants — Never Break

- Unity client (game/) is PURE RENDERER only
  Never computes game state, validates moves, or runs AI
  Only renders what server sends and forwards input

- Colyseus owns live match state:
  turns, fog reveals, combat, bot moves
  All player actions validated here before applying
  MCTS bot runs ONLY inside Colyseus — never client-side

- NestJS (backend/) owns persistent data:
  auth, players, maps, history, leaderboard, shop
  Does NOT touch live match state

- PostgreSQL is single source of truth for persistent data
  Colyseus writes full board state as jsonb every turn

- Redis is sessions/cache/matchmaking only
  Never authoritative state

Rule of thumb: if it survives a match ending → NestJS+PG
If it only exists during a match → Colyseus

## Current Codebase State

### Backend (backend/)
- NestJS 11, running on port 4007
- All modules built: auth, database, players, maps,
  matches, leaderboard, shop, notifications
- All 9 DB tables migrated and verified in DBeaver
- Auth: Google + Apple Sign In + JWT
- ORM: Drizzle, migrations: node-pg-migrate

### Unity Client (game/)
- Unity 6 LTS (6000.6.6f1), Universal 2D
- Scene: GameBoard (game/Assets/_Game/Scenes/)
- All manager scripts attached to GameManager GameObject:
  GameManager, TurnManager, BoardManager,
  FogOfWarManager, ExplorerManager, NetworkManager,
  GameStateSync, InputManager, GameInitializer
- CameraController on Main Camera
- Prefabs: Tile.prefab, Explorer.prefab
- Board initializes at 13x13 on Play
- 4 explorers spawn (2 per player, 2 players)
- Starting rows revealed, fog covers middle
- Known visual issue: terrain colors may not show
  on revealed starting rows — check TileController

### Colyseus Server
- DOES NOT EXIST YET — biggest missing piece
- NetworkManager.cs and GameStateSync.cs are stubs
- Must be built inside backend/src/colyseus/

## Ports (Fixed — Never Change)

| Service    | Port |
|------------|------|
| PostgreSQL | 5444 |
| Redis      | 6399 |
| NestJS     | 4007 |
| Colyseus   | 4567 |

## Commands

### Backend (run from backend/)
```bash
npm run start:dev       # NestJS watch mode
npm run build           # production build
npm run lint            # eslint fix
npm run test            # jest unit tests
npm run migrate:up      # apply migrations
npm run migrate:down    # rollback
npm run migrate:create <name>  # new migration
npm run migrate:status  # check migration state
```

### Docker (run from repo root)
```bash
docker compose -f docker/docker-compose.db.yml up -d
docker compose -f docker/docker-compose.db.yml down
```

### Git
```bash
git checkout develop    # always work on develop
git checkout -b feature/name  # new feature branch
git add .
git commit -m "type: description"
git push origin develop
```

## Unity MCP Server
Using IvanMurzak/Unity-MCP (ai-game-developer) v0.66.0
Transport: HTTP
Port: 53752 (auto-assigned by Unity, may change on restart)
URL: http://localhost:53752
Config: game/.mcp.json and .mcp.json at project root

IMPORTANT - Unity MCP requires:
- Unity Editor must be open
- GameBoard scene loaded
- MCP Server must be Started in Window → AI Game Developer
- Connection mode: Custom (not Cloud)
- Transport: http (not stdio)

To start MCP server each session:
1. Open Unity Editor
2. Open Window → AI Game Developer
3. Click Start next to MCP server
4. Confirm green dots on Unity and MCP server

Available tools (37/60 loaded):
- scene-list-opened → list open scenes
- scene-get-data → get scene info
- gameobject-find → find GameObjects
- gameobject-create → create new GameObject
- gameobject-modify → modify components
- gameobject-component-add → add component
- gameobject-component-modify → change component values
- script-update-or-create → write C# scripts
- script-read → read existing scripts
- script-execute → run C# code dynamically
- console-get-logs → read Unity Console
- screenshot-game-view → capture game view
- editor-application-set-state → start/stop play mode
- assets-find → find assets in project
- package-add → install Unity packages

ALWAYS use --url flag with Unity MCP CLI:
  npx unity-mcp-cli run-tool scene-list-opened \
    --url http://localhost:53752

Never run unity-mcp-cli from the project root.
Either use --url OR cd into game/ folder first.
The --url flag is always preferred and most reliable.

## Database Workflow

Never edit existing migrations — always create new ones.
Schema changes: npm run migrate:create <name>
Drizzle schema in backend/src/database/schema/ must
mirror migration state exactly.

## Backend Module Pattern

Every module follows this shape:
- Imports DatabaseModule and AuthModule
- Exports its own Service
- Guards: @UseGuards(JwtAuthGuard) at class level
- JWT payload: { playerId: string, username: string }
- Access via @Request() req → req.user.playerId
- DTOs in module's dto/ folder
- No any types, TypeScript strict mode
- module/moduleResolution: node16

## Unity Coding Rules

- New Input System ONLY (UnityEngine.InputSystem)
- Use EnhancedTouch for touch input
- Never use legacy UnityEngine.Input
- Singletons: public static X Instance
- Always null-check Instance before use
- [SerializeField] for inspector fields
- XML <summary> on all public methods
- Coroutines for movement and sequences
- Save scene after all changes
- Check Console after all changes

## Game Rules (Key Invariants)

Full rules in docs/GDD.md. Critical ones:
- Map sizes: 7, 9, 11, 13, 15, 17 (odd, square only)
- Starting row fully revealed, no treasure there
- Movement: 1 tile/turn, orthogonal only
- Combat: attacker wins unless defender has Shield
- Inventory: 3 coins + 1 other (5+2 with bag)
- Bag is per-explorer not per-player
- Bot replaces disconnected player after 3 moves
- Bot moves count toward player score if they reconnect
- When all players are bots → match ends immediately

## Repository Notes

- src/ at repo root is legacy — ignore it
- Work only in backend/src/
- docs/ARCHITECTURE.md and README.md are empty
- Use docs/CONTEXT.md as architecture reference
- claude/ folder is gitignored (machine-specific MCP config)

## How to Start Each Session

1. Read this CLAUDE.md fully
2. Run: git log --oneline -10 to see recent changes
3. Read docs/AGENT.md for current sprint tasks
4. Verify tasks against git log (AGENT.md may be stale)
5. Check Unity Console if working on Unity tasks
6. Execute tasks autonomously
7. Fix any issues found along the way
8. Commit and push when done
9. Report clearly what was done

## How to Report Back

1. Each task: DONE / FAILED / SKIPPED + reason
2. Issues found and how they were fixed
3. Decisions made and why
4. Anything needing human visual verification
5. Terminal/Console error count at end
6. Recommended next steps

## Quick Commands

When I say "sprint" → read AGENT.md and execute current sprint
When I say "fix unity" → fix all Unity Console errors
When I say "fix backend" → fix all TypeScript errors in backend/
When I say "status" → git log --oneline -5 and report current state
When I say "deploy" → git add, commit with auto message, push origin
When I say "test backend" → cd backend && npm run start:dev
When I say "new sprint [description]" → update AGENT.md with new tasks
When I say "scene" → list all GameObjects in current scene
When I say "screenshot" → capture game view screenshot
When I say "play" → start Unity play mode
When I say "stop" → stop Unity play mode
When I say "logs" → get Unity Console logs

## After Every Sprint
1. Update docs/AGENT.md completed tasks section
2. Write next sprint tasks based on what was just built
3. git add docs/AGENT.md
4. git commit -m "docs: update sprint tasks"
5. git push origin develop