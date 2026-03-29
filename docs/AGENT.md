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

## Tech Stack
- Game Client: Unity 6 LTS (6000.0.x), Universal 2D
- Backend: NestJS 11, TypeScript, Node.js 24
- Realtime: Colyseus (game rooms, live state)
- Database: PostgreSQL on port 5444
- Cache: Redis on port 6399
- ORM: Drizzle ORM
- Migrations: node-pg-migrate
- Auth: JWT + Google/Apple Sign In
- Container: Docker via OrbStack

## Architecture Rules — Never Break These
- Unity client is PURE RENDERER only
- All game state lives on Colyseus server only
- NestJS handles auth, players, maps, leaderboards, shop
- Colyseus handles live match state, turns, combat, bots
- MCTS bot runs SERVER SIDE inside Colyseus only
- PostgreSQL is single source of truth for persistent data
- Every player action validated server side before applying
- Client only renders what server sends

## Port Assignments
- PostgreSQL: 5444
- Redis: 6399
- NestJS: 3007
- Colyseus: 2567

## Project Folder Structure
fogbound/
├── docker/
│   └── docker-compose.db.yml
├── docs/
│   ├── CONTEXT.md
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   ├── GDD.md
│   ├── AGENT.md (this file)
│   └── prompts/
│       ├── db-migration.md
│       └── nestjs.md
├── backend/
│   ├── src/
│   │   ├── auth/
│   │   ├── database/
│   │   │   └── schema/
│   │   ├── players/
│   │   ├── maps/
│   │   ├── matches/
│   │   ├── leaderboard/
│   │   ├── shop/
│   │   └── notifications/
│   └── db/
│       ├── migrations/
│       └── seeds/
└── game/
    └── Assets/
        └── _Game/
            ├── Scripts/
            │   ├── Core/
            │   ├── Board/
            │   ├── Explorers/
            │   ├── Network/
            │   ├── UI/
            │   └── AI/
            ├── Prefabs/
            ├── Art/
            ├── Audio/
            └── Scenes/

## Unity Project Current State
Scene: GameBoard (game/Assets/_Game/Scenes/GameBoard.unity)

GameObjects in scene:
├── Main Camera
│   └── CameraController.cs
├── GameManager
│   ├── GameManager.cs
│   ├── TurnManager.cs
│   ├── BoardManager.cs
│   ├── FogOfWarManager.cs
│   ├── ExplorerManager.cs
│   ├── NetworkManager.cs
│   ├── GameStateSync.cs
│   ├── InputManager.cs
│   └── GameInitializer.cs
├── Board (parent for tile objects)
└── Fog (parent for fog objects)

Prefabs:
├── game/Assets/_Game/Prefabs/Tiles/Tile.prefab
│   └── Has TileController.cs attached
└── game/Assets/_Game/Prefabs/Explorers/Explorer.prefab
    └── Has ExplorerController.cs attached

Scripts summary:
- GameManager.cs: singleton, game lifecycle
- TurnManager.cs: turn rotation, timer countdown
- CameraController.cs: zoom, pan, focus on tile
- InputManager.cs: tap handling, explorer selection
- GameInitializer.cs: boots the game on Play
- TileData.cs: data class for each tile
- BoardManager.cs: grid management, tile spawning
- TileController.cs: visual per tile, click detection
- FogOfWarManager.cs: fog reveal system
- ExplorerData.cs: data class for explorers
- ExplorerController.cs: visual, movement, 3D/2D toggle
- ExplorerManager.cs: spawns and manages all explorers
- NetworkManager.cs: Colyseus WebSocket client
- GameStateSync.cs: applies server state to Unity

## Unity Coding Rules
- Always use UnityEngine namespace
- Singletons use: public static X Instance
- SerializeField for inspector fields
- XML summary comments on all public methods
- New Input System (NOT old UnityEngine.Input)
- Use UnityEngine.InputSystem namespace
- Use EnhancedTouch for touch input
- Always check for null before accessing Instance
- Use StartCoroutine for movement and sequences
- Follow existing patterns in codebase exactly
- After creating scripts wait for Unity to compile
- Always read Console for errors after changes
- Always save scene after changes

