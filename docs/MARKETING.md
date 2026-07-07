# FOGBOUND — Launch Format Priority

Companion to Decision 080. This is not brand/creative — it's the technical
launch-sequencing rationale, kept here because it drives what gets built in
what order, not because it's a marketing plan in the copywriting sense.

## The problem: multiplayer liquidity

A real-time random-matchmaking queue only feels good if an opponent is
usually waiting. Rough model: filling a queue within your own wait-tolerance
needs roughly `1440 / wait-tolerance-in-minutes` daily active players just
for ONE mode/tier — multiply that by every map size, every mode, every skill
tier you split matchmaking across. A tiny-team launch does not have that
population on day one. A queue that mostly times out doesn't just fail
quietly — it's the first thing a new player hits, and it reads as "this game
is dead," which is worse than not having real-time matchmaking at all.

This is a well-worn failure mode for small real-time multiplayer launches;
the survivors in this genre (Polytopia, Warbits) both launched and grew on
async-first models rather than a live matchmaking queue.

## Launch order

1. **Solo vs Bot** — zero concurrency requirement, playable by exactly one
   person at any population size. Already built (server-side MCTS bot,
   `vsBot` join option, game-flow milestone).
2. **Async friend play via room codes** — a player shares a code with a
   specific friend; both play on their own schedule. Needs no stranger
   population at all — the "opponent" is a person you already invited.
   Not yet built — see docs/INFRA.md for the concrete gap (room-code join
   flow, async turn API).
3. **Daily-seed challenges** — everyone plays the same generated board that
   day, compared asynchronously via a leaderboard, no opponent pairing at
   all. Also removes the population requirement entirely. Not yet built —
   see docs/INFRA.md (seeded board generation is most of the hard part and
   already has a seam for it).
4. **Real-time random matchmaking** — deferred until there's an actual
   population to draw from. The live-PvP path (`join_or_create`, built in
   the game-flow milestone) already works mechanically; what's gated is
   *promoting* it as the primary way to find a match, not the underlying
   code.

## Rule going forward

Don't fragment matchmaking early. Every additional mode, map size, or skill
tier that live matchmaking splits across multiplies the population needed
to keep queue times short. Add real-time random matchmaking as a promoted,
default-visible option only once usage data shows it would actually fill —
not on a fixed calendar date.
