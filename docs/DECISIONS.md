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
NestJS: 4007
Colyseus: 4567
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

## 032 — Port Choices: Avoid User's Reserved Ports

Decision: NestJS uses 4007, Colyseus uses 4567.
Reason: Other projects on this developer's machine
use 2567, 3000–3011, 3100, 5432, 5437, 5672, 6379,
6432, 8000, 8404, 9090, 15672. FOGBOUND must avoid
all of these to allow concurrent local development
across multiple projects without port conflicts.

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

---

## 033 — Client Engine: Godot replaces Unity as active client

Decision: Switch active game client from Unity to Godot.
Unity game/ folder is frozen as a read-only fallback
and must never be modified. All client work happens in
godot/.
Reason: Unity's binary-format scenes and prefabs create
friction in AI-assisted development. Godot's text-format
scenes and GDScript suit a headless, AI-driven workflow.
Validated by a spike test that connected to fogbound_room
and decoded the full board state (169 tiles) from the live
Colyseus server.
Security: neutral.

## 034 — Client Language: GDScript, standard build

Decision: GDScript on the standard (non-.NET) Godot build.
.NET/Mono build is rejected.
Reason: Best AI tooling support and code generation.
The official Colyseus native SDK targets GDScript only.
.NET adds a runtime dependency, complicates CI, and is
unsupported by the native SDK.
Security: neutral.

## 035 — Client Runtime: Godot 4.6.3 stable

Decision: Pin to Godot 4.6.3 stable. Do not use 4.7
release candidates. Upgrade only when 4.7 ships as
plain 4.7-stable and at a deliberate, safe sprint
boundary — never mid-feature.
Reason: Release candidates are under active test and
not production-ready. 4.6.3 is the verified-stable
release at this decision date.
Security: neutral.

## 036 — Realtime SDK: Colyseus native GDScript SDK 0.17.11

Decision: Use the official Colyseus native GDScript SDK
(colyseus/native-sdk), pinned at 0.17.11 (GDExtension,
beta). This matches the Colyseus 0.17 server protocol.
Never update the SDK automatically — only deliberately.
Reason: The only official SDK targeting the Colyseus
0.17 wire protocol. Version 0.17.11 was confirmed
working in the connection spike.
Security: pin version; every update requires deliberate
review of native binary changes before merging.

## 037 — Workflow: Single-branch development

Decision: All work on develop; main is reserved for
releases only. No feature branches. Commit after every
approved task. Push develop to origin at minimum after
each work session.
Reason: Solo-developer workflow; feature branches add
merge overhead with no isolation benefit. Small, frequent
conventional commits to develop provide equivalent safety.
Security: neutral; risk mitigated by frequent commit/push.

## 038 — Living Documentation: docs are part of done

Decision: Every task that changes behavior, structure,
or a decision must update the relevant doc(s) in the
same commit. DECISIONS.md is append-only; never edit
or delete past entries. See CLAUDE.md Living Documentation
section for the full rule and sprint ritual.
Reason: Prevent docs from drifting from code. A task
is not complete until code and docs agree.
Security: neutral.

## 039 — Client Architecture: one-directional data flow

Decision: Data flows in one direction only.
Colyseus SDK → network_manager → state_mapper →
game_state store → View layer. Player input flows back
as a REQUEST from the View through network_manager to
the server; the server applies it and sends a state
delta. Views are physically incapable of mutating state.
Reason: Enforces server-authority (Decision 008). Keeps
rendering logic decoupled from state logic. game_state
is testable offline without a live server.
Security: views physically cannot mutate game state,
so a tampered or buggy client can only send requests
the server is free to reject. Directly enforces 008.

## 040 — State Store: game_state.gd decoupled from network

Decision: game_state.gd is a pure GDScript autoload
that holds current match state and emits change signals.
It has no Colyseus import. state_mapper.gd (in
scripts/network/) translates raw SDK data into
game_state updates and is the only consumer of raw
server data shapes.
Reason: Testable offline without a live server.
Decoupled from SDK churn — only state_mapper.gd needs
updating when SDK data shapes change.
Security: neutral.

