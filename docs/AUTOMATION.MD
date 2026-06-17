# FOGBOUND — Automation & Godot Parallel-Build Plan

> Save to `docs/AUTOMATION.md`. This describes (1) the spec-anchored, low-copy-paste build loop and (2) how to stand up `godot/` alongside the frozen Unity `game/`.

## Decisions locked this session
- **Godot version: 4.6.3 stable** (the current stable release). Do NOT use 4.7 release candidates (rc1/rc2/rc3) — "rc" means pre-release/under-test, not production-ready. Revisit 4.7 only after it ships as plain `4.7-stable`, and upgrade deliberately at a safe point, never mid-spike. Standard GDScript build, not the .NET build.
- **Godot client language: GDScript** — thin renderer, best AI support, native Colyseus SDK (pin 0.17.7 = your server version). Fallback if schema callbacks prove flaky: C# SDK on .NET Godot.
- **Folder strategy:** `game/` (Unity) becomes a frozen fallback, never modified. `godot/` is built fresh in parallel.
- **Approach:** fresh rebuild against the GDD + DECISIONS, not a code port. The docs are the spec; Godot builds against them.
- **Integration boundary is unchanged:** `godot/` talks to the same Colyseus `fogbound_room` with the same `FogboundState` schema. The generated C# schema in `game/.../Network/Schema/` is the reference for the GDScript schema.

---

## Part 1 — The anti-drift, low-copy-paste loop (your real "automation")

The goal: Claude always has FOGBOUND's logic in front of it, builds in small approved chunks, and runs commands itself instead of handing them to you. Seven mechanisms:

**1. `CLAUDE.md` as the always-loaded anchor.** It auto-loads every session. Make it (a) hard-link the canonical docs so they're always in context, and (b) embed the non-negotiables from CONTEXT.md verbatim so they can't drift:
```
## Source of truth — read before any task
@docs/CONTEXT.md
@docs/DECISIONS.md
@docs/GDD.md
@docs/AGENT.md   (current sprint only)

## Non-negotiable architecture rules (never violate)
- Client is a PURE RENDERER. All game logic lives on the Colyseus server.
- Every player action is validated server-side before applying.
- Active client work happens in godot/. NEVER modify game/ (frozen Unity fallback).
- Any new architectural choice is checked against DECISIONS.md and appended there.
```

**2. Upgrade your `/sprint` command** (the heartbeat). Put this in `.claude/commands/sprint.md` so typing `sprint` always runs the same anchored ritual:
```
1. Read CLAUDE.md, docs/CONTEXT.md, docs/DECISIONS.md, and the current
   sprint section of docs/AGENT.md.
2. Identify the next uncompleted task.
3. ANTI-DRIFT CHECK: state the task, then list the specific Decision numbers
   and GDD sections that govern it. If the task conflicts with any decision,
   STOP and ask before proceeding.
4. Enter Plan Mode. Propose the implementation, citing those decisions.
5. STOP for my approval.
6. On approval: implement ONLY that task.
7. Run the relevant tests. Report what changed + test results in plain language.
8. STOP for my approval before marking the task done in AGENT.md and continuing.
```

**3. Plan Mode gates (Shift+Tab → plan).** No code is written until you approve the plan. This is the "small chunks, don't go the wrong direction" guarantee, built into Claude Code.

**4. Two review subagents** (`.claude/agents/`), run before any task is marked done:
- *Spec-compliance reviewer* (read-only): checks the diff against DECISIONS.md + GDD and flags drift. This is your dedicated anti-drift guard.
- *Security reviewer* (read-only): checks for the AI-code pitfalls (hardcoded secrets, missing server-side validation, auth gaps).

**5. Hooks to kill copy-paste** (`.claude/hooks.json`):
- *PostToolUse* after edits under `backend/` → auto-run the matching Jest tests (your 48 model tests are the fairness proof — keep them green automatically).
- *PreToolUse* guard → **block any write to `game/`** so the Unity fallback can't be touched by accident.
- *Stop* hook → desktop notification when a long task finishes.

**6. One-command boot** (replaces the manual STARTUP.md dance). Godot drops the Unity-editor + Unity-MCP steps. Add a `make dev` (or npm script) that starts Docker (Postgres 5444, Redis 6399) and the backend (NestJS 4007, Colyseus 4567), then prints status. Claude can invoke it via a hook — you stop typing the five startup steps.

**7. Idea → realization pipeline for *new* features.** Anything beyond the current sprint flows through the same anchored path so new ideas never bypass the spec: describe idea → Claude drafts a GDD/feature entry → converts it to numbered tasks in AGENT.md → `/sprint` builds it task-by-task with approval gates. The idea becomes documented spec *before* code, which is what keeps direction correct.

---

## Part 2 — Standing up `godot/` in parallel

**Create the folder and its spec.** Add `godot/` at the monorepo root, and a new `docs/GODOT_CLIENT.md` holding the Unity→Godot translation table below. That doc becomes the client spec.

