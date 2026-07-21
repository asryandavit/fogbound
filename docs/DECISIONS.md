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

## 058 — First Playable milestone: gray-box scope cut and build approach

Decision: The immediate delivery target is a "First Playable" — a gray-box,
2-player match playable end to end on the Godot client, function only, no art
(this is the existing AGENT.md Playable Milestone, now the top priority). The
design thread pauses new work (UX items 5-7 stay parked) until First Playable
ships and is playtested.

Scope IN — build sequence GC2-GC7:
- GC2 state store; GC3 board + fog (two TileMapLayers); GC4 explorers (sprite +
  lerp); GC5 input (tap-select / tap-move, request-only); GC6 minimal HUD (turn
  banner, End Turn, contextual Undo only); GC7 camera (pinch + double-tap).

Scope CUT/deferred for First Playable — parked, NOT cancelled:
- Base placement UI: use the Decision 056 fallback (auto-spawn at centre of the
  player's side) as v0 behaviour; the sequential-placement UI comes later.
- Tiles: minimal set only — plain terrain + Coins + Shield + Sword. Remaining
  tiles are data-driven .tres content drops, not code.
- Deferred: explorer inspection card (055 visuals), discovery popups + Tilepedia,
  onboarding, supporting screens (menu/lobby/results as bare buttons), async mode,
  matchmaking (use join_or_create — two devices join one room), auth (already
  deferred, 046), push notifications, all art/audio/animation/juice.

Build approach — protects the reviewed-steps / novice-developer principle:
- Per-task autonomy INSIDE the /sprint loop: Claude Code writes code, runs headless
  GUT tests, runs a desktop client against the live backend, reads logs, fixes,
  and repeats with no human needed within a task.
- Human approval GATE BETWEEN tasks: a short "what changed + test results" review
  and sign-off before the next task (~6 gates for GC2-GC7). NOT fully autonomous
  end to end — an early wrong assumption must not compound unreviewed across tasks.
- AUTOMATION.md anti-drift still applies: Plan Mode, spec-compliance + security
  review subagents, DECISIONS.md checks.

Verification harness:
- Fast inner loop: headless GUT tests + a desktop Godot run talking to
  ws://localhost:4567.
- Slower end-to-end loop: Android emulator via adb (logcat filtered to Godot,
  exec-out screencap), plus OrbStack/Docker logs for Colyseus + NestJS, captured
  into a test-artifacts/ folder for analysis.

Reason: Backend, rules engine (48 tests), and GC1 are already done — the only thing
between here and a playable match is the GC2-GC7 client. Gray-box + minimal tiles +
auto-spawn removes the largest remaining UI work while keeping the match fully
playable. Real playtest feedback then re-prioritises UX items 5-7 better than
designing further ahead.
Security: unchanged — client stays a pure renderer, all logic server-authoritative,
no client secrets; join_or_create matchmaking is local-dev only.

## 059 — Testing Framework: GUT 9.6.0, pinned

Decision: Use GUT (Godot Unit Test, bitwes/Gut) version 9.6.0 for all GDScript
headless testing. Vendored under godot/addons/gut/, same pattern as the Colyseus
SDK (Decision 036) — a version.json pin file, registered as an editor plugin in
project.godot, never auto-updated.
Reason: Every First Playable task (Decision 058, GC2-GC7) has a done-criterion
that runs headless GUT tests, but no test framework existed in the repo yet.
GUT 9.6.0 is bitwes/Gut's release specifically targeting Godot 4.6.x
compatibility (confirmed via the project's GitHub releases), matching this
project's pinned Godot 4.6.3 (Decision 035).
Security: neutral — dev/test-only tooling, never shipped in a production build.

## 060 — Colyseus SDK bug found: field-keyed on_change() crashes on root REF fields

Decision: Never call `Colyseus.Callbacks.on_change(state, "field_name", callback)`
on a root-level Schema REF field (e.g. turnState). Use
`Colyseus.Callbacks.listen(state, "field_name", func(new_val, old_val))` instead —
confirmed to produce the same behavior with no crash. Also: the generic,
no-key form `on_change(state, callback)` invokes its callback with ZERO
arguments, not one — `func(_changes)` throws "Method expected 1 argument(s),
but called with 0"; use `func() -> void: ...`.
Reason: Empirically confirmed during GC2 live-backend testing (desktop Godot
client against the running fogbound_backend container). Registering
`on_change(state, "turnState", func(val, key))` reliably crashes the native
Colyseus GDExtension (0.17.11) with a Rust/Zig panic — "member access within
misaligned address 0xffffffffffffffff for type 'GodotCallbackEntry'" — inside
`_collection_change_trampoline`, as soon as the server sends its first state
patch. Bisected by incrementally re-adding each callback registration
(tiles on_add+listen, explorers on_add+listen+on_remove, players on_add, then
turnState on_change) until the crash reproduced in isolation — confirmed the
3-arg field-keyed `on_change` overload is the sole trigger, independent of any
other registrations. The trampoline name suggests the native extension routes
field-keyed `on_change` through the same code path as MapSchema/ArraySchema
collection changes, which is a type mismatch for a scalar Schema REF field.
This corrects the pattern documented in docs/GODOT_CLIENT.md's "State Callback
Consumption Pattern" section (written before this was empirically tested — that
section flagged `on_change` signatures as untested and asked GC2 to verify them).
docs/GODOT_CLIENT.md has been updated to show the corrected pattern.
Security: neutral — this is a stability/correctness fix in the network layer,
not a data-exposure change. No new information is read or sent; the same
turnState data now reaches GameState via a different, non-crashing SDK call.

## 061 — GameState.state_initialized does not reliably fire after collections

Decision: Never treat `GameState.state_initialized` (or `GameState.is_initialized`)
as a "tiles/explorers/players are now fully populated" signal. Any consumer
that derives a value from `GameState.tiles` (or another collection) must
recompute that value fresh from current data on every relevant event, not
cache it once and trust `is_initialized` to know when it's safe to stop
recomputing.
Reason: Empirically confirmed during GC4 live-backend testing. Debug tracing
showed `GameState.state_initialized` fired while `GameState.tiles.size()` was
still 0 — before any tiles arrived — then `explorer_added` fired afterward
with `GameState.tiles.size() == 169` and `GameState.is_initialized == true`.
Colyseus processes collections in the same patch in an order independent of
Callbacks registration order (Decision 060 already found related ordering
surprises); the generic root `on_change(state, func())` used to trigger
`finalize_initialization()` (Decision 060) fires on an early/empty
notification, not after every collection is guaranteed complete. This first
surfaced as a real bug in `explorers_container.gd`: caching `board_rows` once
`is_initialized` became true froze it at an early wrong value (computed from
0 tiles) instead of recomputing from the now-complete 169-tile set, so every
explorer spawned at an incorrectly flipped y position (confirmed via a live
Colyseus session: y showed as 0 instead of the correct flipped row 12).
Fixed by removing the cache entirely — `explorers_container.gd` now calls
`BoardCoord.compute_board_rows(GameState.tiles)` fresh on every
`explorer_added`/`explorer_moved`, which is cheap (a single dictionary scan,
≤289 tiles for the largest map size) and immune to this ordering issue.
Security: neutral — stability/correctness fix, no data exposure change.
Future work: docs/ARCHITECTURE.md's Decision 048 signal table describes
`state_initialized` as firing "after first full state received" — that
description is the intent, not the confirmed behavior of the current
network_manager.gd wiring. Revisit if a real "all collections populated"
signal is needed later (e.g. a loading spinner) — it would need to be
derived differently, not from this signal as-is.

## 062 — BoardCoord.compute_board_rows() bug: empty dict returned 1, not 0

Decision: `BoardCoord.compute_board_rows({})` (an empty tiles Dictionary) must
return 0, not 1, so every consumer's `if board_rows == 0` guard ("data not
computed yet") is actually reachable.
Reason: Found during GC7 live-backend testing. The original implementation
(`max_y := 0; ...; return max_y + 1`) never special-cased an empty dict — the
for loop simply never executes, leaving `max_y` at its initial 0, and the
function unconditionally returned `0 + 1 = 1`. Every prior consumer
(BoardLayer, FogLayer, ExplorersContainer) happened not to notice: an
`if board_rows == 0` guard checked immediately after construction, before any
real tiles existed, silently never fired, but nothing was being rendered/
positioned at that moment anyway, so the wrong `board_rows=1` had no visible
effect. `CameraController`'s `_recompute_zoom_bounds()` was the first consumer
to actually COMPUTE something meaningful (zoom bounds) from this bogus value —
confirmed live: `min_zoom` came out as 2.5 and `max_zoom` as 0.55, i.e.
inverted (min > max), because a phantom 1-row board produced a tiny, wrong
`max_zoom`. Fixed with an explicit `if tiles.is_empty(): return 0` at the top
of `compute_board_rows()`. Since this shares the exact same underlying hazard
as Decision 061 (GameState.state_initialized/collections populate in a
surprising order), `CameraController.apply_pinch_delta()` was also changed to
recompute zoom bounds fresh on every call rather than trusting a value cached
once in `_ready()` — the same mitigation already applied in
`explorers_container.gd` for Decision 061.
Security: neutral — correctness fix, no data exposure change.

## 063 — Match scene assembled; critical turnState sync bug found and fixed with two real clients

Decision: `godot/scenes/match/Match.tscn` (root script `match.gd`) assembles
every GC2-GC7 component per Decision 047's Match Scene Tree — `GameWorld`
(BoardLayer, FogLayer, Explorers, Camera2D running `CameraController.gd`) plus
`Hud` and `InputController` as siblings — and calls
`NetworkManager.connect_to_match()` on `_ready()`. `godot/scenes/Main.tscn`
(the project's `run/main_scene`) now just instances `Match.tscn`.

Reason: this is the first time two REAL concurrent Godot clients were run
against `fogbound_backend` in this project (every prior live check, GC2
through GC7, was single-client — deferred exactly for this reason, since a
match needs 2 players to start per `GameRoom.ts`: `if
(this.state.players.size >= 2) this.startMatch()`). Running two clients
uncovered a critical, three-layer bug where the room CREATOR's own client
never learned whose turn it was — the `HUD`/`InputController`/`CameraController`
turn-gating (Decisions 025/039) would have silently frozen the creator's
client on "Waiting…" forever, even on their own turn:

1. `listen(state, "turnState", callback)` (Decision 060's crash fix) only
   fires when the OUTER `turnState` reference changes. `GameRoom.ts` never
   reassigns it — `this.state.turnState.currentPlayerId = ...` mutates the
   SAME object in place forever. A client connected before `startMatch()`
   registers this listener while the object already exists, so it never
   fires again; the value stays frozen at whatever it was at registration
   time (empty, for the creator). A client joining AFTER the match started
   happened to see the right value anyway, because its first full-state
   hydration already had the field populated — this masked the bug in every
   single-client check.
2. Attaching nested `listen()`s on `turnState`'s own fields (the same
   pattern already used for tiles/explorers) DOES fire correctly with the
   right new-value argument on every in-place mutation — but re-reading a
   field via `.get()` on that same captured object reference afterward (or
   via a fresh `state.get("turnState")` re-fetch) returns stale or `null`
   data. Root-level single REF schema objects do not stay reliably readable
   after the fact in this SDK build, unlike MapSchema collection items
   (tiles/explorers), which do.
3. Tracking each field (`currentPlayerId`/`turnNumber`/`phase`) in its own
   local `var`, mutated from each field's `listen()` new-value argument,
   ALSO failed — even though each individual closure correctly received and
   assigned the right new value. Root-caused with an isolated repro
   (`var x=1; a lambda sets x=99; a second lambda reads x` → prints `1`, not
   `99`): **GDScript lambdas capture outer local variables by value — a
   snapshot at closure-creation time — not by reference.** Three sibling
   closures, each seemingly mutating a shared `current_player_id`, were each
   mutating their own frozen copy; a fourth closure (`push`, calling
   `StateMapper`) always saw only the copy frozen at the moment `push`
   itself was created. This is a general GDScript gotcha, not specific to
   Colyseus — anywhere multiple closures need to share mutable local state,
   a reference type (Dictionary/Array/RefCounted) is required, not a plain
   `var`.
Fixed by using a `Dictionary` to hold the three tracked values — every
closure captures the same dict reference by value, but the dict's CONTENTS
are a shared, mutable object, so writes from any closure are visible to all
the others. Confirmed live with two real concurrent clients: both now agree
on the exact same `current_player_id`, matching whichever player's turn it
actually is, regardless of which client created the room.

Verification method: launched two real `godot --headless --path .` processes
concurrently (one `sleep 1` apart) against the same live `fogbound_backend`
room, each printing `NetworkManager.local_player_id` and
`GameState.current_player_id` every 3 seconds for 15 seconds. This is the
first genuine 2-client test this project has run — recommended as the
standard verification method for any future turn-state-related change.

Security: neutral — correctness fix, no data exposure change. All values
were already on the wire (Decision 049); this only fixes whether the CLIENT
correctly recognizes them.

Not yet done: a real 2-client test of the full move → end_turn → turn
advances round trip (attempted, but the long-lived dev room's turnState was
stuck on a stale player from an earlier disconnected test session — a
side effect of one dev room accumulating state across a full day of
iterative testing, not a new bug; a fresh room or a backend restart would
clear it). The `current_player_id` sync fix itself is fully confirmed;
the move/end-turn round trip already had its own live confirmations in
GC5 (send_move reaches the server, server-side turn validation holds) and
GC6 (send_end_turn wired correctly) individually.

## 064 — OPEN ISSUE: currentPlayerId flip-flops rapidly with two truly-fresh concurrent clients

Status: **unresolved, needs further investigation.** Documenting now rather
than continuing to chase it, given the likely scope (may require a backend
change, an SDK-level workaround, or upstream investigation) exceeds what's
reasonable to resolve inline.

Symptom: with a freshly-restarted `fogbound_backend` (no accumulated room
state) and two real Godot clients connecting ~1 second apart, both clients'
`currentPlayerId` value rapidly oscillates between the two players' IDs —
confirmed via debug tracing on both clients showing alternating
`new=player_A old=player_B` / `new=player_B old=player_A` events, several
times within a few seconds. Critically, this starts **before either client
has sent any move or end_turn message** — ruled out as a side effect of the
test script's own actions. The server's turn timer defaults to 60s
(`GameRoom.ts` `onCreate`: `options.turnTimerSeconds || 60`), far longer than
the observation window, so this isn't the natural timer-driven
`advanceTurn()` either.

This is DIFFERENT from the Decision 063 bug (already fixed): 063 was about
the CLIENT failing to notice a real, one-time, correct server value. This is
the client observing a value that appears to be genuinely flip-flopping —
either a real (unexplained) server-side oscillation, or a decode-level
artifact in the beta Colyseus GDScript SDK (0.17.11) under this room's
`setPatchRate(50)` (a patch every 50ms) when two clients are both actively
receiving frequent updates simultaneously. Not yet determined which.

Reproduction: restart `fogbound_backend` (clears in-memory room state), then
launch two `godot --headless --path godot` processes about 1 second apart,
each printing `GameState.current_player_id` on a timer for ~15 seconds.
Contrast with Decision 063's verification method (which used an
ALREADY-established room with many accumulated players) — that scenario did
NOT reproduce this, suggesting it may be specific to the moment a match
FRESHLY transitions from `waiting` to `in_progress` in `startMatch()`
(`GameRoom.ts`), while both joining clients are actively listening.

Not investigated yet: whether the same oscillation is visible in the raw
`docker logs fogbound_backend` output at the moment `startMatch()` runs (that
would confirm/rule out a genuine server-side bug rather than a client decode
issue); whether lowering `setPatchRate` changes the behavior; whether the
oscillation is bounded (eventually settles) or continues indefinitely.
Security: none identified — this affects turn-taking UX correctness, not an
exposure. But it is a P0 correctness bug for actual 2-player turn-based play
and must be resolved before this client can be considered genuinely playable
beyond a single-client smoke test.

## 065 — Decision 064 retracted: false alarm, not a bug

Decision: Decision 064's "currentPlayerId flip-flops" finding was a
misdiagnosis. There is no bug. Retracting the P0 status; the turnState sync
fix from Decision 063 is fully correct and needs no further work.

Reason: root-caused conclusively with backend-side diagnostic logging
(temporarily added to `GameRoom.ts` at the exact two `turnState.currentPlayerId`
write sites — `startMatch()` and `advanceTurn()` — then removed once the
question was answered) correlated against client-side timestamps, across two
test scenarios:
- Two clients connecting and only OBSERVING (no move/end_turn actions): the
  backend log showed exactly one `startMatch()` call, one assignment, zero
  `advanceTurn()` calls; both clients showed a perfectly stable
  `current_player_id` for the full 8-second window. No oscillation.
- Two clients connecting and immediately acting (move + end_turn) the instant
  each one saw it was their own turn, on a 1-second poll with only a 0.5s
  pause between move and end_turn: the backend log showed `advanceTurn()`
  legitimately alternating between the two players 10 times (5 full round
  trips) in ~12 seconds. Both clients' observed `current_player_id` matched
  this exact sequence in lockstep, in the correct order, every time.

What Decision 064 actually observed was real, fast, legitimate turn-cycling —
both test clients react to "it's my turn" with zero artificial pacing, so a
match can race through many real turns in seconds when both sides always
act immediately. That is not a symptom worth flagging; it is the system
working exactly as designed, just exercised faster than a human would ever
play. Decision 063's fix (Dictionary-based shared closure state) is
confirmed correct and sufficient — no further turnState work is needed.

The diagnostic logging added to `GameRoom.ts` and `network_manager.gd` for
this investigation was removed after use; both files are back to their
Decision 063 state. The Docker image was rebuilt and the container restarted
to match.
Security: none — this entry only corrects a documentation/diagnosis error,
no code changed as a result.

## 066 — Treasure spawns on the board; win condition wired into GameRoom

Decision: `initializeBoard()` now scatters coin and shield treasure
(`backend/src/colyseus/model/BoardSetup.ts`, `placeTreasure()`), excluding the
starting rows (GDD: "no treasure on starting row/column tiles"). `GameRoom`
now calls the already-written, already-tested `checkWinCondition()` after
every move (human or bot) via a new `checkForWinner()` — previously it was
never called at all. `FogboundState` gained a `winnerId` field; on a win,
status becomes `'finished'`, the turn timer is cleared, and a `match_ended`
message broadcasts the winner.
Reason: found while scoping the AI opponent work — the server had a fully
tested win-condition function it never invoked, and never generated any
treasure at all (`initializeBoard` only ever produced `'grass'`). Without
this, there was nothing to actually play for and no way for a match to end,
making "AI opponent" meaningless regardless of how good the bot's decisions
were.
Security: `placeTreasure` is a pure, seedable function (rng is injectable,
defaults to `Math.random`) — server-authoritative, no client input involved.

## 067 — Bot AI: root-level UCB1 Monte Carlo, server-side only

Decision: `backend/src/colyseus/model/BotAI.ts` (`chooseBotAction`) picks a
bot's move using a root-level UCB1 Monte Carlo search: enumerate every legal
action for the bot's own explorers (at most `explorers × 4` moves + pass),
run a fixed simulation budget (150) split across candidates via UCB1,
self-play rollout each candidate forward with a fast heuristic policy (attack
undefended treasure-carriers, avoid shielded ones, grab adjacent treasure,
walk carried treasure toward base, mild exploration bias) for up to 16 plies,
and reward per-ply-discounted score delta (own score gain minus best
opponent's gain, discounted ~10%/ply) plus a small "still carrying treasure
near base" shaping term when the horizon runs out before delivery. Runs
entirely server-side inside `GameRoom` (Decision 003 — never client-side).
The exact same function also resolves the GDD's turn-timer-expiry rule
("auto-selects the safest legal move") — `startTurnTimer()`'s callback and a
bot's own turn both go through one shared `playAutoTurn(playerId)`.
Reason: the per-turn branching factor is small (this game gives exactly one
action per turn, Decision 054), making an exhaustive root search over every
candidate tractable in a single synchronous call rather than needing deep
recursive tree expansion. Per-ply discounting was necessary, not cosmetic —
an early version without it was provably indifferent between grabbing a
coin immediately versus two turns later, since a long-enough rollout horizon
let the bot reach the same coin either way; three unit tests caught this
directly and only passed once the discount made "sooner" measurably better,
which is also just correct bot behavior, not only a testability fix.
Security: bot decisions never touch the client (Decision 003); the client
only ever receives the resulting state delta like any other move.

## 068 — Solo-vs-bot: `vsBot` join option starts an immediate 1-player match

Decision: `onJoin` now accepts `options.vsBot`. If the joining player is the
room's first (and so far only) player and requested it, a second, synthetic
bot player (`bot_<playerId>`, `isBot=true` from creation) is added
immediately via a new shared `addPlayer()` helper (refactored out of the
join-a-real-player path so both cases spawn explorers/assign a base/side
identically), and `startMatch()` fires right away instead of waiting for a
second human. `network_manager.gd`'s `connect_to_match()` now defaults
`vsBot: true` in its join options.
Reason: without this, the AI opponent just built is unreachable — the room
only ever started once 2 real humans joined, so a solo player had no way to
trigger a match against the bot at all. No menu/matchmaking flow exists yet
to offer this as a real choice (Decision 058 scope cut), so it's the default
for now; remove the client-side default once a real "vs AI" / "find match"
choice is built.
Security: neutral — `vsBot` only affects room population at join time, no
new server trust boundary.

## 069 — State sync redesigned: full re-sync on state_changed, not per-field listen()

Decision: `network_manager.gd` no longer uses `Colyseus.Callbacks`
(`on_add`/`on_remove`/`listen`) for tiles, explorers, players, or turnState
at all. Instead, on every `room.state_changed` event (already confirmed
reliable — it's what `_log_state_counts` was already using), a new
`_sync_all_from_state()` re-reads the ENTIRE current state fresh and pushes
every tile/explorer/player/turnState through `StateMapper` unconditionally.
This supersedes the Callbacks-based design from GC2 (Decision 044) and the
partial fixes in Decisions 060/063.
Reason: found while live-testing the AI opponent with two real clients over
an extended multi-move match (the first time this project observed MANY
sequential updates to the same field, not just one or two). Per-field
`listen()` registered on a MapSchema collection item (tiles/explorers/
players, obtained via `on_add`) **never fires again after the initial
registration** in this SDK build (0.17.11) — confirmed by adding a debug
print inside the explorer `x`/`y` listen callbacks: zero firings across ten
real server-side moves, while the backend's own logs proved the server was
moving explorers correctly every time. This directly contradicts Decision
063's claim that "MapSchema collection items... stay reliably readable
unlike root REF fields" — that claim was only ever exercised by a single
update; it does not hold for a second update, and for collection items the
problem isn't stale reads at all, it's that the callback doesn't fire.
`room.state_changed`, by contrast, has fired correctly on every real delta
across every task built in this project. Re-deriving the full state on every
delta is simpler and provably correct, at the cost of re-processing
everything each time — cheap given board sizes top out at 289 tiles and a
handful of explorers/players. All the `apply_*_change_values` primitive-
tracking functions added for Decisions 063/064 are now dead code and were
removed; `StateMapper`'s original `apply_tile_change`/`apply_explorer_change`/
`apply_player_change`/`apply_turn_change` (reading fields fresh from
whatever object is handed to them each call) are sufficient again, since
they're now always called with a just-obtained object, never a stale one.
Security: neutral — same data, different sync mechanism; no new exposure.
Future work: if per-field listen() is later confirmed fixed in a newer SDK
release, the more granular (and slightly cheaper) approach could be
reinstated — but only after empirically re-verifying it across many
sequential updates to the same field, not just the first one, given how this
exact mistake was made twice already (Decisions 060, 063).

---

**From 074 onward, decisions use an expanded template** (Status/Date/Context/
Decision/Alternatives considered/Tradeoffs/Consequences/Supersedes-Related)
for higher-stakes architectural and product choices. Earlier entries keep
their original Decision/Reason/Security form — not rewritten (append-only).

## 074 — Async multiplayer persists in PostgreSQL, not Colyseus rooms
Status: Accepted | Date: 2026-07-08
Context: Async turns + daily-seed are launch pillars. Colyseus rooms are
  ephemeral (disposed when empty); the Colyseus community itself advises against
  using it for async. Real-time indie multiplayer dies of empty lobbies.
Decision: Live PvP stays on Colyseus. Async matches persist as JSONB in
  PostgreSQL; turns submitted via authenticated REST, validated server-side via
  the shared GameRules, opponents notified via FCM/APNs. No long-lived room.
Alternatives considered: (a) Force Colyseus to hold long-lived rooms — rejected:
  memory cost, fragility. (b) Firebase/Firestore — rejected: lock-in, cost.
Tradeoffs: Two code paths (live + async); gain reliability, cheap scale,
  replay-ready state, trivial 5+ parallel matches per player.
Consequences: ARCHITECTURE.md updated; new INFRA.md.
Supersedes / Related: any prior "Colyseus for all multiplayer" assumption.

## 080 — Launch multiplayer prioritizes zero-concurrency formats
Status: Accepted | Date: 2026-07-08
Context: The multiplayer-liquidity death spiral kills tiny-team real-time games:
  you need ~1440/(wait-tolerance-in-min) daily actives just to fill matches,
  multiplied per mode/tier. Every comparable success (Polytopia, Warbits) went
  async; the real-time ones died.
Decision: Launch with (a) solo vs bot, (b) async friend play via room codes,
  (c) daily-seed challenges — all near-zero-concurrency. Add real-time random
  matchmaking only after population exists. Never fragment matchmaking early.
Alternatives considered: Lead with real-time random matchmaking — rejected:
  empty-lobby death spiral.
Tradeoffs: Less "instant PvP" splash at launch; avoids the #1 cause of indie
  multiplayer death.
Consequences: GDD.md, MARKETING.md, ARCHITECTURE.md.

## 081 — Tiles are server-side data records, not hardcoded logic
Status: Accepted | Date: 2026-07-08
Context: Next build is tile content. Post-launch themes and the map editor both
  need identical mechanics under different art. Hardcoding tiles now = rewriting
  them twice.
Decision: Every tile is a data record { id, category, behavior, spawn_weight }
  in a TypeScript registry the Colyseus GameRules reads (seeded to Postgres as
  source of truth). Rules engine + MCTS bot branch on category/behavior, never
  on a specific tile id. Client stays pure renderer: receives tileType/
  treasureType, maps id -> art via a per-theme art resource. No tile behavior
  on the client.
Alternatives considered: (a) Hardcode each tile — rejected: blocks themes +
  editor. (b) Define tiles client-side — rejected: violates pure-renderer rule.
Tradeoffs: Slightly more structure now; makes themes + map editor cheap and
  keeps bot logic theme-agnostic.
Consequences: ARCHITECTURE.md, GDD.md, new TILES.md.
Supersedes / Related: 043 (SDK boundary), CONTEXT.md pure-renderer rules.

## 070 — Game-flow layer: MainMenu → Match → Results, driven by a GameFlow autoload

Decision: added the app's front-to-back flow so the game is a real playable
loop rather than a hard-launch into one match. New `run/main_scene` is
`scenes/menu/MainMenu.tscn` (a gray-box Control per Decision 058: bare "Play
vs Bot" / "Play vs Player" / "Quit" buttons, no art). A new `GameFlow`
autoload (fourth autoload, after GameState) owns scene transitions and
carries the selected mode across the scene change — `start_match(vs_bot)`,
`play_again()`, `to_main_menu()`, `join_options()`. `match.gd` now connects
with `GameFlow.join_options()` instead of a hardcoded default. A new Results
overlay (`scenes/match/results/Results.tscn`, CanvasLayer above the HUD)
listens for `GameState.match_ended`, shows You Win/You Lose + final scores,
and offers Play Again / Main Menu (both routed through GameFlow). The old
`scenes/Main.tscn` wrapper was deleted (nothing else referenced it).
Reason: the client had every in-match renderer (GC1-GC7) but no way to
start, choose an opponent, see that a match had ended, or play again — the
`match_ended` broadcast wired server-side (Decision 066) was invisible with
nothing consuming it. GameFlow carries the mode via an autoload because a
scene loaded by `change_scene_to_file` can't be handed constructor args, and
the match must connect from its own `_ready()` (renderers present first) to
preserve the "scene present, THEN connect" ordering every GC task relied on.
Security: neutral — menus/flow are pure client UI; all match authority stays
server-side. Scene-transition code isn't headless-unit-testable, so GameFlow
is verified live; its pure parts (Results.outcome_text/format_scores,
join_options, GameState.reset) are unit-covered in tests/gc8.

## 071 — Room lifecycle: create vs join_or_create, maxClients=2, lock, full client teardown

Decision: "Play vs Bot" now calls the SDK's `create()` (a guaranteed-fresh
room) and "Play vs Player" calls `join_or_create()` (matchmake with a second
human) — `network_manager.connect_to_match` picks based on `join_opts.vsBot`.
Server-side, `GameRoom` sets `maxClients = 2` and calls `this.lock()`
immediately after adding a solo bot, so matchmaking can never drop a second
human into a solo-vs-bot room (the bot is not a client connection, so the
room would otherwise look half-empty). `disconnect_from_match` now disconnects
every room signal handler it attached and nulls `_client` (not just `_room`)
before leaving, so a left room can never call back into GameState or leak.
Reason: before this, `connect_to_match` always used `join_or_create` and the
room had no client cap or lock, so two humans (or a human and someone's bot
room) could collide; and leaving only nulled `_room`, leaving the old room's
signals live. Live testing surfaced a concrete bug from the missing teardown
combined with Decision 072's reset issue: a "Play Again" reconnect merged the
previous room's players into the next match (4 players instead of 2).
Security: neutral — cap/lock are server-authoritative; no new trust boundary.

## 072 — match_ended client bridge + GameState.reset on connect (and a Godot static no-op worked around)

Decision: the server's `match_ended` message is routed into GameState so
views react through `GameState.match_ended` (Decision 048), not a raw
transport message: `network_manager._on_message_received` calls
`StateMapper.apply_match_ended(data)` → `GameState.end_match(winnerId)`.
And every new connection clears stale state up front by calling
`GameState.reset()` at the top of `connect_to_match`.
Reason + finding: GameState is an autoload that outlives the Match scene, so
without an explicit reset a "Play Again"/new match inherits the previous
match's tiles/explorers/players/turn. The reset was FIRST written as a
`StateMapper.reset_state()` static helper (to preserve GameState's "only
state_mapper writes me" invariant), but live tracing proved that specific
static method silently no-ops in this Godot build — its body never executes
(diagnostic prints inside it never fired, and players stayed populated),
even though sibling statics in the same file (`apply_player_change`,
`apply_match_ended`) run fine, and a direct `GameState.reset()` on the very
next line clears correctly. Root cause not fully isolated (a Godot
static-dispatch anomaly, reproduced across full `.godot` cache wipes); the
reliable, verified workaround is to call `GameState.reset()` directly from
the NetworkManager Node context. This is a deliberate, documented exception
to "only state_mapper writes GameState": reset is a whole-state lifecycle op
the transport owns, distinct from per-field translation. `StateMapper.reset_state`
was removed as dead/broken.
Security: neutral. Future work: if the static-dispatch anomaly is understood
or a Godot update changes it, the helper could return — but only re-verified
live, not assumed.

## 073 — Turn/time-limit win condition (maxTurns) as a universal termination backstop

Decision: implemented the GDD's "time limit runs out" win condition as a
turn cap. `GameState` (pure) gains `maxTurns?`; `checkWinCondition` checks it
FIRST — if `turn.turnNumber >= maxTurns (> 0)`, the match ends and the score
leader wins (deterministic first-wins tiebreak, shared with all_treasure via
a new `scoreLeader` helper). `FogboundState` gains `maxTurns` (0 = unlimited);
`GameRoom.onCreate` sets it from `options.maxTurns ?? DEFAULT_MAX_TURNS`
(300); `toPureState` passes it through. Applies regardless of the configured
winCondition, so it's a universal backstop, not only a selectable mode.
Reason: found live — an `all_treasure` solo match can effectively never end.
With only 1-2 explorers and sparse fog exploration, the bots leave a few
scattered treasures uncollected forever (observed: 3 of 5 still on the board
after 154 auto-played turns), so the player would never reach the results
screen. A finished game must always terminate. The GDD already lists "time
limit runs out" as a designed win condition; this implements it (turn-based,
deterministic — better than wall-clock for fairness/testability) and doubles
as the safety net. Verified: with `maxTurns` set small, a real match reaches
`match_ended` end-to-end (server broadcast → client bridge → results). Unit
tests cover cap-hit-with-treasure-remaining, below-cap, and 0=unlimited.
Security: neutral — server-authoritative; the cap only affects when the
server declares a winner.

## 082 — Tile registry includes unreachable tiles as spawnWeight:0 catalog entries
Status: Accepted | Date: 2026-07-08
Context: Decision 081's registry refactor task explicitly scoped migration
  to grass/coin/shield, but GameRules.ts has 4 hardcoded tile-id string
  checks, not 3 — isValidMove's water check and applyMove's bag/boat equip
  checks reference tiles nothing currently spawns.
Decision: TileRegistry includes water/bag/boat as real entries with
  spawnWeight: 0 (defined, never placed by placeTreasure) so GameRules can
  be fully generic (category/behavior-driven, zero hardcoded tile-id
  checks) rather than 3/4 generic and 1/4 still hardcoded.
Alternatives considered: Leave water/bag/boat hardcoded, deferred to
  whichever future task actually makes them spawnable — rejected: leaves
  Decision 081's unconditional "never on a hardcoded tile id" only
  partially satisfied, for zero effort saved (the entries are one-liners).
Tradeoffs: None material — these tiles are unreachable in live play today
  (placeTreasure never produces them), so this is pure catalog completion,
  not new spawnable content.
Consequences: docs/TILES.md.
Supersedes / Related: 081.

## 083 — Guest-first auth, optional provider linking
Status: Accepted | Date: 2026-07-08
Context: Async friend play, leaderboards, and later cosmetic IAP all need a
  stable player identity, but gating first play behind Google/Apple login kills
  mobile conversion. Apple guideline 4.8 also requires Sign in with Apple
  wherever Google login is offered on iOS.
Decision: On first launch the client silently creates an anonymous player
  (authProvider='guest', providerId = server-generated UUID) and receives a JWT
  — play starts with zero friction. The player is prompted to link Google or
  Apple at a natural moment (first win / add-friend / cross-device / purchase);
  linking upgrades the SAME player row in place (preserves id + progress),
  swapping authProvider and providerId to the real provider.
Alternatives considered: (a) Require login before play — rejected: conversion
  killer. (b) Device-id only, no providers — rejected: no cross-device, no
  purchase restore.
Tradeoffs: A guest can lose their account if they never link and lose the
  device; accepted, mitigated by nudging linking. Slightly more auth surface.
Consequences: players schema migration (allow 'guest' + nullable-until-linked
  provider fields); new guest-login endpoint; link-in-place endpoint; the Apple
  token-verification fix (Decision-085 follow-up / security debt below) must
  land before any provider login ships.
Supersedes / Related: CONTEXT.md auth rules; INFRA.md.

## 084 — Guest account implementation (secure-token, link-to-persist)
Status: Accepted | Date: 2026-07-08
Context: Decision 083 sets guest-first policy. This settles how a guest identity
  is anchored, given players may return on the same install, reinstall, use a
  second device (Android/iOS), and — later — a web client.
Decision:
  - A guest is a real players row: authProvider='guest', providerId = a
    server-generated UUID. Identity is keyed by the composite
    (authProvider, providerId), never providerId alone.
  - The client persists a long-lived refresh token in OS secure storage
    (Keychain/iOS, Keystore/Android; secure cookie on future web). This reclaims
    the SAME account across app restart and logout→guest-again on that install.
  - Guest is intentionally EPHEMERAL on uninstall at launch — no silent platform
    anchor yet. A reinstalled guest is a new account unless a provider was linked.
  - Reinstall-survival, cross-device, cross-platform, and web all require a
    LINKED provider (Google works everywhere; Apple covers iOS + web + Android
    via web flow). Linking upgrades the same row in place (id + progress kept).
  - Link is nudged at natural moments (first win / add friend / cross-device /
    purchase), never forced before first play.
Alternatives considered: (a) Device-id-only guest — rejected: no cross-device,
  lost on reinstall with no recovery path. (b) Game Center + Play Games silent
  anchors now — deferred: real integration cost, better post-launch.
Tradeoffs: An unlinked guest who uninstalls loses progress; accepted, mitigated
  by the link nudge. Buys a far simpler launch auth surface.
Consequences: Schema migration — allow auth_provider='guest' and replace the
  single-column UNIQUE(provider_id) with a composite UNIQUE(auth_provider,
  provider_id). New endpoints: guest login, link-in-place. Refresh-token
  issuance + secure client storage. The provider-scoped lookup this mandates
  also closes the account-takeover bug (fixed in the next step).
Supersedes / Related: 083; CONTEXT.md auth rules; INFRA.md security note.

## 085 — Apple token verification + provider-scoped player lookup
Status: Accepted | Date: 2026-07-08
Context: Live authentication bypass confirmed in `AuthService` (flagged
  during Decision 083/084 work): `appleLogin` base64-decoded the identity
  token's payload and trusted `sub` with zero signature verification (no
  library installed); `findOrCreatePlayer` looked up existing players by
  `providerId` alone, not `(authProvider, providerId)`. Combined, a forged
  Apple token whose fake `sub` matched a real Google user's `providerId`
  logged the attacker in as that player — full account takeover.
Decision: `appleLogin` verifies the identity token's signature against
  Apple's live JWKS, checks `iss === 'https://appleid.apple.com'`, `aud`
  against `APPLE_CLIENT_ID` from config (never hardcoded), and expiry, via
  `jose` (pinned `^5.10.0` — v6 is ESM-only, breaks this project's
  CommonJS build). `findOrCreatePlayer` now queries by the composite
  `(authProvider, providerId)`, matching Decision 084's identity model.
  `players.provider_id`'s single-column `UNIQUE` (migration 001) is
  replaced with a composite `UNIQUE(auth_provider, provider_id)`
  (migration 010) so the database enforces the same invariant the
  application code does.
Alternatives considered: `apple-signin-auth` (a higher-level library
  wrapping the same verification) — rejected: its internals aren't
  independently injectable, so real-signature test coverage would need
  either HTTP-mocking Apple's JWKS endpoint (heavier, more brittle) or
  testing against a mock instead of real cryptographic verification.
  `jose`'s explicit JWKS-resolver seam allows genuine signature
  verification in tests against a locally generated test keypair.
Tradeoffs: One new runtime dependency (`jose`) and one new devDependency
  (`@electric-sql/pglite`, an in-memory Postgres-compatible engine) to
  test the composite-lookup fix and the migration's constraint against
  real SQL execution rather than a hand-rolled fake — this codebase had
  zero prior DB-integration-test precedent; this establishes the first one.
  Also required enabling Node's `--experimental-vm-modules` flag for the
  test runner (`backend/package.json`'s `test`/`test:watch`/`test:cov`
  scripts) — pglite's WASM loading needs it; confirmed additive, doesn't
  change how any existing (non-pglite) test runs.
Consequences: `docs/INFRA.md` security note updated to reflect the fix
  landing; `backend/.env.example` and `docker/docker-compose.yml` gain
  `APPLE_CLIENT_ID`. Guest login and link-in-place endpoints (Decision
  084) remain out of scope for this task, as instructed. A pre-existing,
  unrelated bug noticed but not fixed here: Apple only sends `fullName` on
  a user's first-ever authorization, so any sign-in that omits a name
  falls back to a fixed `'Apple User'`/`'Google User'` string, which can
  collide on `players.username`'s UNIQUE constraint — not a regression
  from this fix, tracked here so it isn't lost.
Supersedes / Related: 083, 084 (this is the fix those decisions named as
  a prerequisite/follow-up).

## 086 — Gray-box arrow, cannon, trap tiles (2026-07-12)

Added three signature tiles for playtesting: arrow (movement/push),
cannon (movement/launch), trap (hazard/immobilize). Gray-box only:
each renders as a colored swatch + text label, no art files.

**Why four registry entries per directional tile (arrow_north/south/east/west)?**
Direction is per-tile-instance data, not per-behavior. Encoding direction
in the id keeps TileSchema unchanged and aligns with the existing pattern
(treasureType = tile id). Four entries per type is fine given that the
registry is data, not code.

**Why immobilizedUntilTurn (turn-number threshold) instead of a decrement counter?**
A decrement in advanceTurn fires immediately after applyMove on the same
handler call, reducing the counter to 0 before the trap affects any turn.
A threshold check (turnNumber <= immobilizedUntilTurn) has no mutation
timing issue — it's a pure comparison against current state.

**Spawn weights:** arrow 0.04 total, cannon 0.03 total, trap 0.04.
Combined with coin (0.12) and shield (0.03), ~26% of interior tiles carry
content on a 13×13 board (~37 tiles) — enough to create decisions without
flooding the board.

## 087 — Board rendering: validated_board_rows guard against partial Colyseus state (2026-07-20)

Context: The second device to join a Colyseus room receives an initial
partial state delta — e.g. 67 out of 169 tiles on a 13×13 board.
`BoardCoord.compute_board_rows()` returns `sqrt(tile_count)`, so 67 tiles
returns 8 (not 13). Every tile was then placed at the wrong TileMapLayer
coordinate, producing a blank or corrupted board that never corrected.
The same defect applied to `FogLayer` (fog cells placed at negative
world coordinates, leaving the board gray instead of rendering black fog).

Decision: `BoardLayer` and `FogLayer` each expose a private
`_validated_board_rows() -> int` that returns the computed row-count only
when `tiles.size() == rows * rows` (a complete square). Until that
invariant holds, `_on_state_initialized()` returns early and
`_on_tile_changed()` skips painting. On the first `tile_changed` call
where the full square has arrived, both layers repaint all tiles at once
and then handle subsequent deltas individually.

**Why check `tiles.size() == rows * rows` rather than comparing to a known size?**
The client never knows the map size in advance (it's server-authoritative).
The square-completeness check is the only invariant derivable from the
data itself, and it holds for all supported board sizes (7, 9, 11, 13,
15, 17 per GDD).

Consequences: `CameraController._try_set_initial_camera()` has the same
`board_rows < 7` guard for the same reason — camera initialisation
deferred until a valid board is present.

## 088 — Camera pan clamping: board-fits-in-viewport centres instead of clamps (2026-07-20)

Context: On the emulator (landscape 2856×1280), a 13×13 board at zoom
max_zoom (≈2.8) is smaller than the viewport. Without clamping, panning
to the own-units centroid (e.g. world y=384 for the bottom player) placed
the camera outside the board, showing mostly gray background.

Decision: `CameraController._clamp_to_board()` computes
`half_view = viewport_size * 0.5 / zoom.x`. When `half_view >= board_size * 0.5`
(the board fits entirely in one dimension), the camera is force-centred on
that dimension instead of clamped. When the board is larger than the
viewport, standard `clamp(target, half_view, board_size - half_view)` applies.
GDScript ternary inference was avoided by using explicit typed `float`
variables with `if/else` blocks (Godot 4.6.3 treats `var x := A if C else B`
as Variant when both branches are float, which is a parse error under
warnings-as-errors).

**Why not clamp to fixed margins?**
Fixed margins assume a known board/viewport ratio. The board size is
server-authoritative and the viewport varies by device. The half-view
test is dimension-agnostic and works for any legal board size and zoom level.

Consequences: `_tween_pan()` always calls `_clamp_to_board()` before
starting the pan tween. Double-tap zoom cycle (Decision 025) already
calls `_recompute_zoom_bounds()`, so zoom transitions never require
separate clamp logic.

## 089 — Portrait lock, HUD safe-area margins, exit button (2026-07-21)

Decision: Three related housekeeping fixes shipped together.

1. **Portrait lock:** Added `[display]` section to `godot/project.godot`:
   - `window/handheld/orientation=1` (DisplayServer.SCREEN_PORTRAIT)
   - Design viewport 720×1280 (9:16 portrait, standard mobile)
   - `window/stretch/mode="canvas_items"`, `window/stretch/aspect="keep"`
   Without this section, Android defaulted to landscape (orientation 0),
   causing the End Turn button to render off-screen on emulators.

2. **HUD safe-area margins:** Adjusted CanvasLayer control offsets in Hud.tscn
   so no element sits within the OS-reserved zones:
   - Top: 80px (covers status bar + notch)
   - Bottom: 100px (covers home indicator / nav bar)
   - Sides: 40px (covers rounded display corners)
   Coordinates are in the 720×1280 design space; canvas_items stretch scales
   them proportionally to any device resolution.

3. **Exit button:** Added ExitButton to Hud.tscn (top-right corner, 100×48px
   at design resolution, anchored top-right). `_on_exit_pressed` in hud.gd
   calls `GameFlow.to_main_menu()`, which already calls
   `NetworkManager.disconnect_from_match()` before changing scenes. This
   ensures the Colyseus room is cleanly left before the main menu loads.
   No new autoload or scene-change logic was added — the existing
   GameFlow path is reused.

Reason: Emulator playtest revealed the orientation bug. Safe-area and exit
button are the minimum HUD scaffolding needed before an in-person 2-device
playtest (memory: in-person 2-device playtest is the done-gate).
Security: neutral. No server interaction added.
