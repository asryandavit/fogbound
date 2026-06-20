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

---

## Backlog (build-useful order)

### 1. ☐ Match screen — portrait phone
Keystone layout everything else references. Top bar / board / action strip
per DECISIONS 031, showing the locked fog model (shared, step-only, amber
fog edges). Gray-box, no art. Feeds build task GC6 (HUD) + GC3 (board).

### 2. ☐ Core interaction flow
Select explorer → valid-move tints (blue/yellow/red, GDD UX Patterns) →
pick target → confirm / Undo → End Turn. Formalize the GDD prose into an
explicit step-by-step. Feeds GC5 (input) + GC6.

### 3. ☐ Explorer inspection
Mini-card contents when tapping own vs. opponent explorer — cashes out the
full-transparency rule (DECISIONS 050): position, coins, gems, bag, Shield.
Feeds GC4 (explorers) + GC6.

### 4. ☐ Pre-match flow
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

### 8. ☐ Tablet landscape layout
Adapt the persistent left panel from DECISIONS 031 for tablet.

---

## Out of scope for this thread
Producing tile art and assets (Midjourney / Recraft). This thread defines what
gets built and how it behaves, not the painted pixels.