## 041 — Folder Structure: responsibility-based layout

Decision: godot/ uses:
  autoloads/   — config.gd, network_manager.gd, game_state.gd
  scenes/      — match/{board,explorers,hud}, menu/, shared/
  scripts/     — network/state_mapper.gd + per-scene scripts
  resources/   — .tres definitions (TileDefinition, etc.)
  assets/      — art, audio (source only; PCK/PAD for dist.)
  tests/       — GUT test files
Reason: Responsibility-based grouping scales to the full
tile library and multiple scenes without restructuring.
Security: no file or folder is a place for secrets;
client ships with none.

## 042 — Autoloads: config, network_manager, game_state

Decision: Three project autoloads registered in order:
  1. config.gd          — environment + server URL, NO secrets
  2. network_manager.gd — owns the Colyseus connection
  3. game_state.gd      — state store and change signals
state_mapper.gd lives in scripts/network/ (not an
autoload; called by network_manager.gd).
Reason: Autoloads give global access without singleton
boilerplate. Three is minimal — one per responsibility.
config must be first so network_manager can read the URL.
Security: config.gd holds only non-secret public
endpoints. Production must use wss:// and https:// only;
never unencrypted outside local development.

## 043 — SDK Boundary: only network_manager.gd touches Colyseus.*

Decision: Only network_manager.gd may import or reference
Colyseus.*. Only state_mapper.gd may consume raw SDK
data (Dictionary or Schema instances). No other file
may reference the SDK or raw server data shapes directly.
Reason: Isolates beta SDK churn to one file. When the
SDK API changes, only network_manager.gd requires edits.
Security: creates one audited chokepoint for all server
I/O, making it easier to enforce data shape validation
and prevent raw untrusted server data from reaching
view code.

## 044 — State Consumption: Colyseus.Callbacks pattern

Decision: Use Colyseus.Callbacks.of(room) for all state
listening. Do not poll get_state() in _process().
on_add back-fills existing items on first call, then
fires for new additions. Nested listeners (e.g. tile
properties) must be attached inside the on_add callback
for their parent collection, not at the top level —
on_change does NOT cascade to nested schemas. listen()
watches a specific property on a schema instance.
Reason: Official recommended SDK pattern; delta-driven
and efficient at 169–289 tiles.
Security: neutral.

## 045 — Reconnection: dumb client, server re-sync on rejoin

Decision: On disconnect, show "Reconnecting…" overlay.
Let the SDK auto-reconnect (Room.reconnected signal fires
on success). On rejoin, fully re-hydrate game_state from
the server's authoritative state. No local state
reconciliation or client-side prediction.
Reconnection backoff is tunable via
room.set_reconnection_options(options: Dictionary).
Reason: Simpler and safer than client-side prediction.
Client always defers to server truth on reconnect.
Security: client always re-syncs to server truth on
reconnect; prevents the client from drifting to a
self-serving state during a disconnection window.

## 046 — Authentication: anonymous now, JWT seam for later

Decision: Client connects anonymously in the initial
build. network_manager.gd includes an auth-ready seam
(set_auth_token / client.auth.set_token) that is wired
but unused. Implement JWT auth as its own sprint when
accounts, leaderboards, and matchmaking are built.
Reason: Unblocks all gameplay work. Auth is orthogonal
to state sync and rendering. Adding it later requires
only network_manager.gd changes.
Security: tokens (when added) must use OS secure storage
(iOS Keychain / Android Keystore); never plain files,
logs, or user:// plaintext. Client holds no secrets.
All validation is server-side. Production uses wss://.

## 047 — Match Scene Tree: GameWorld + HUD split

Decision: Match scene root has two children:
  GameWorld (Node2D) — moves with Camera2D. Contains:
    BoardLayer  (TileMapLayer) — terrain + tile state
    FogLayer    (TileMapLayer) — fog from tile.isRevealed
    Explorers   (Node2D)       — Explorer.tscn instances
    Camera2D rig (Decision 025 math)
  HUD (CanvasLayer, layer 1) — fixed to screen. Contains:
    TopBar, ActionStrip, ExplorerMiniCard
