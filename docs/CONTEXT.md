# FOGBOUND — AI Agent Context File
# Read this entire file before doing anything

## What Is This Project
A turn-based multiplayer strategy mobile board game.
Explorers navigate fog-covered islands collecting gems and coins.
Inspired by Jackal board game mechanics but fully original.

## Tech Stack
- Game Client:     Godot 4.6.3 stable (GDScript, standard build)
                   [Unity 6 LTS frozen as read-only fallback in game/ — never modified]
- Backend:         NestJS (Node.js 24, TypeScript)
- Realtime:        Colyseus (game rooms, live state sync)
- Database:        PostgreSQL (latest stable)
- Cache:           Redis (latest stable)
- Mobile:          Unity builds natively to iOS and Android
- Auth:            JWT + Google/Apple Sign-In
- Container:       Docker via OrbStack on Mac

## Unity Package Stack (Decided)
- UI Toolkit         — meta-UI (menus, lobby, settings, shop, Tilepedia)
- UGUI               — in-match HUD, board, world-space tooltips
- PrimeTween         — all animations (zero GC; replaces DOTween)
- Cinemachine 3.x    — camera rig (virtual camera + CameraTarget)
- VContainer         — DI container (5–10× faster than Zenject, zero alloc)
- Addressables       — all content (tile art, audio); keeps APK under 200MB
- New Input System   — all input including multi-touch pinch/pan
- Unity Localization — wired from day one (English only at launch)
- UGS Cloud Save     — cross-device save, sync on turn-end
- UGS Remote Config  — bot difficulty, turn timers, feature flags
- com.unity.vectorgraphics — SVG icon imports

## Architecture Rules (Never Break These)
- Unity client is a PURE RENDERER — it never calculates game logic
- All game state lives on Colyseus server only
- NestJS handles auth, players, maps, leaderboards, shop
- Colyseus handles live match state, turns, combat, bots
- MCTS bot runs SERVER SIDE inside Colyseus only — never on client
- PostgreSQL is the single source of truth for persistent data
- Redis is used for sessions, cache, matchmaking queue only
- Every player action is validated server side before applying
- Client never trusts itself — only renders what server sends

## Folder Structure
fogbound/
├── docker/          ← Docker compose files
├── docs/            ← Architecture, GDD, decisions
├── backend/         ← NestJS + Colyseus
│   └── db/
│       ├── migrations/
│       └── seeds/
├── game/            ← Unity project (frozen fallback)
└── godot/           ← Active Godot client

## Port Assignments (Never Change These)
- PostgreSQL:  5444
- Redis:       6399
- NestJS:      4007
- Colyseus:    4567

## Database Rules
- Migration tool: node-pg-migrate
- ORM: Drizzle (for queries and type safety)
- Every table discussed and approved before creation
- Every migration is a separate numbered file
- Seeds folder contains initial data only
- Never edit an existing migration file
- Always create a new migration for changes
- Drizzle schema must reflect migration structure

## Coding Rules
- Always use latest stable versions of all libraries
- TypeScript strict mode always on
- No any types in TypeScript
- C# follows Unity standard conventions
- All work happens on develop; main is reserved for releases only
- No feature branches for solo development; commit directly to develop
- Commit after every approved task; use conventional commits (type: description)
- Push develop to origin at minimum after each work session

## Current Status
- Project structure created
- Git repository initialized
- Docker configured (docker/docker-compose.db.yml + docker-compose.yml)
- All 9 DB tables migrated and verified
- NestJS 11 running on port 4007
- All backend modules built: auth, database, players, maps,
  matches, leaderboard, shop, notifications
- Colyseus server built (backend/src/colyseus/): fogbound_room
  defined; GameRoom, FogboundState schema, GameRules implemented
- Unity 6 LTS project (game/) frozen as read-only fallback;
  GameBoard scene has 13×13 board, fog of war, 4 explorers
- Active client: Godot 4.6.3 GDScript (godot/)
  Colyseus native SDK 0.17.11 installed (addons/colyseus/)
  Connection spike passed: joined fogbound_room, decoded full
  board state (169 tiles, 2 explorers) as Dictionary
  Client architecture designed — see docs/ARCHITECTURE.md
  and docs/GODOT_CLIENT.md

## Bot & Reconnection Rules
- When player disconnects bot takes over immediately
- After bot makes 3 moves player is permanently replaced
- Other players are never notified of any change
- Server tracks human vs bot count internally in Colyseus
- If player reconnects before 3 bot moves they take control back
- Bot moves count toward player score if player reconnects
- If player reconnects after 3 bot moves they get zero rewards
- When ALL players are bots match ends immediately
- Abandoned match has no winner and no rewards for anyone
- Disconnection events are NOT stored in database
- This logic lives entirely in Colyseus GameRoom

## Backend Current State
- NestJS 11, TypeScript, node16/node16 module resolution
- tsconfig: module node16, moduleResolution node16
- No ignoreDeprecations needed
- ValidationPipe enabled globally in main.ts
- DatabaseModule and AuthModule already built and working
- Drizzle ORM pattern: this.databaseService.db
- JWT guard: import from ../auth/jwt-auth.guard
- JWT payload: { playerId: string, username: string }
- Access via @Request() req → req.user.playerId
- All modules follow same pattern:
  imports DatabaseModule and AuthModule
  exports its own Service
- Port: 4007 (from process.env.PORT ?? 4007)
- class-validator and class-transformer installed
- google-auth-library, passport, passport-jwt installed

## Known Issues Resolved
- moduleResolution node10 deprecated → use node16
- ignoreDeprecations 6.0 not supported in TS 5.9 → removed
- baseUrl deprecated → removed from tsconfig
- Missing dto folders → always mkdir -p before touch

## Glossary

- **User** — the real human playing the game. (Not their in-game pieces.)
- **Player** — a participant slot in a match (human or bot), with a side, a
  base, a color, and a score. One user controls one player per match.
- **Explorer** — a movable figure a player controls on the board (1–3 per
  player by map size). The piece that moves tile-to-tile.
- **Board** — the square grid of tiles a match is played on; size varies
  (7×7 to 17×17).
- **Tile** — one cell of the board. Has terrain and possibly content; starts
  hidden under fog.
- **Base** — a player's home position on their own edge (ship on water maps,
  vehicle on land); explorers spawn from it and treasure is scored there.
- **Fog** — hidden tiles; revealed permanently when an explorer steps onto
  them (shared across all players).