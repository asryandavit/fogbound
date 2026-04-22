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
PostgreSQL: 5444
Redis: 6399
NestJS: 3007
Colyseus: 2568
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

## 011 — Bot Replacement Logic

Decision: Bot replaces disconnected player after 3 moves
Reason: Gives player enough time to reconnect without
disrupting match flow. 3 moves is roughly 3-4 minutes
depending on map timer. Other players never notified
to preserve seamless experience.

## 012 — Reconnection Score Handling

Decision: Bot moves count toward player score on reconnect
Reason: Fairer to player. Disconnection is often accidental
(phone call, network drop). Player should not be punished
for moves made on their behalf.

## 013 — Match Board State in PostgreSQL

Decision: Save full board state as jsonb every turn
Reason: Allows complete reconnection recovery even if
Colyseus server restarts. Critical for production game
where server crashes would otherwise lose active matches.

## 014 — Leaderboard Types

Decision: Global + per map leaderboards, all time only
Reason: Simple and clear for launch. Weekly, seasonal
and friends leaderboards can be added in future updates
without breaking existing structure.

## 015 — Ranking Points System

Decision: Points based ranking not wins only
1st place: 100, 2nd: 60, 3rd: 30, 4th: 10
Bonus: gems +5, coins +1, kills +3,
win streak +10, perfect match +20
Reason: Fairer system, rewards all positions,
encourages strategic play not just winning.

## 016 — Bonus Points Future

Decision: Bonus points system must be extensible
Reason: In future we need ability to add new bonus
point types including negative points for penalties.
Bonus points config should be data driven not hardcoded.

## 017 — Starting Row Reveal

Decision: Entire starting row revealed like Jackal
Reason: Players need to see their starting area
clearly. Consistent with Jackal which inspired
the game mechanics.

## 018 — Base Placement

Decision: Player chooses base position before match
Reason: Strategic decision, adds depth, consistent
with Jackal ship placement mechanic.

## 019 — Starting Side Treasure

Decision: No treasure on starting row/column tiles
Reason: Starting area is safe zone, consistent
with Jackal mechanics, prevents unfair advantage.

---

## 020 — Orientation: Portrait-primary on phones, landscape on tablets

Decision: Ship portrait-locked on phones under 600dp width;
support both orientations on tablets and foldables with
landscape as the tablet default.
Reason: 2025 Sensor Tower Top-10 grossing strategy games
are portrait-dominant (Last War, Whiteout Survival, Kingshot,
Monopoly Go). Colonist.io post-mortem reports 92% of mobile
sessions in portrait with games finishing up to 30% faster.
A 7×7–17×17 square grid is ~1:1, so portrait yields more
board pixels than landscape once a side panel is subtracted.
Tablet landscape unlocks a persistent 250–320dp left panel
for the Civ-VI info-panel feel. Portrait screenshots stack
better on the App Store storefront.

## 021 — Tile Shape: Squares v1, shape-agnostic coordinates

Decision: Keep square tiles for v1. Store all coordinates,
movement, pathfinding, LoS, and fog behind ICoordinate/IGrid
interfaces so hexagons and triangles are a content update later.
Implementation: SquareCoord and HexCoord both implement
ICoordinate; IGrid<TCoord, TTile> exposes Neighbors(),
Distance(), Range(), FindPath(). Neighbor function is the
only thing that changes between shapes.
Reason: Squares are correct for FOGBOUND's 4-direction
orthogonal movement rule. Refactoring a non-abstracted grid
later takes weeks; the abstraction takes one day now.
Special tiles that grant diagonal movement override the
neighbor function at that tile — no shape change required.
Do NOT instantiate one GameObject per tile; use a single
mesh/Tilemap with raycasts into grid space (17×17 = 289
tiles — per-GO spawning is the #1 Unity perf anti-pattern
for grid games).

## 022 — Unity Version: Unity 6 LTS

Decision: Use Unity 6 LTS (6000.x), not Unity 2023 LTS.
Reason: Unity 6 ships runtime data binding for UI Toolkit
(native MVVM), Multiplayer Play Mode (4 clients in one editor),
Cinemachine 3.x, and URP 2D improvements needed for the
baked normal-map rim lighting on tile selection.

## 023 — UI System: Hybrid UI Toolkit + UGUI

Decision: UI Toolkit for meta-UI (menus, lobby, settings,
Tilepedia, leaderboards, shop, discovery popup). UGUI +
PrimeTween for in-match HUD, animated tile/explorer pieces,
and world-space tile-anchored tooltips.
Reason: UI Toolkit wins on data-heavy screens via runtime
data binding and fewer draw calls. UGUI wins on the board
because it supports Animator integration, custom shaders
(rim lighting, foil effects), world-space UI, and tight
tween control. PrimeTween only — zero GC vs DOTween's
~734B per animation start, which matters on mobile doing
dozens of tile animations per turn.

## 024 — Architecture: Pure-C# Model + VContainer DI

