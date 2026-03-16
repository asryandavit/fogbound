# FOGBOUND — AI Agent Context File
# Read this entire file before doing anything

## What Is This Project
A turn-based multiplayer strategy mobile board game.
Explorers navigate fog-covered islands collecting gems and coins.
Inspired by Jackal board game mechanics but fully original.

## Tech Stack
- Game Client:     Unity 2023 LTS (Universal 2D template, C#)
- Backend:         NestJS (Node.js 24, TypeScript)
- Realtime:        Colyseus (game rooms, live state sync)
- Database:        PostgreSQL (latest stable)
- Cache:           Redis (latest stable)
- Mobile:          Unity builds natively to iOS and Android
- Auth:            JWT + Google/Apple Sign-In
- Container:       Docker via OrbStack on Mac

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
└── game/            ← Unity project

## Port Assignments (Never Change These)
- PostgreSQL:  5444
- Redis:       6399
- NestJS:      3007
- Colyseus:    2577

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
- Every feature lives on its own git branch
- Branch naming: feature/, fix/, chore/
- Commit messages follow conventional commits format

## Current Status
- Project structure created
- Git repository initialized
- Docker not yet configured
- No tables created yet
- Unity project not yet created

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