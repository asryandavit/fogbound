import { FogboundState } from '../schemas/FogboundState';
import { PlayerSchema } from '../schemas/PlayerSchema';
import { ExplorerSchema } from '../schemas/ExplorerSchema';
import { releasePreMatchSeat } from './PlayerSlots';

/** Mirrors GameRoom.addPlayer's allocation (`slot = players.size`) and its
 *  explorer spawn, which the goal deliberately leaves untouched — these tests
 *  exist to prove that rule stays correct once a pre-match seat is released.
 *  GameRoom itself cannot be imported here: `colyseus` is unloadable under Jest
 *  (rou3 ESM gap, Decision 100), so the room-level path is covered live instead. */
function addPlayer(state: FogboundState, playerId: string, isBot = false): void {
  const slot = state.players.size;
  const player = new PlayerSchema();
  player.playerId = playerId;
  player.username = playerId;
  player.slotNumber = slot;
  player.isConnected = !isBot;
  player.isBot = isBot;
  player.baseY = slot === 0 ? 0 : 12;
  state.players.set(playerId, player);

  for (let i = 0; i < 2; i++) {
    const explorer = new ExplorerSchema();
    explorer.explorerId = `${playerId}_e${i}`;
    explorer.playerId = playerId;
    explorer.y = player.baseY;
    state.explorers.set(explorer.explorerId, explorer);
  }
}

function waitingRoom(): FogboundState {
  const state = new FogboundState();
  state.status = 'pending';
  return state;
}

describe('releasePreMatchSeat', () => {
  it('pre-match join -> leave -> join leaves ONE player at slot 0, not a ghost at 0 and a human at 1', () => {
    const state = waitingRoom();
    addPlayer(state, 'player_first');
    expect(state.players.size).toBe(1);

    expect(releasePreMatchSeat(state, 'player_first')).toBe(true);
    expect(state.players.size).toBe(0);

    // The rejoin mints a fresh id, exactly as network_manager.gd does.
    addPlayer(state, 'player_rejoined');

    expect(state.players.size).toBe(1);
    expect(state.players.get('player_rejoined')?.slotNumber).toBe(0);
    expect(state.players.has('player_first')).toBe(false);
    expect([...state.players.keys()]).toEqual(['player_rejoined']);
  });

  it('takes the released seat\'s explorers with it, so the board holds one set', () => {
    const state = waitingRoom();
    addPlayer(state, 'player_first');
    expect(state.explorers.size).toBe(2);

    releasePreMatchSeat(state, 'player_first');
    expect(state.explorers.size).toBe(0);

    addPlayer(state, 'player_rejoined');
    expect(state.explorers.size).toBe(2);
    expect([...state.explorers.values()].every(e => e.playerId === 'player_rejoined')).toBe(true);
  });

  it('leaves the second seat free for a genuine opponent after a release', () => {
    const state = waitingRoom();
    addPlayer(state, 'player_first');
    releasePreMatchSeat(state, 'player_first');
    addPlayer(state, 'player_rejoined');
    addPlayer(state, 'player_opponent');

    expect(state.players.size).toBe(2);
    expect(state.players.get('player_rejoined')?.slotNumber).toBe(0);
    expect(state.players.get('player_opponent')?.slotNumber).toBe(1);
    expect(state.explorers.size).toBe(4);
  });

  it('refuses once the match is in progress — entry retained for bot takeover', () => {
    const state = waitingRoom();
    addPlayer(state, 'player_a');
    addPlayer(state, 'player_b');
    state.status = 'in_progress';

    expect(releasePreMatchSeat(state, 'player_a')).toBe(false);
    expect(state.players.size).toBe(2);
    expect(state.players.get('player_a')?.slotNumber).toBe(0);
    expect(state.explorers.size).toBe(4);

    // What GameRoom.onLeave does instead once in progress (Decisions 011/012/029).
    const departed = state.players.get('player_a') as PlayerSchema;
    departed.isBot = true;
    expect(state.players.get('player_a')?.isBot).toBe(true);
    expect([...state.explorers.values()].filter(e => e.playerId === 'player_a')).toHaveLength(2);
  });

  it('refuses in every non-pending status, and for an unknown playerId', () => {
    for (const status of ['in_progress', 'finished', 'abandoned']) {
      const state = waitingRoom();
      addPlayer(state, 'player_a');
      state.status = status;
      expect(releasePreMatchSeat(state, 'player_a')).toBe(false);
      expect(state.players.size).toBe(1);
    }

    const pending = waitingRoom();
    addPlayer(pending, 'player_a');
    expect(releasePreMatchSeat(pending, 'player_missing')).toBe(false);
    expect(pending.players.size).toBe(1);
  });

  it('is idempotent — a repeated release is a no-op', () => {
    const state = waitingRoom();
    addPlayer(state, 'player_first');
    expect(releasePreMatchSeat(state, 'player_first')).toBe(true);
    expect(releasePreMatchSeat(state, 'player_first')).toBe(false);
    expect(state.players.size).toBe(0);
  });
});
