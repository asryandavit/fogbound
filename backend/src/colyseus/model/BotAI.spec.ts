import { GameState, TileState, ExplorerState, PlayerState, tileKey } from './GameState';
import { chooseBotAction } from './BotAI';

function makeTile(x: number, y: number, overrides: Partial<TileState> = {}): TileState {
  return {
    x, y,
    tileType: 'grass',
    isRevealed: true,
    treasureType: 'none',
    treasureValue: 0,
    ...overrides,
  };
}

function makeExplorer(id: string, playerId: string, x: number, y: number, overrides: Partial<ExplorerState> = {}): ExplorerState {
  return {
    explorerId: id,
    playerId,
    x, y,
    coinCount: 0,
    otherItems: [],
    hasBag: false,
    hasBoat: false,
    hasShield: false,
    immobilizedUntilTurn: 0,
    ...overrides,
  };
}

function makePlayer(id: string, slot: number, baseX: number, baseY: number, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId: id,
    username: id,
    score: 0,
    isBot: slot !== 0,
    isConnected: true,
    slotNumber: slot,
    teamColor: slot === 0 ? 'red' : 'blue',
    baseX, baseY,
    ...overrides,
  };
}

// Deterministic rng that never triggers the rollout's random-move chance,
// so tests exercise the heuristic policy, not lucky randomness.
function noRandomRng(): () => number {
  return () => 0.99;
}