Decision: All game rules live in a pure C# layer with no
Unity dependencies (Model). MonoBehaviours are View only.
Presenter mediates between them. VContainer as DI container.
Event bus (ITileRevealed, IExplorerMoved, ICombatResolved,
ITurnEnded) for cross-system communication.
Reason: Pure model is unit-testable outside Play mode —
the only way to prove the game is fair at scale (10,000
headless matches). VContainer resolves 5–10× faster than
Zenject with zero alloc. Event bus lets animation/VFX/audio
hooks be added later without touching rules code.

## 025 — Camera System: Cinemachine 3 + New Input System

Decision: Cinemachine 3.x virtual camera following a
CameraTarget transform. Thin MonoBehaviour on top reads
New Input System multi-touch and drives target position
and orthographic size. Cinemachine does NOT handle pinch
directly — touch math lives outside the rig.
Zoom: continuous pinch with formula
  orthoSize -= pinchDelta * 0.5f * orthoSize
Lerp to target at speed 12/sec. Pivot on midpoint of two
fingers (not screen center). Double-tap: 3-level cycle
(fit-to-screen → default → 5×5 close). Auto-pan on YOUR
turn start only (pan, no zoom, 450ms EaseOutQuad). Static
camera during opponent turns — never follow opponent moves
as that would leak fog information. This is a design-integrity
rule, not just UX. Elastic rubber-band edge behavior, 40px
max pull, 250ms EaseOutElastic snap-back.
Per-map-size zoom defaults live in a MapSizeProfile SO.

## 026 — Tile Data: ScriptableObject Architecture

Decision: One TileDefinition ScriptableObject per tile type
(48 assets). TileEffect abstract SO for polymorphic behaviors
(GrantCoinEffect, TeleportEffect, RevealNeighborsEffect,
ApplyStatusEffect, StartCombatEffect) composed into definitions.
Addressables key on each SO for art — never bundle all 48
painted tile textures into the APK (Android 200MB base limit).
Ship a Google-Sheets → SO importer early so designers can
tune tile stats without touching Unity.
Reason: Never bake stats into prefabs; never write
switch(tileType) — both dead-ends past ~10 tiles.

## 027 — Tile Discovery Popups: Severity-Tiered

Decision: 6 category-intro popups (first time each category
is revealed, persisted in save file). ~15 landmark-tile
popups for unique/major tiles. The remaining 33+ filler
tiles share their category intro. Never 48 full popups.
Popup spec: 340×480pt parchment card, scale 0.92→1.00 +
fade 220ms EaseOutBack. "Skip future tile discoveries"
checkbox bottom-left — flag must persist to save file, not
session (Civ VI's sticky bug is a top-5 complaint).
Tilepedia accessible from pause menu "?": 6 category tabs,
unseen tiles shown as silhouettes with "???" (Pokédex
engagement pattern).

## 028 — Monetization: Premium, No Gacha

Decision: $4.99–$9.99 one-time purchase or free + unlock
IAP. Cosmetic-only expansions (skins, tile art packs, ship
themes). Season pass at 3-month cadence (v2+). Never: energy
systems, gacha, pay-to-progress, card-level power tiers.
Reason: Slay the Spire ($9.99, no ads, no gacha) 5-year
longevity proof. Wingspan/Ticket to Ride/Splendor all proven
this model pays in board-game conversions. MAPS+ subscription
(cosmetic/content, not power) is the only acceptable
subscription pattern per Risk: Global Domination.

## 029 — Bot Disconnect: Visible Badging Required

Decision: When a bot takes over a disconnected player's
seat, opponent clients must see a visible "Player AFK —
bot controlling" badge on that player's explorers.
Reason: Risk: Global Domination Steam forums document the
exact failure mode — if bots are easier to ignore than
humans, players intentionally AFK for 2nd place. Visible
badging plus slightly weaker AI neutralizes this exploit.

## 030 — Async Multiplayer: Full Timer Spectrum

Decision: Support both realtime (60-second turn timer
option) and async (24h default, configurable 60s → 7 days).
Cloud Save sync on turn-end (throttled, not every action).
Push notifications are P0 QA — Ticket to Ride shipped them
broken on Android and it's a top App Store complaint.
Reason: Ticket to Ride and Chess.com both prove async with
configurable timers dramatically increases concurrent games
per player and D7/D28 retention.

## 031 — HUD Layout: Context-Morphing Primary Button

Decision: Portrait phone layout — top bar 8% (turn counter,
avatar, score, settings), board 62%, bottom action strip 30%.
Primary button bottom-right morphs context:
"Select Explorer" → "Confirm Move" → "End Turn".
Undo button bottom-left always available until End Turn.
Explorer mini card slides in from right on selection (name,
inventory, moves remaining, HP/shield).
No persistent minimap for ≤13×13 (zoomed-out IS the minimap).
Toggleable minimap top-left for 15×15/17×17.
Tablet landscape: persistent left panel 250–320dp with player
info and tile details; board gets remaining screen.
Undo is non-negotiable — the single highest-leverage
touch-grid UX feature (Into the Breach, Ticket to Ride,
Carcassonne all confirm this).