Board rendered as two TileMapLayer nodes, NOT one node
per tile (Decision 021 perf rule). Explorers individually
instanced (few, interactive, need per-instance signals).
Fog derived from server tile.isRevealed — never computed
client-side. Camera auto-pan on local player's turn only.
Reason: TileMapLayer is Godot 4's correct grid perf
pattern. CanvasLayer pins HUD independently of camera.
Security: camera never follows opponent explorer moves,
preventing accidental fog or position leak to local player.

## 048 — Signals: narrow, split by ownership

Decision: Two signal namespaces.
network_manager.gd emits transport signals:
  connection_state_changed(state: String)
  server_message(type: String, data: Dictionary)
game_state.gd emits game-truth signals:
  state_initialized
  tile_changed(coord: String)
  explorer_added(id: String)
  explorer_moved(id: String)
  explorer_removed(id: String)
  player_changed(id: String)
  turn_changed
  match_ended(winner_id: String)
No other autoload or scene node emits these signals.
View nodes subscribe to game_state signals only —
never to SDK events directly.
Reason: One emitter per domain. Narrow signals mean
each receiver processes only what it needs.
Security: neutral.

## 049 — Fog of War: visual-only at launch (known security risk)

Decision: At launch, the full board state is sent over
the wire and the client hides unrevealed tiles visually.
A modified client could read hidden tile data.
Server-side StateView filtering (sending only revealed
tile data per player) is explicitly deferred.
Reason: @colyseus/schema StateView is in beta with
rough edges at decision date; defer to avoid blocking
soft launch.
Security: REAL information leak for competitive play.
Acceptable for soft launch / closed friend groups.
MUST revisit before any public competitive matchmaking.
This is an open security debt item.

## 050 — Fog of War Model: shared fog, step-only reveal, full explorer transparency

Decision: The fog-of-war model for v1 is defined as four rules:
1. Shared fog. One board state shared by all players. A tile's
   isRevealed flag is global — once any explorer reveals a tile it is
   face-up for every player. Matches the single isRevealed boolean
   already in TileSchema.
2. Step-only reveal. A tile flips from fog to face-up only when an
   explorer moves onto it. Orthogonal neighbours are NOT auto-revealed;
   their fog edges are tinted amber in the UI (the fog-boundary tint
   already specified in GDD UX Patterns) so a player knows an unknown
   tile is there but cannot read its contents.
3. Explorers always visible. Because explorers stand on revealed tiles,
   every explorer's position is visible to all players. No vision filtering.
