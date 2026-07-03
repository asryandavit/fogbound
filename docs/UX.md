# FOGBOUND — UX & Player Experience

Design-thread tracker for the player-facing experience. Mirrors docs/AGENT.md
(which tracks the build sprint). Locked decisions live in docs/DECISIONS.md;
game-mechanic truth lives in docs/GDD.md. This file holds interaction flows,
screen specs, and the running design backlog.

**Final goal of the design thread:** specify the player-facing experience
thoroughly enough — across GDD.md, this file, and DECISIONS entries — that the
Godot build thread can render the match and its surrounding screens without
returning for design clarification. "Done" = the design covers what build tasks
GC3–GC7 (board/fog, explorers, input, HUD, camera) and the flow around a match
need.

**Territory:** this thread edits GDD.md, UX.md, and DECISIONS. It does NOT edit
code, ARCHITECTURE.md, GODOT_CLIENT.md, or AGENT.md (build-thread files).

**Status key:** ☐ not started · ◐ in progress · ☑ designed + documented

---

## Settled this far

- ☑ Fog-of-war model — shared fog, step-only reveal, full explorer transparency
  (DECISIONS 050; GDD "Fog of War")
- ☑ Screen orientation — phones portrait-locked, tablets both / landscape default
  (DECISIONS 020; GDD "HUD Layout"). Confirmed, not re-opened.
- ☑ Future features parked — single-player vs AI, AI coach, voice input
  (GDD "V1 vs V2 Scope" → Future / Exploratory)
- ☑ Match screen — board-first floating HUD, portrait + landscape
  (DECISIONS 051; GDD "HUD Layout")
- ☑ Tile reveal feedback animation + disable toggle (DECISIONS 052)
- ☑ Device-local settings: audio + motion prefs stored on device (DECISIONS 053)
- ☑ Visual + UX reference targets: Polytopia, Civilization, Into the Breach
  (GDD "Visual Identity"); zoom-to-detail (GDD "Camera Behavior")
- ☑ Explorer inspection — full-transparency card, own vs opponent, with
  adjacent-combat preview (DECISIONS 055; GDD "UX Patterns")
- ☑ Pre-match flow — quick/custom lanes, map-size-driven options, four-step
  spine (DECISIONS 056; GDD "Players and Bases")
- ☑ Base placement — sequential, live reveal, DB-configurable per-pick timer,
  miss-your-turn on timeout, default spawn for missed placement; simultaneous
  parked as a future game type (DECISIONS 056)
- ☑ Anti-camping — only delivered treasure scores; idle explorers stay
  attackable (DECISIONS 057; GDD "Scoring")

---

## Backlog (build-useful order)

> **Paused for First Playable (Decision 058).** Items 5-7 stay parked until the
> gray-box GC2-GC7 milestone ships and is playtested. Design resumes after, guided
> by real match feedback.

### 1. ☑ Match screen — portrait phone
Keystone layout everything else references. Top bar / board / action strip
per DECISIONS 031, showing the locked fog model (shared, step-only, amber
fog edges). Gray-box, no art. Feeds build task GC6 (HUD) + GC3 (board).

### 2. ☐ Core interaction flow
Select explorer → valid-move tints (blue/yellow/red, GDD UX Patterns) →
pick target → confirm / Undo → End Turn. Formalize the GDD prose into an
explicit step-by-step. Feeds GC5 (input) + GC6.

### 3. ☑ Explorer inspection
Mini-card contents when tapping own vs. opponent explorer — cashes out the
full-transparency rule (DECISIONS 050): position, coins, gems, bag, Shield.
Feeds GC4 (explorers) + GC6.

### 4. ☑ Pre-match flow
Match setup (map size, player count, timer — DECISIONS 030) → base placement
(DECISIONS 018, currently undesigned) → match start.

### 5. ☐ Combat & treasure feedback
Combat resolution, treasure collection, base-return scoring. Largely drafted
in GDD UX Patterns — review, tighten, consolidate here.

### 6. ☐ Supporting screens
Main menu, lobby, settings, results / victory.

### 7. ☐ Onboarding, discovery popups & Tilepedia
First-run experience; severity-tiered discovery popups + Tilepedia
(DECISIONS 027).

### 8. ☑ Tablet landscape layout — folded into Decision 051
Adapt the persistent left panel from DECISIONS 031 for tablet.

### Open flags (build / mechanics thread)
- Per-pick placement timer values per (game type × board size) — tune after
  playtest (Decision 056).
- AI bot to handle placement + idle in-match moves — supersedes v1
  miss-your-turn behavior once built (Decisions 003/011/056).

---

## Out of scope for this thread
Producing tile art and assets (Midjourney / Recraft). This thread defines what
gets built and how it behaves, not the painted pixels.
