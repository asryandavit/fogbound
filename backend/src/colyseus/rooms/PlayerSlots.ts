import { FogboundState } from '../schemas/FogboundState';

/** Releases a departing player's seat, but only before a match has started
 *  (Decision 101, which supersedes Decision 100 point 6 for this phase alone).
 *  Returns false and leaves state untouched once status has left 'pending' —
 *  from that point the entry is permanent so bot takeover can keep playing it
 *  (Decisions 011/012/029).
 *
 *  Lives outside GameRoom so it is reachable from Jest: importing `colyseus`
 *  at all is still blocked under Jest by the rou3 ESM gap (Decision 100), while
 *  `@colyseus/schema` imports cleanly. */
export function releasePreMatchSeat(state: FogboundState, playerId: string): boolean {
  if (state.status !== 'pending') return false;
  if (!state.players.has(playerId)) return false;

  state.players.delete(playerId);
  // The seat's explorers go with it — an orphaned pair would still render on
  // the next joiner's board, reproducing the very artifact this closes.
  for (const explorerId of [...state.explorers.keys()]) {
    if (state.explorers.get(explorerId)?.playerId === playerId) {
      state.explorers.delete(explorerId);
    }
  }
  return true;
}
