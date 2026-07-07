# FOGBOUND — Infrastructure: Live vs Async Multiplayer

Companion to Decision 074. Two multiplayer code paths exist by design —
this doc describes both and draws the line between them.

## The two paths

| | Live PvP | Async (room codes, daily-seed) |
|---|---|---|
| Owns state during the match | Colyseus `GameRoom` (in memory) | PostgreSQL `matches.board_state` (jsonb) |
| Move validation | `GameRules` inside `GameRoom` | Same `GameRules`, called from a NestJS request handler |
| Transport | WebSocket, server pushes deltas | Authenticated REST; client polls or waits on a push notification |
| Player must be online | Both players, same session | No — turns can be minutes to days apart |
| Lifetime | Room disposed when empty (Colyseus default) | Row persists until the match ends (or is abandoned) |

Why two paths instead of one: Colyseus rooms are memory-resident and
disposed when empty — exactly wrong for a match that might sit for hours
between turns. Forcing Colyseus to hold long-lived idle rooms was considered
and rejected (Decision 074) — memory cost scales with every open async
match, and a server restart would need extra machinery just to not lose
mid-match state that PostgreSQL already gives for free.

Both paths call the **same** `GameRules` (`backend/src/colyseus/model/`) —
`isValidMove`, `applyMove`, `resolveCombat`, `checkWinCondition` are pure
functions over a plain `GameState` object with no Colyseus dependency
(this was already true before Decision 074; it's what makes an async path
possible without duplicating rules logic). The async path is a second
*caller* of the existing rules engine, not a second rules engine.

## What already exists (built before this decision, reusable as-is)

- `matches` table (`backend/src/database/schema/matches.schema.ts`) already
  has a `board_state jsonb` column, `current_turn`, `current_player_id`,
  `status`, `winner_id` — this table was clearly provisioned for exactly
  this use case (see Decision 030) but is currently **read-only**: NestJS's
  `MatchesService` only ever `SELECT`s from it (match history/detail). There
  is no write path that keeps `board_state` current during a live match, and
  no code creates a `matches` row for a Colyseus-only match today.
- `notifications` table + `NotificationsService` — an in-app notification
  **inbox** (list, unread count, mark-read) already works end to end. This
  is NOT push delivery — nothing sends anything to a device. `sentAt` exists
  as a column but nothing sets it.
- `match_players` table — per-player-per-match rows, already used for match
  history.

## What does not exist yet (the actual work)

1. **Async turn-submission API** (NestJS, new): `POST /matches/:id/moves`
   (authenticated, JWT) — loads `board_state` from Postgres into the pure
   `GameState` shape, calls the same `isValidMove`/`applyMove`/
   `checkWinCondition` GameRules already used by Colyseus, writes the result
   back to `board_state`, advances `current_turn`/`current_player_id`, and
   — on a win — sets `status`/`winner_id`/`ended_at` exactly like
   `GameRoom.checkForWinner` does today.
2. **Room-code join flow**: async matches need a short shareable code
   (not a UUID) a friend can enter to join — no code for this exists yet
   anywhere in `matches`/`maps`.
3. **Device push token storage**: no table or column currently stores an
   FCM registration token or an APNs device token for a player. Needs a new
   column (or table, if multi-device is in scope) before any push can be
   sent.
4. **Actual push delivery** (FCM for Android, APNs for iOS): no SDK is
   installed, no server credentials exist. **This step needs the user** —
   a Firebase project (for FCM) and an Apple Push Notification key/cert
   (for APNs) are external, account-holder-owned credentials that can't be
   generated from inside the codebase. Everything else in this doc can be
   built without them; this step blocks on them specifically.
5. **Daily-seed challenge generation**: a deterministic seed (e.g. date-based)
   that produces the same board for every player that day, plus a
   leaderboard/comparison view. The board-generation code
   (`BoardSetup.placeTreasure`) already accepts an injectable `rng`
   (built for testability, per its own docstring) — a seeded PRNG fed
   through that same parameter is most of what's needed board-side; the
   challenge/leaderboard wrapper around it does not exist.

## Non-goals (explicitly not changing)

- Live PvP (`GameRoom`, Colyseus) is untouched by this decision — the
  vs-Bot and vs-Player flows built in the game-flow milestone keep working
  exactly as they do today. Async is additive, not a replacement.
- `GameRules` itself does not change — the whole point is that it's already
  transport-agnostic. If a future change to move/combat rules is needed,
  it happens once, in one place, and both paths pick it up.