4. Full explorer transparency. A player may inspect any explorer (their
   own or an opponent's) and see all of its public state: position, coin
   and gem count, treasure bag, and Shield status. Combat is fully
   deterministic information — no hidden Shield.

Reason: Matches the Jackal inspiration (shared, step-flip board) and the
schema the build thread already wrote (single isRevealed boolean — no
rework, no thread drift). Step-only preserves fog tension and turns
scouting into a real choice (lead-and-risk vs. trail-into-safe-ground),
which works with shared visibility rather than against it. Full
transparency leans into the already-deterministic combat rule (attacker
wins unless defender has Shield), shifting depth to positioning and
Shield management. Simplest model to reach the gray-box milestone.

Security: Net positive. Per Decision 049 the full board state is already
on the wire and only hidden visually. Showing everything leaves nothing
hidden to cheat, so this model does NOT add to the 049 debt. Hiding any
explorer field (e.g. a secret Shield) would require the deferred
server-side StateView per-player filtering to be real rather than
cosmetic — explicitly out of scope for v1.

Future (V2): Per-player fog (private vision) and Shield-bluffing (hidden
Shield status) are a coherent V2 upgrade. They MUST ship together with
the server-side StateView filtering named in Decision 049 — never as a
visual-only hide. Tracked as the competitive-play hardening item
alongside 049.

## 051 — Match HUD: board-first with floating controls (refines 031)

Decision: The match HUD is board-first. The board fills the screen edge
to edge; all HUD elements float over it on a CanvasLayer. Same layout
language in portrait (phone) and landscape (tablet) — only control
placement adapts.
- No top bar. A small translucent turn banner floats at the top of the
  board for on-map messaging (current player + turn number). Player score
  labels float on the board near each base (e.g. "You", "Rival").
- Floating circular controls in the thumb zone: Menu, Stats, End Turn.
  End Turn is the gold primary, under the dominant thumb.
- Explorers are selected by direct tap — NO "Select explorer" button.
- Undo is contextual: it appears only while a move is pending or just
  made, then disappears. Undo CAPABILITY remains non-negotiable; only the
  persistent button is removed.
- Portrait: controls along the bottom. Landscape: utility controls in one
  bottom corner, End Turn in the other; the square board sits centered as
  an island, surrounding space used for atmosphere (sea/fog) and for
  contextual panels (explorer inspection, tile detail) that slide in on
  demand rather than permanent chrome.
- No minimap for ≤13×13; toggleable minimap for 15×15 / 17×17 (unchanged).

Refines/supersedes 031: removes the 8/62/30 split, the persistent Undo
button, the Select button, and the permanent tablet left-panel (now
contextual). Keeps 031 principles: thumb-reachable primary action, Undo
capability, no minimap ≤13×13.
Reason: Board-first floating HUD (Polytopia, Civilization, Into the Breach)
maximizes clarity and one-handed play; contextual controls follow
progressive-disclosure best practice; one consistent language across
orientations.
Security: neutral.

## 052 — Tile reveal feedback animation

Decision: When a tile is revealed (permanent under the step-only shared
fog model, Decision 050), the client plays a brief flip/scale animation on
that tile showing its content — a quick "what happened" beat. Landmark or
major tiles may additionally trigger a short auto-zoom emphasis (ties to
Tile Discovery Popups, Decision 027). Players can disable reveal animations
(device-local setting, see Decision 053).
Reason: A short motion beat communicates the result of stepping into the
unknown — the core fog loop — without a separate screen. The disable
option respects reduced-motion needs and player preference.
Security: neutral; pure client-side presentation, no game logic.

## 053 — Device-local settings (not account-synced)

Decision: A defined set of preferences is stored on the device only and is
NOT synced to the player account / Cloud Save: sound mute, music mute,
haptics toggle, reduced-motion toggle, animation-speed, and the
tile-reveal-animation toggle. Adjusting these on one device does not affect
another. They live in Godot user:// config, never on the server.
Reason: Audio, haptic, and motion preferences are inherently per-device
(analogous to OS-level mute). They are pure client presentation
preferences, not game state — consistent with the pure-renderer
architecture (client holds no game logic or secrets). Account-synced
settings are reserved for profile/gameplay preferences added later.
Security: neutral; no secrets stored.

## 055 — Explorer Inspection Card: full-transparency, own vs opponent

Decision: Tapping any explorer — own or opponent — opens the same inspection
card with identical fields: Coins (held / capacity), Items (other treasure
held / capacity), Bag (treasure bag held or not), Shield (held or not). This
is full transparency (Decision 050) made literal.
- Own explorer: actionable mode — board move tints are live (Decision 054);
  the card footer hints the next action.
- Opponent explorer: read-only inspect mode — clearly tagged, no move tints,
  no actions.
- Adjacent-combat preview: when one of the inspecting player's explorers is
  orthogonally adjacent to the inspected opponent, the card resolves the
  outcome — "attack wins" (defender has no Shield) or "you'd lose — shielded"
  (defender has Shield), per the combat rule (attacker wins unless Shield).
  This is the strategic payoff of full transparency.
- Bot badge: a bot-controlled explorer shows the AFK/bot badge (Decision 029).
- No HP: combat is deterministic (attacker wins unless Shield) — the card
  shows Shield status, never an HP value.
- No "moves remaining": with one action per turn (Decision 054) and move
  tints already shown, a move counter is redundant.
- Style: dark translucent HUD card floating over the board (consistent with
  the in-match bottom card). Parchment (#F4E4BC) is reserved for full-screen
  popups (discovery, Tilepedia).
Reason: One card with identical fields directly expresses Decision 050. The
adjacent-combat preview turns full transparency into instant, learnable
decision support — a player reads an attack in ~2 seconds. Read-only opponent
mode prevents any implication of controlling another player's units.
Security: neutral; opponent data is already on the wire (Decision 049) and
shown by design — no new exposure.

## 056 — Pre-match flow & base placement

Decision: Pre-match is a four-step spine — Choose match → Lobby → Base
placement → Match — with two entry lanes into it.
- Entry lanes: Quick play (sensible defaults, into matchmaking) and Custom
  (a host sets options and invites; invitees may Join by code).
- Match options are map-size-driven:
  - Small (7×7, 9×9): 1 explorer each, 2 players.
  - Medium (11×11, 13×13): 2 explorers each, 2–3 players.
  - Large (15×15, 17×17): 3 explorers each, 2–4 players.
  Theme rides on top (water = ship base, land = vehicle base) and the board
  layout is randomized each match (Jackal-style).
- Base placement (v1): SEQUENTIAL with live reveal. Players place in turn
  order; each placement is visible to all as it locks, so later players can
  react. A player slides their base along their own side (starting
  row/column) and locks it.
- Per-pick timer: configurable by (game type × board size), stored
  server-side / in the DB — not a single global value. Baseline ~10s,
  tuned per cell after playtest.
- Timeout behavior (v1, until the AI bot exists): a player who does not
  place in time simply misses it — no bot places for them. A player who
  missed placement receives a DEFAULT SPAWN at the centre of their own side
  at match start (so a missing base never blocks the match).
- Simultaneous placement (all place at once, blind, revealed together) is
  PARKED as a separate future game type. The pre-match flow already has a
  home for it: "placement mode" becomes a Custom-setup option, defaulting to
  sequential. The seam is intentional.
- Upgrade path: once the server-side AI bot exists (Decisions 003/011,
  weeks 12–16 roadmap), it supersedes the v1 timeout behavior — the bot
  makes placement decisions (and idle in-match moves) using board state,
  revealed tiles, and prior moves, consistent with disconnect takeover.
Reason: Sequential live placement gives the strategic "react to opponents"
feel the players asked for. A DB-driven timer matrix lets pacing be tuned
per format without code changes. Miss-your-turn-on-timeout is the smallest
v1 rule that never stalls a match and needs no bot. Parking simultaneous as
a game type ships one mode now without blocking on the other.
Security: timer config is server-authoritative; placement is a validated
server request (Decision 039).

## 057 — Anti-camping: only delivered treasure scores

Decision: Treasure scores ONLY when an explorer carries it back to its base.
Treasure held in the field at match end does not count. This is the
deliberate answer to the "grab treasure then sit idle to protect a lead"
exploit:
- Sitting idle protects nothing. An idle player's explorers remain on the
  board and fully attackable. Per Combat rules, an explorer that loses combat
  drops ALL carried treasure onto the board and returns to base — so a
  camped, loaded explorer is just an exposed target, not a locked lead.
- A missed turn does nothing on its own (Decision 056) — which is safe,
  because the rules above make stalling a slow way to lose a hoard, not a way
  to shield it. No point decay and no player ejection are needed in v1.
- Disconnects are handled separately by the reconnection/bot rules (no
  penalty); this anti-camp behavior applies to connected-but-idle play only.
- Known non-issue: a player who DELIVERS treasure early and then goes idle
  cannot be pressured — but they have already scored by delivering, which is
  exactly the intended behavior. This is not camping and needs no rule.
Reason: The exploit dies as a natural consequence of existing rules
(delivery-to-score + combat-drop) rather than a bolted-on punishment system.
Simplest fair solution; avoids penalizing honest disconnects.
Security: scoring is server-side only (Decision 039); clients cannot self-award.
