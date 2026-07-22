# /goal — drive one goal to completion in small verified chunks

Goal: $ARGUMENTS

1. Restate the goal in your own words. Read CLAUDE.md, docs/CONTEXT.md,
   docs/DECISIONS.md, and any docs/*.md relevant to this goal.
   STALENESS CHECK: If the goal's stated assumptions contradict what the
   docs or codebase show (e.g. the goal says a feature doesn't exist but it
   does), STOP and report the contradiction before doing any work.
2. ANTI-DRIFT: list the Decision numbers / GDD sections that govern this goal.
   If the goal conflicts with any locked decision, STOP and ask me — do not
   proceed.
3. Decompose the goal into a short ordered list of small chunks. Show me the
   list before starting.
4. Execute the chunks one by one WITHOUT stopping for per-chunk approval, EXCEPT
   you MUST stop and ask before: anything that conflicts with a decision;
   anything destructive or irreversible (deleting data, force-push, dropping a
   column with data); anything security- or auth-related; anything that would
   change an external credential or production config; or any choice the docs
   don't clearly answer. When in doubt, stop and ask.
5. For each chunk: implement it (minimal comments — docs are source of truth),
   then verify what you CAN:
   - Backend: run the Jest suite.
   - Godot: run GUT (via godot-forge or the headless gut_cmdln command) and, where
     relevant, run the project headless via the coding-solo MCP and read
     stdout/errors.
   - Fix failures before moving on. Never mark a chunk done on a failing test.
6. Respect the non-negotiables: client is a pure renderer; all game logic +
   validation server-side; never modify game/ (frozen Unity); never edit an
   existing migration; new numbered migration for any DB change.
7. STOP at the goal boundary — do not expand scope beyond the stated goal.
8. Commit each meaningful chunk with a conventional message. Push at the end.

Then produce a REPORT in exactly this structure:
- GOAL: (restated)
- CHUNKS DONE: (bullet list of what was built/changed, with file paths)
- TESTED — VERIFIED BY TESTS/LOGS: (what passed, with counts; what headless run /
  logs confirmed)
- NOT VERIFIABLE HEADLESS — NEEDS HUMAN EYES: (explicit list of anything visual,
  on-device, orientation, layout, feel, or multi-human — tell me exactly what to
  check and on what)
- LEFT / OUT OF SCOPE: (what remains, deferred deliberately)
- DECISIONS / RISKS: (any new DECISIONS.md entry drafted; any judgment call made;
  anything I should know)
- COMMITS: (hashes + messages)
- DOCS-SYNC: list every doc updated this goal. If any code changed with no doc
  update, state why in one line — 'no doc impact' is acceptable only for pure
  refactors and bug fixes that change no behavior contract.

Do not fake success. If blocked, stop and report the exact blocker.