describe('chooseBotAction', () => {
  it('picks up an adjacent coin over a neutral move', () => {
    const tiles = new Map<string, TileState>();
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) tiles.set(tileKey(x, y), makeTile(x, y));
    }
    tiles.set(tileKey(2, 3), makeTile(2, 3, { treasureType: 'coin', treasureValue: 5 }));

    const state: GameState = {
      matchId: 'test', status: 'in_progress', gridCols: 5, gridRows: 5,
      tiles,
      explorers: new Map([['e1', makeExplorer('e1', 'bot', 2, 2)]]),
      players: new Map([
        ['bot', makePlayer('bot', 1, 2, 4)],
        ['human', makePlayer('human', 0, 2, 0)],
      ]),
      turn: { currentPlayerId: 'bot', turnNumber: 1, phase: 'move' },
      winCondition: 'all_treasure',
    };

    const action = chooseBotAction(state, 'bot', noRandomRng());
    expect(action).toEqual({ type: 'move', explorerId: 'e1', target: { x: 2, y: 3 } });
  });

  it('avoids attacking a shielded enemy when a neutral move is available', () => {
    const tiles = new Map<string, TileState>();
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) tiles.set(tileKey(x, y), makeTile(x, y));
    }

    const state: GameState = {
      matchId: 'test', status: 'in_progress', gridCols: 5, gridRows: 5,
      tiles,
      explorers: new Map([
        ['e1', makeExplorer('e1', 'bot', 2, 2)],
        ['e2', makeExplorer('e2', 'human', 2, 3, { hasShield: true })],
      ]),
      players: new Map([
        ['bot', makePlayer('bot', 1, 2, 4)],
        ['human', makePlayer('human', 0, 2, 0)],
      ]),
      turn: { currentPlayerId: 'bot', turnNumber: 1, phase: 'move' },
      winCondition: 'all_treasure',
    };

    const action = chooseBotAction(state, 'bot', noRandomRng());
    expect(action).not.toEqual({ type: 'move', explorerId: 'e1', target: { x: 2, y: 3 } });
  });

  it('attacks an undefended enemy carrying treasure', () => {
    const tiles = new Map<string, TileState>();
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) tiles.set(tileKey(x, y), makeTile(x, y));
    }

    const state: GameState = {
      matchId: 'test', status: 'in_progress', gridCols: 5, gridRows: 5,
      tiles,
      explorers: new Map([
        ['e1', makeExplorer('e1', 'bot', 2, 2)],
        ['e2', makeExplorer('e2', 'human', 2, 3, { coinCount: 3 })],
      ]),
      players: new Map([
        ['bot', makePlayer('bot', 1, 2, 4)],
        ['human', makePlayer('human', 0, 2, 0)],
      ]),
      turn: { currentPlayerId: 'bot', turnNumber: 1, phase: 'move' },
      winCondition: 'all_treasure',
    };

    const action = chooseBotAction(state, 'bot', noRandomRng());
    expect(action).toEqual({ type: 'move', explorerId: 'e1', target: { x: 2, y: 3 } });
  });

  it('returns end_turn when the bot has no legal moves', () => {
    const tiles = new Map<string, TileState>([[tileKey(0, 0), makeTile(0, 0)]]);
    const state: GameState = {
      matchId: 'test', status: 'in_progress', gridCols: 1, gridRows: 1,
      tiles,
      explorers: new Map([['e1', makeExplorer('e1', 'bot', 0, 0)]]),
      players: new Map([
        ['bot', makePlayer('bot', 1, 0, 0)],
        ['human', makePlayer('human', 0, 0, 0)],
      ]),
      turn: { currentPlayerId: 'bot', turnNumber: 1, phase: 'move' },
      winCondition: 'all_treasure',
    };

    const action = chooseBotAction(state, 'bot');
    expect(action).toEqual({ type: 'end_turn' });
  });

  it('does not move an immobilized explorer (returns end_turn or moves another)', () => {
    const tiles = new Map<string, TileState>();
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++) tiles.set(tileKey(x, y), makeTile(x, y));

    const state: GameState = {
      matchId: 'test', status: 'in_progress', gridCols: 5, gridRows: 5,
      tiles,
      explorers: new Map([
        ['e1', makeExplorer('e1', 'bot', 2, 2, { immobilizedUntilTurn: 5 })],
      ]),
      players: new Map([
        ['bot', makePlayer('bot', 1, 2, 4)],
        ['human', makePlayer('human', 0, 2, 0)],
      ]),
      turn: { currentPlayerId: 'bot', turnNumber: 3, phase: 'move' },
      winCondition: 'all_treasure',
    };

    const action = chooseBotAction(state, 'bot', noRandomRng());
    // e1 is immobilized until turn 5, turnNumber=3 → no legal moves → end_turn
    expect(action.type).toBe('end_turn');
  });

  it('avoids stepping on a trap tile when a neutral move is available', () => {
    const tiles = new Map<string, TileState>();
    for (let x = 0; x < 5; x++)
      for (let y = 0; y < 5; y++) tiles.set(tileKey(x, y), makeTile(x, y));
    tiles.set(tileKey(2, 3), makeTile(2, 3, { treasureType: 'trap' }));

    const state: GameState = {
      matchId: 'test', status: 'in_progress', gridCols: 5, gridRows: 5,
      tiles,
      explorers: new Map([['e1', makeExplorer('e1', 'bot', 2, 2)]]),
      players: new Map([
        ['bot', makePlayer('bot', 1, 2, 4)],
        ['human', makePlayer('human', 0, 2, 0)],
      ]),
      turn: { currentPlayerId: 'bot', turnNumber: 1, phase: 'move' },
      winCondition: 'all_treasure',
    };

    const action = chooseBotAction(state, 'bot', noRandomRng());
    // trap is directly south; bot should prefer any other direction
    expect(action).not.toEqual({ type: 'move', explorerId: 'e1', target: { x: 2, y: 3 } });
  });

  it('always returns a legal action across a variety of states without throwing', () => {
    for (let trial = 0; trial < 10; trial++) {
      const tiles = new Map<string, TileState>();
      for (let x = 0; x < 7; x++) {
        for (let y = 0; y < 7; y++) tiles.set(tileKey(x, y), makeTile(x, y));
      }
      const bx = trial % 7;
      const by = Math.floor(trial / 2) % 7;
      const state: GameState = {
        matchId: 'test', status: 'in_progress', gridCols: 7, gridRows: 7,
        tiles,
        explorers: new Map([
          ['e1', makeExplorer('e1', 'bot', bx, by)],
          ['e2', makeExplorer('e2', 'human', (bx + 3) % 7, (by + 3) % 7)],
        ]),
        players: new Map([
          ['bot', makePlayer('bot', 1, 3, 6)],
          ['human', makePlayer('human', 0, 3, 0)],
        ]),
        turn: { currentPlayerId: 'bot', turnNumber: 1, phase: 'move' },
        winCondition: 'all_treasure',
      };

      expect(() => chooseBotAction(state, 'bot')).not.toThrow();
      const action = chooseBotAction(state, 'bot');
      expect(['move', 'end_turn']).toContain(action.type);
    }
  });
});
