# FOGBOUND Art Direction

This file is the SINGLE SOURCE OF TRUTH for art direction. The ChatGPT
"FOGBOUND Art" project's LOCKED block is a mirror of this file and must be
re-synced whenever this file changes.

## Status

Phase 1 (art direction foundation) in progress. Rules below are locked unless
marked provisional. Production art is gated behind fun-gate v2 per the roadmap.

## Core style rules (locked)

- Flat 2D top-down. Flat color fills, maximum two shade steps per object (base
  tone + one darker shadow tone). No gradients, no specular highlights, no
  painted rendering, no low-poly faceting, no drop shadows as style.
- Not isometric, not 3D.
- One camera angle across every asset: top-down with a slight forward tilt
  (~15°).
- Silhouette-first: every object must be recognizable by outline alone at 55px,
  and must remain distinguishable in grayscale. Internal detail is subordinate
  — it enriches when zoomed in, never carries recognition.
- Reference feel: The Battle of Polytopia, Into the Breach.
- One polished classic island/pirate theme at launch; theme system architected
  for expansion. Premium/no-gacha product — art reads polished-indie, never
  casino.

## Asset authoring (locked)

- ONE asset per object, no zoom-LOD, no swapped sprites at zoom thresholds.
  Rationale: dual-TileMapLayer rendering (Decision 047) would require two
  atlases or a visible pop; cost is not justified pre-launch.
- Author at 4× target resolution (~256px for a 64px tile) so downscale stays
  crisp and zoom-in reveals genuine detail.
- Visual richness lives in the explorer inspection card (UI, seen large), not on
  board sprites. Board stays sober and readable.

## Treasure (locked — see Decision 102, treasure placement)

- Treasure is CONTENT on a tile, never a terrain type; placeable on any walkable
  terrain.
- Renders as an object at ~60% cell area with a contact shadow, so it reads as
  sitting ON the ground rather than being the ground.
- Every treasure has a dark anchoring element (coin: dark rim; artifact: dark
  plinth; chest: dark iron banding).
- Treasure must read LIGHTER than its terrain in grayscale.
- Tier by silhouette: coin = circle, artifact = stepped angular, chest = banded
  rectangle. Shared warm gold/amber family so they read as one visual class.
- Provisional, decide after statics: subtle idle shimmer as a "takeable"
  attention cue.

## Terrain (binding constraint)

- Terrain is muted and desaturated, darker in value than treasure.
- No terrain may be light enough or busy enough to break treasure legibility.
  Terrain is a backdrop for objects sitting on it.

## Fog (core mechanic)

- Unrevealed tiles must read as "unknown" instantly, without explanation. Fog
  treatment is phase 2 work; contrast against revealed terrain is the pass/fail
  criterion.

## Players

- Each player has a color identity applied to base ship, explorers, and
  highlights. Must remain distinguishable at 55px and in grayscale.

## Design track phases

1. Art direction foundation (this file's core) — in progress
2. Board system: terrain set, fog treatment, reveal states, water frame
3. Pieces: explorers, base ships, player color identities
4. HUD/UI kit: turn indicator, score, buttons, inspection card, fonts
5. Identity: logo/wordmark, app icon, store screenshots
6. First-session clarity pass (runs against real builds — last)

## Working model

- ChatGPT Project "FOGBOUND Art" is CONCEPT HANDS ONLY. It proposes; it never
  decides.
- Its output is marked "proposed" and is locked here before it counts.
- Whenever this file changes, re-sync the ChatGPT project's LOCKED block from it.
- Nothing ChatGPT generates ships as a final asset; concepts set direction,
  finals are produced separately once the pipeline decision is made (end of
  phase 1).
