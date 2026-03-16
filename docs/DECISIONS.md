# FOGBOUND — Decision Log
# Every major decision recorded here with reasoning

## 001 — Game Engine: Unity 2023 LTS
Decision: Use Unity Universal 2D template
Reason: Game is fundamentally 2D board. 3D explorer 
models are optional overlay. 2D pipeline is lighter, 
better for mobile battery and performance.

## 002 — Backend: NestJS + Colyseus separated
Decision: NestJS and Colyseus are separate services
Reason: Colyseus handles only live match state.
NestJS handles everything else. Clean separation
of concerns. Colyseus is not designed for REST APIs
or complex business logic.

## 003 — MCTS Bot location: Server side only
Decision: Bot runs inside Colyseus GameRoom only
Reason: Prevents cheating, ensures sync across all
clients, survives player disconnection, consistent
behavior regardless of client device.

## 004 — Node.js version: 24
Decision: Use Node.js 24
Reason: Latest version, will become LTS. Building
for long term production use.

## 005 — Migration tool: node-pg-migrate
Decision: Use node-pg-migrate over ORM migrations
Reason: Pure SQL control, no ORM overhead, simple
numbered files, works cleanly with NestJS.

## 006 — Ports
Decision: Non-default ports for all services
PostgreSQL: 5437
Redis:      6380
NestJS:     3001
Colyseus:   2567
Reason: Avoid conflicts with other local projects.

## 007 — Game name: FOGBOUND
Decision: Game is named FOGBOUND
Reason: Short, unique, App Store friendly, directly
describes the core fog of war mechanic.

## 008 — Unity client is pure renderer
Decision: Unity never calculates or stores game state
Reason: Anti-cheat, single source of truth, clean
reconnection, all logic testable without Unity.

## 009 — ORM: Drizzle
Decision: Use Drizzle ORM alongside node-pg-migrate
Reason: Best TypeScript support, lightweight, feels
like writing SQL, works perfectly with node-pg-migrate,
fastest growing ORM in 2025, easy to debug, perfect
fit for NestJS. No magic, full control.

## 010 — Migration Strategy
Decision: node-pg-migrate for structure, Drizzle for queries
Reason: Clean separation. Migrations control DB structure
with pure SQL control. Drizzle handles all queries with
full type safety. They work together without conflicts.