**Translation table (Unity decision → Godot equivalent):**

| Unity (current) | Godot equivalent | Note |
|---|---|---|
| Unity 6 LTS (Dec 022) | Godot 4.6.3 stable (not 4.7-rc) | — |
| MonoBehaviour View + VContainer DI (024) | Scenes (`.tscn`) + autoload singletons; signals as event bus | DI mostly unneeded for a renderer |
| Cinemachine 3 (025) | `Camera2D` + custom rig script | **Reuse the pinch/zoom math from Decision 025 verbatim — it's pure math** |
| UI Toolkit + UGUI hybrid (023) | `Control` nodes + `Theme` resources | The two-system split collapses into one |
| PrimeTween (023) | Built-in `Tween` / `create_tween()` | Godot tweens are fine on mobile; zero-GC concern moot |
| Addressables (026) | `.pck` packs / Play Asset Delivery | Keeps APK under the 200MB limit |
| New Input System multi-touch (025) | Input Map + `InputEventScreenTouch`/`Drag`/`MagnifyGesture` | — |
| ScriptableObject `TileDefinition` (026) | Godot `Resource` (`.tres`) classes | **Cleanest mapping — near 1:1** |
| Google-Sheets→SO importer (026) | Google-Sheets→`.tres` importer | Claude can rebuild it |
| Unity Localization | Godot localization (CSV/PO + `tr()`) | — |
| UGS Cloud Save + Remote Config (CONTEXT.md) | Your existing **NestJS + Postgres** endpoints | Removes a Unity dependency — you already have the backend |

**Add these to `docs/DECISIONS.md`** (have Claude draft them from the table, you approve): `033` GDScript; `034` Godot version pinned to 4.6.3 stable (revisit 4.7 only when stable); `035` Colyseus native SDK pinned 0.17.7; `036` scene + autoload + signals architecture (replaces 024); `037` Resources replace ScriptableObjects (replaces 026); `038` Camera2D rig reusing 025 math; `039` Control+Theme UI (replaces 023); `040` built-in Tween (replaces PrimeTween in 023); `041` PCK/PAD assets (replaces Addressables); `042` Cloud Save/Remote Config served by NestJS (replaces UGS).

**Optional:** a Godot MCP server (analogous to your Unity "AI Game Developer" MCP) lets Claude run scenes and read editor errors directly. Useful once you hit the rendering phases; not required to start.

---

## Part 3 — Godot build sequence (mirrors your proven Unity phases)

Reuse the AGENT.md task structure. Each phase ends at an approval gate.

- **Phase A — Foundation + sync** *(equivalent to your completed Unity Phase 3)*: scaffold `godot/`; install Colyseus native SDK (0.17.7); map `FogboundState` into GDScript schema (use the C# schema in `game/` as reference); `NetworkManager` autoload connects to `ws://localhost:4567`, `join_or_create("fogbound_room")`; `GameStateSync` applies deltas. **Smoke test:** connect, log room id, receive state.
- **Phase B — Render from server state:** `BoardManager` draws the 13×13 grid as a **single TileMap/MultiMesh** (Decision 021 perf rule — never one node per tile); `FogManager` from `tile.isRevealed`; `ExplorerManager` from `state.explorers`; `TurnManager` from `turnState`. Tap explorer → tap tile → `SendMoveExplorer` → server validates → delta → render. (This reproduces your Phase 3 Task 10 smoke test in Godot.)
- **Phase C — Camera + input:** `Camera2D` rig; pinch-zoom (Decision 025 math); double-tap 3-level cycle; auto-pan on **your** turn start only — never on opponent turns (fog-integrity rule, Decision 025).
- **Phase D — UI:** `Control`-node HUD — context-morphing primary button, always-available Undo, top bar, explorer mini-card (Decision 031); main menu; settings (Decision 017's options).
- **Milestone (mirrors your Week-8 Playable):** gray-board 2-player match, end-to-end in Godot, fog + combat + scoring + win condition, no art.

---

## Part 4 — What still needs *you* (the rare-presence gates)
- Approving each plan and each completed task (the whole point of the loop).
- Apple Developer ($99/yr) and Google Play ($25 once) accounts; store metadata, screenshots, privacy answers, final submit.
- Final security sign-off before any public release.
- Taste calls: art direction, feel, balance — things not derivable from the docs.

---

## Your immediate next 3 actions
1. **Have Claude draft DECISIONS `033–042`** from the translation table; you review/approve. This anchors the Godot choices before any code.
2. **Install the loop:** update `CLAUDE.md` (Part 1.1), add `.claude/commands/sprint.md` (Part 1.2), add the two review subagents, and add the `game/`-write-guard + auto-test hooks (Part 1.5).
3. **Run the first Godot sprint** — Phase A (scaffold `godot/` + Colyseus connect + schema sync) — in Plan Mode.