## Backend Current State
NestJS modules built and running on port 3007:
├── DatabaseModule (Drizzle + PostgreSQL)
├── AuthModule (Google + Apple + JWT)
├── PlayersModule (profiles + stats)
├── MapsModule (map configs)
├── MatchesModule (match history)
├── LeaderboardModule (rankings)
├── ShopModule (items + purchases)
└── NotificationsModule (push notifications)

Database tables (all migrated):
players, player_stats, maps, matches,
match_players, leaderboards, shop_items,
player_inventory, notifications

## Game Design Rules (from GDD)
Board:
- Grid sizes: 7x7, 9x9, 11x11, 13x13, 15x15, 17x17
- All tiles face down at start (Fog of War)
- Terrain: Grass, Jungle, Sand, Water, Ice, Desert

Players:
- 2 to 4 players per match
- 2 players: opposite sides top/bottom
- 4 players: all 4 sides
- Entire starting row revealed at game start
- No treasure on starting row tiles
- Player chooses base position before match

Explorers per player:
- Small maps 7x7 9x9: 1 explorer
- Medium maps 11x11 13x13: 2 explorers
- Large maps 15x15 17x17: 3 explorers

Movement:
- 1 tile per turn
- 4 directions only
- Diagonal only via special tiles

Inventory:
- Default: max 3 coins + max 1 other item
- With bag: max 5 coins + max 2 other items
- Bag belongs to 1 explorer only

Combat:
- Attacker always wins
- Unless defender has Shield
- Loser returns to base drops all treasure

Scoring:
- Must carry treasure back to base to score
- Player with most points wins

Bot Rules:
- Bot replaces disconnected player after 3 moves
- Bot runs SERVER SIDE in Colyseus only
- When all players are bots match ends

## Current Sprint Tasks
(Update this section each session)

### Task 1 — Fix Camera to show full board
The board is 13x13 tiles. Screen is portrait mobile.
Camera needs to show the entire board.
Current issue: board not fully visible horizontally.

Fix:
- Calculate correct orthographicSize for portrait screen
- Board width = 13 units, screen aspect = 9:16
- orthographicSize needed = boardWidth / (2 * aspectRatio)
- aspectRatio for portrait 9:16 = 9/16 = 0.5625
- orthographicSize = 13 / (2 * 0.5625) = 11.56
- Use 12 with padding
- Set Camera orthographicSize to 12
- Set CameraController strategicZoom to 12
- Camera position should be (6, 6, -15)

### Task 2 — Add Grid Lines to tiles
Currently tiles have no borders so grid is not visible.
Fix:
- Create a simple border effect on each tile
- Add a slightly smaller dark square behind each tile
- This creates visible grid lines between tiles
- Tile sprite scale: 0.95, 0.95, 1
- Background color: dark gray R:0.2 G:0.2 B:0.2

### Task 3 — Add tile color coding
Revealed tiles should show terrain color:
- Grass: light green R:0.5 G:0.8 B:0.4
- Jungle: dark green R:0.2 G:0.5 B:0.2
- Sand: sandy yellow R:0.9 G:0.8 B:0.5
- Water: blue R:0.2 G:0.5 B:0.8
- Ice: light blue R:0.7 G:0.9 B:1.0
- Desert: orange R:0.9 G:0.6 B:0.3
- Fog: very dark R:0.1 G:0.1 B:0.1

Update TileController.UpdateVisual() to set
sprite color based on terrain type using these values.

### Task 4 — Commit all changes
After completing tasks 1-3:
git add .
git commit -m "feat: fix camera and add tile colors"
git push origin develop

## How To Report Back
After completing all tasks write a summary:
1. List each task: DONE / FAILED / SKIPPED
2. List any issues found and how you fixed them
3. List anything that needs human verification
4. List any decisions you made and why
5. Current Console error count

## How To Start Each Session
1. Read this entire AGENT.md file
2. Read docs/GDD.md for game rules
3. Read docs/DECISIONS.md for past decisions
4. Check current Unity Console for existing errors
5. Execute Current Sprint Tasks in order
6. Report back clearly
