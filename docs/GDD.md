# FOGBOUND — Game Design Document

---

## Table of Contents

1. [Game Overview](#game-overview)
2. [Board](#board)
3. [Fog of War](#fog-of-war)
4. [Players and Bases](#players-and-bases)
5. [Movement](#movement)
6. [Inventory](#inventory)
7. [Combat](#combat)
8. [Scoring](#scoring)
9. [Win Conditions](#win-conditions)
10. [Turn Timer](#turn-timer)
11. [Tile Library](#tile-library)
12. [HUD Layout](#hud-layout)
13. [Camera Behavior](#camera-behavior)
14. [UX Patterns](#ux-patterns)
15. [Visual Identity](#visual-identity)
16. [V1 vs V2 Scope](#v1-vs-v2-scope)

---

## Game Overview

- **Genre:** Turn-based multiplayer strategy mobile board game
- **Core Loop:** Explorers navigate fog-covered islands collecting gems and coins
- **Players:** 2 to 4 players per match
- **Victory:** Player with the most points wins

---

## Board

| Property           | Details                                   |
| ------------------ | ----------------------------------------- |
| **Map Sizes**      | 7×7, 9×9, 11×11, 13×13, 15×15, 17×17      |
| **Starting State** | All tiles face down at start (Fog of War) |

### Terrain Types

| Terrain | Notes   |
| ------- | ------- |
| Grass   | Neutral |
| Jungle  | —       |
| Sand    | —       |
| Water   | —       |
| Ice     | —       |
| Desert  | —       |

---

## Fog of War

### Reveal Model — Shared

- The board starts entirely face-down (every tile is fog).
- Fog is **shared**: there is one board state for the whole match. The
  moment any explorer reveals a tile, that tile is face-up for **every**
  player. There is no private, per-player vision in v1.
- Start exception: each player's entire starting row/column is revealed
  at game start (see Players and Bases).

### Reveal Trigger — Step-Only

- A tile flips from fog to face-up **only when an explorer moves onto it.**
- Adjacent tiles are **not** auto-revealed.
- A fog tile next to a revealed tile shows an amber edge tint (see
  UX Patterns → Explorer Selection): the player can see *that* an unknown
  tile is there, but not *what* it is, until someone steps on it.
- Strategic consequence: scouting unknown ground is a deliberate risk.
  The first explorer into the dark takes whatever the tile holds; others
  may choose to follow into already-revealed, known tiles.

### Explorer Visibility — Full Transparency

- Because explorers always stand on revealed tiles, **every explorer's
  position is visible to all players.**
- A player may inspect any explorer — their own or an opponent's — and see
  its full public state: position, coins, gems, treasure bag, and
  **Shield status.**
- Combat is therefore a game of full information: with the rule "attacker
  wins unless the defender holds a Shield," players always know whether an
  attack is safe. Depth lives in positioning, tempo, and whether a
  treasure-carrier keeps its Shield up.

> V2 direction: private per-player fog and hidden Shield status (combat
> bluffing). Deferred — requires server-side per-player state filtering
> (see DECISIONS 049, 050), never a visual-only hide.

---

## Players and Bases

### Starting Positions

- Players start on one side of the map (see Player Side Assignment).
- Before the match, each player chooses their base position along their own
  side. Placement is sequential with live reveal — players place in turn
  order and each placement is visible to all as it locks, so later players
  can react (Decision 056).
- Per-pick timer is configurable by game type and board size (stored in DB),
  baseline ~10s. If a player does not place in time, they miss placement and
  receive a default spawn at the centre of their side at match start.
- The entire starting row/column is revealed at start; no treasure sits on
  starting row/column tiles.
- Explorers spawn at the chosen (or default) base position.
- Simultaneous placement (all at once, revealed together) is a parked future
  game type, selectable in Custom setup once built (Decision 056).

### Player Side Assignment

| Players   | Sides Used                      |
| --------- | ------------------------------- |
| 2 players | Opposite sides — top and bottom |
| 3 players | 3 sides                         |
| 4 players | All 4 sides                     |

### Base Types

Base appearance depends on map theme:

- **Water maps:** Ship
- **Land maps:** Train, Car, Airplane, etc.

### Base Movement Rules

- Moving the base costs the player their **entire turn**
- Base can only move along the player's own side

### Explorers per Player

| Map Size              | Explorers   |
| --------------------- | ----------- |
| Small — 7×7, 9×9      | 1 explorer  |
| Medium — 11×11, 13×13 | 2 explorers |
| Large — 15×15, 17×17  | 3 explorers |

---

## Movement

- **Speed:** 1 tile per turn
- **Directions:** Up, Down, Left, Right only
- **Diagonal movement:** Only via special tiles
- **Reveal:** moving onto a fog tile flips it face-up — step-only (see Fog of War)

### Tunnel Rules

- Explorer enters tunnel; if only one exit is open, explorer is **trapped** until the second exit is discovered
- When the second exit is found by anyone, **both explorers swap positions immediately**
- **No combat inside tunnels — ever**

---

## Inventory

### Default Capacity

- Max **3 coins** + max **1 other item**

### Treasure Bag

| Rule                  | Detail                                                                |
| --------------------- | --------------------------------------------------------------------- |
| **Ownership**         | Bag belongs to 1 explorer only                                        |
| **Capacity with bag** | Max 5 coins + max 2 other items                                       |
| **On delivery**       | Bag disappears when explorer carries treasure back to base            |
| **On attack**         | Explorer drops all treasure, bag disappears, explorer returns to base |

---

## Combat

- **Attacker always wins**
- **Exception:** If the defender carries a Shield, the defender wins
- **On loss:** Loser returns to base and drops **all** treasure on that tile

### Loot Rules

| Combat Type     | Dropped Treasure                                           |
| --------------- | ---------------------------------------------------------- |
| Close combat    | Winner takes all dropped treasure immediately              |
| Distance combat | Treasure stays on the tile; anyone entering can collect it |

---

## Scoring

- Treasure scores ONLY when an explorer carries it back to its base.
  Treasure held in the field at match end does not count (Decision 057).
- The player with the most delivered treasure (points) wins.
- Anti-camping: because only delivered treasure scores and idle explorers
  remain attackable, sitting still to protect a lead does not work — a
  camped, loaded explorer is an exposed target. An explorer that loses combat
  drops all carried treasure onto the board and returns to base (see Combat).
  A missed turn therefore does nothing on its own and needs no extra penalty.

---

## Win Conditions

Win conditions are **configurable per map**:

- **Time limit runs out** — implemented as a turn cap (`maxTurns`, default 300;
  0 = unlimited). When `turnNumber` reaches the cap the match ends and the
  score leader wins (deterministic tiebreak). Turn-based rather than wall-clock
  so it is fair and reproducible. This ALSO acts as a universal termination
  backstop: it is checked before any other win condition, so a match can never
  run forever even under `all_treasure` if treasure is left uncollected
  (Decision 073).
- **All treasure has been carried to bases** — implemented (`all_treasure`, the
  default). Ends when no tile holds treasure and no explorer is carrying any;
  highest banked score wins.
- **A player reaches a points target that others cannot beat** — rule defined
  (`score_target` in `checkWinCondition`), but the `scoreTarget` value is not
  yet wired through the schema/room, so it is not selectable in a live match yet.

---

## Turn Timer

- Configurable per map and difficulty level
- When the timer expires, the game **auto-selects the safest legal move**

---

## Tile Library

**48 tile types across 6 categories**, released across 3 tiers.

Implementation note (Decision 081): tiles are built as server-side data
records (id/category/behavior/spawn weight), not one hardcoded rule per
tile — see docs/TILES.md. This page defines WHAT each tile is (design);
TILES.md defines HOW the engine represents and reads them (architecture).
Today only Coins and Shields (Tier 1, Treasure/Combat) are implemented.

---

### Tier 1 — Launch Tiles (20 tiles)

| Category  | Tiles                                          |
| --------- | ---------------------------------------------- |
| Treasure  | Coins, Gems, Legendary Relic                   |
| Movement  | Tunnel, Boat, Plane                            |
| Terrain   | Jungle, Quicksand, Ice, Desert                 |
| Combat    | Sword, Shield, Cannon                          |
| Structure | Ancient Ruins, Watchtower, Camp                |
| Events    | Fog Storm, Earthquake, Gold Rush, Trading Post |

---

### Tier 2 — Update Tiles (14 tiles)

| Category  | Tiles                                 |
| --------- | ------------------------------------- |
| Treasure  | Gold Bar, Treasure Chest, Ancient Map |
| Movement  | Horse, Catapult, Teleport             |
| Terrain   | Swamp, Volcano, Oasis                 |
| Combat    | Bear Trap, Mercenary                  |
| Structure | Temple, Market, Spy                   |

---

### Tier 3 — Update Tiles (14 tiles)

All remaining tiles from the full library.

---

### Full Tile Library (48 types)

| Category      | Tiles                                                                                                       |
| ------------- | ----------------------------------------------------------------------------------------------------------- |
| **Treasure**  | Coins, Gems, Gold Bar, Legendary Relic, Ancient Map, Treasure Chest                                         |
| **Movement**  | Tunnel, Plane, Boat, Horse, Catapult, Secret Path, Teleport                                                 |
| **Combat**    | Ambush, Cannon, Bear Trap, Sword, Shield, Sniper Tower, Mercenary                                           |
| **Terrain**   | Jungle, Quicksand, Ice, Desert, Volcano, Swamp, Avalanche, Oasis                                            |
| **Structure** | Ancient Ruins, Watchtower, Camp, Fortress, Temple, Market, Prison, Shrine                                   |
| **Events**    | Fog Storm, Earthquake, Gold Rush, Pirates Attack, Rescue Mission, Ancient Curse, Lucky Find, Rival Explorer |
| **Alliance**  | Trading Post, Truce Flag, Spy, Sabotage                                                                     |

---

## HUD Layout

The match HUD is board-first with floating controls (Decision 051). The
board fills the screen edge to edge; all HUD elements float over it on a
CanvasLayer. This applies to both portrait (phone) and landscape (tablet) —
the layout language is the same, only control placement adapts.

### Shared elements
- No top bar. A small translucent turn banner floats at the top of the
  board (current player + turn number) — on-map messaging.
- Player score labels float on the board near each base (e.g. "You",
  "Rival").
- Floating circular controls in the thumb zone: Menu, Stats, End Turn.
  End Turn is the gold primary action, under the dominant thumb.
- Explorers are selected by direct tap — there is no "Select explorer" button.
- Undo is contextual: it appears only while a move is pending or just made,
  then disappears. Undo capability is non-negotiable; only the persistent
  button is gone.
- No minimap for ≤13×13 (zoomed-out view is the minimap); toggleable
  minimap for 15×15 / 17×17.

### Portrait (phone)
Controls sit along the bottom edge, End Turn under the right thumb.

### Landscape (tablet)
Same floating language. The square board sits centered as an island;
utility controls (Menu, Stats) in one bottom corner, End Turn in the other.
The surrounding space is used for atmosphere (sea/fog) and for contextual
panels — explorer inspection and tile detail — that slide in on demand,
not as permanent chrome.

### Messaging
- On-map: transient banners (turn changes, events) float over the board.
- Match start: a brief full-screen welcome / objective overlay on first
  entering a match; auto-dismiss or tap to clear.

---

## Camera Behavior

- **Zoom type:** continuous pinch (not discrete steps)
- **Formula:** `orthoSize -= pinchDelta * 0.5f * orthoSize` (exponential feel)
- **Lerp speed:** 12/sec to target
- **Pinch pivot:** midpoint of two fingers (not screen center)
- **Ignore deltas under:** 2px
- **Min zoom:** entire board visible with 10% padding
- **Max zoom:** 5×5 tiles visible
- **Default on match start:** midpoint of min/max, centered on player's starting row
- **Double-tap:** 3-level cycle — fit-to-screen → default → close (5×5 centered on tap), 350ms EaseInOutCubic
- **Zoom-to-detail:** the closest zoom level (≤5×5 tiles) is the detail view — a tile and its immediate neighbours at full art detail. Zoom transitions are smooth tweens (Godot create_tween). See Decision 025.
- **Auto-pan on YOUR turn start:** yes — pan only, no zoom, 450ms EaseOutQuad, only if explorers are off-screen
- **Auto-pan on manual selection:** NO
- **During opponent turns:** static — never follow opponent moves (fog-integrity rule)
- **Opponent reveals inside your vision:** pulse the tile without panning
- **Edge behavior:** elastic rubber-band, 40px max pull, 250ms EaseOutElastic snap-back

---

## UX Patterns

### Explorer Selection

Tap an explorer → valid destination tiles tinted blue (#3B7A98, 45% alpha). Fog-boundary neighbors tinted yellow (unrevealed). Enemy tiles tinted red (combat warning). Tap destination → pending state → confirm via primary button or auto-commit after 300ms (configurable in settings). Undo always available until End Turn.

### Explorer Inspection

Tapping any explorer — your own or an opponent's — opens the same card with
identical fields (full transparency, Decision 050): Coins (held / capacity),
Items (other treasure held / capacity), Bag (treasure bag held or not), and
Shield (held or not).
- Your explorer: actionable — board move tints are live; the footer hints the
  next step.
- An opponent: read-only inspect — tagged "INSPECT", no move tints, no actions.
- Adjacent-combat preview: if one of your explorers is orthogonally adjacent
  to the inspected opponent, the card resolves the outcome — "attack wins"
  (no Shield) or "you'd lose — shielded" (has Shield), per Combat rules. This
  is the core payoff of full transparency: read an attack at a glance.
- Bot badge: a bot-controlled explorer shows the AFK/bot badge (Decision 029).
- No HP (combat is deterministic — Shield is the only modifier) and no
  "moves remaining" (one action per turn, Decision 054).
- Style: dark translucent HUD card over the board; parchment popups (#F4E4BC)
  are reserved for full-screen discovery / Tilepedia.

### Tile Discovery Popups

- **6 category-intro popups** fire once per save (first reveal of any tile in that category). Categories: Treasure, Movement, Combat, Terrain, Structure, Events.
- **~15 landmark-tile popups** for unique/major tiles (legendary treasures, major traps, alliance shrines, special movement tiles). The rest share their category intro.
- **Popup spec:** 340×480pt card, centered, parchment `#F4E4BC` over 50% dimmer. Hero art top, 28pt Cinzel Bold title, 14pt Nunito description (60–90 words), optional IM Fell English flavor line. "Skip future tile discoveries" checkbox bottom-left. Primary button bottom-right.
- **Animation:** scale 0.92→1.00 + fade 220ms EaseOutBack. Dismiss 180ms EaseInCubic.
- **Skip flag persists to save file** — not session. This is a P0 correctness requirement.
- **Tilepedia:** pause menu "?" icon, 6 category tabs, unseen tiles shown as silhouettes with "???".

### Tile Reveal Feedback

When a tile is revealed (permanent, step-only — see Fog of War), it plays a
brief flip/scale animation showing its content — a quick "what happened"
beat (Decision 052). Landmark tiles may add a short auto-zoom emphasis
(ties to Tile Discovery Popups). Players can disable reveal animations via
a device-local setting (Decision 053).

### Settings storage

Audio and motion preferences are device-local — stored on the device, not
synced to the account (Decision 053): sound mute, music mute, haptics,
reduced motion, animation speed, and the tile-reveal-animation toggle.
Adjusting them on one device does not affect another.

### Turn Transition

Active player avatar pulses in top bar. On your turn start: 450ms EaseOutQuad pan if explorers off-screen, parchment banner "Your Turn / Turn N" slides down and auto-dismisses after 1.2s or on tap. Async mode: opponent's full turn replays as a 2–3s animation when you open the game.

### Combat Resolution

Attacker tile glows green, defender tile glows red. Pre-combat card: "Attacker wins unless Shield." 600ms zoom-in pulse (15% tighter, snap back), clash SFX + medium haptic. Loser's explorer fades out 300ms with particle burst. If defender had Shield: shield icon rises and deflects with metallic clang.

### Treasure Collection

Coin/gem arcs from tile to inventory slot (400ms parabolic PrimeTween). Coin-jingle SFX, light haptic, small particle burst from source tile. Inventory counter flashes gold and increments. If inventory is full: pickup bounces back with muted "denied" SFX and floating "Inventory Full" label.

### Base Return / Scoring

Crossing onto base with inventory → 1.2s brass fanfare, scoring items float from inventory to score counter along curved path. Counter digits roll. Base tile pulses player color. If player is now winning: small crown icon appears on top-bar avatar.

### End of Match / Victory

Slow-motion zoom on winning explorer's base. Orchestral stinger. Confetti in player color. Replay of winning move or final score tiles flying in one by one. Results screen: final scores, MVP highlight, rematch + share + return-to-lobby. Match log persisted for post-game review.

---

## Visual Identity

Art direction rules live in docs/ART.md — that file is the single source of
truth for style, and it governs anything below that touches how art looks.

### Color Palette

| Role | Hex | Usage |
|---|---|---|
| Deep Fog Blue | `#2C3E50` | Fog overlay, backgrounds |
| Treasure Gold | `#D4A24C` | Primary actions, score, highlights |
| Harbor Teal | `#3B7A98` | Valid-move tint, UI accents |
| Explorer Leather | `#8B5A3C` | Explorer units, wood UI elements |
| Parchment Cream | `#F4E4BC` | Card backgrounds, popups |
| Jungle Green | `#7FB069` | Terrain category tiles |
| Crimson Flag | `#C84B31` | Combat/danger tiles |
| Mist White | `#E8DCC4` @ 40% alpha | Fog of war overlay |

Gold-on-fog contrast is 7.8:1 (WCAG AAA). Jungle/Crimson pair is colorblind-risky — all tile categories must also be distinguishable by icon and pattern, not color alone.

### Typography

| Role | Font |
|---|---|
| Display titles, tile names | Cinzel Bold |
| Game logo only | Cinzel Black |
| All body and UI text | Nunito Regular / SemiBold / Bold |
| Flavor quotes, journal entries | IM Fell English (sparingly) |

Avoid Inter (feels SaaS). Avoid Cormorant for body (hairlines crush on phones). Mandate dynamic text scaling — tiny touch targets are a top Wingspan App Store complaint.

### Art Style

Painted semi-flat with depth. Reference: Sea of Thieves × Slay the Spire × Monument Valley. Warm painted textures, clean readable silhouettes, subtle rim lighting on selected tiles. Unity 6 URP 2D Renderer with baked normal maps. One mid-level illustrator scope. 512×512 source art rendered at 128pt.
Visual + UX reference targets: The Battle of Polytopia, Civilization, and Into the Breach — for clarity, clean floating HUD, and satisfying feedback. Note: those games are isometric; FOGBOUND is flat top-down square (Decision 021) — we borrow their HUD and feel, not the projection. Tile art is authored at the 512² source resolution above specifically so it stays crisp at the closest zoom-to-detail level; all tile assets must be produced with that zoom in mind.

### Iconography

Semi-flat with depth, 2px minimum line weight, 3px container radius, 24pt base grid. Aesthetic: "hand-etched on leather, touched up with gold ink." SVG via `com.unity.vectorgraphics`. Slightly imperfect outlines — hint of woodcut.

### Audio

Orchestral-folk hybrid. Instruments: strings, acoustic guitar, pan flute/tin whistle. Reference tracks: Sea of Thieves "Maiden Voyage," Sid Meier's Pirates! theme, Civ VI "Sogno di Volare," Return of the Obra Dinn. Tile reveal SFX = paper-crinkle + muted timpani. Treasure = coin jingle + 1.2s brass fanfare. UI taps = thocky paper-click. 6–8 track original score (main theme, match loop, tension stinger, victory fanfare, menu, ambient biome tracks). No voice acting at v1.

### Accessibility

- WCAG AA contrast minimum, AAA on primary text
- Dynamic Type support
- Reduced motion toggle in settings
- Colorblind modes: Protanopia, Deuteranopia, Tritanopia
- 48pt minimum touch targets on phone, 56pt on primary actions

---

## V1 vs V2 Scope

### Must Ship in V1 (Launch-Blocking)

**Gameplay:** square grid 7×7–17×17, 2–4 players, 1/2/3 explorers by map size, 4-directional movement, 48 tile types (ship Tier 1 + Tier 2 at minimum), coin+gem inventory 3+1, combat with Shield override, base return scoring, all win conditions.

**Architecture:** ICoordinate/IGrid abstraction, ScriptableObject tile definitions, pure-C# Model layer, VContainer DI, PrimeTween, Cinemachine 3 camera, Addressables, New Input System multitouch, Colyseus room + schema sync, Cloud Save, Unity Localization (English only).

**UI:** portrait on phone + landscape on tablet, context-morphing primary button, Undo, End Turn, explorer selection tints, 6 category discovery popups, Tilepedia, animation-speed slider, discovery-popup toggle, reduced-motion mode, colorblind filters, haptics toggle.

**Multiplayer — launch order (Decision 080):** near-zero-concurrency formats
ship first — (1) solo vs bot [done], (2) async friend play via room codes
(24h default, 60s–7 days configurable turn timer), (3) daily-seed challenges
(same generated board for everyone that day, compared via leaderboard, no
opponent pairing needed). Real-time random matchmaking (queueing to be
matched with a stranger) is deferred until there's population to draw
from — see docs/MARKETING.md for the liquidity math. This does NOT remove
realtime PvP as a mode: direct vs-Player matchmaking already works
(Colyseus `join_or_create`); what's deferred is *promoting* it as the
primary way to find a match. Bot takeover after 3 missed turns with visible
badge, push notifications (P0 QA — needed for async; see docs/INFRA.md for
the concrete gap), pass-and-play all still apply regardless of format.

### Deferred to V2

Hexagon maps, triangle maps, bag expansion tuning (3+1→5+2), alliance mechanic animation polish, additional 12–15 landmark tile popups, cross-platform Steam port, Switch port, foldable Flex Mode, MFi/controller support, replays/share gifs, clan/guild systems, ELO ladder, legendary foil shader, spectator mode, season pass cosmetics, weekly event boards.

**Promoted to V1 (Decision 080):** daily puzzle mode — reframed as
"daily-seed challenges" and moved out of this list into the Multiplayer
launch order above. It's a zero-concurrency format (no opponent needed),
exactly the kind of thing Decision 080 wants shipping first, not deferred.

**Never (any version):** energy systems, gacha, pay-to-progress, card-level power tiers.

### Future / Exploratory (post-launch — captured, not yet designed)

- **Single-player vs AI:** reuses the server-side MCTS bot (Decisions 003,
  011) wrapped in a solo match flow. Same engine that fills in for
  disconnected players — mostly UI, not new AI.
- **AI move help / coach:** optional hint surfacing the MCTS bot's
  recommended move, or a tile explanation. Cheapest version piggybacks on
  the bot already being built; natural-language coaching is a larger lift.
  Integrity rule: hints in single-player and practice ONLY — never ranked
  or competitive (an AI advisor in ranked is cheating; same spirit as the
  camera fog-integrity rule, Decision 025). Any helper must use only the
  asking player's visible state — trivial under the current shared +
  full-transparency fog model (Decision 050), mandatory to respect if
  per-player fog lands in V2.
- **Voice input:** framed as accessibility (extends the WCAG / dynamic-type
  / colorblind commitments). Spoken move commands for hands-free or
  low-vision play. Heaviest of the three — needs speech recognition, a grid
  command grammar, disambiguation, and a mic-permission/privacy pass. V2+.

### Design backlog (post-fun-gate)

- **Treasure variety** (from fun-gate v1, 2026-07-22): multiple treasure types
  with different point values (e.g. coin < artifact < chest), mirroring
  tile variety. Rationale: "what's under the next tile" anticipation is the
  core retention hook of fog-of-war games; treasure variety multiplies it.
- **Score visibility:** current scores must be visible during play (HUD),
  since different treasure values make the score state non-obvious.
- **Treasure/carry feedback:** player must SEE that yellow = takeable, that an
  explorer is carrying, and the moment points land at the base.
  (Confirmed rule from v1: carry to base scores it, then hunt the next —
  design communicated nothing of this; mechanic itself validated.)
