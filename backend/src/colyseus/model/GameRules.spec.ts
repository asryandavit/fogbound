import { GameState, TileState, ExplorerState, PlayerState, tileKey } from './GameState';
import { isValidMove, applyMove, resolveCombat, checkWinCondition } from './GameRules';

function makeTile(x: number, y: number, overrides: Partial<TileState> = {}): TileState {
  return {
    x, y,
    tileType: 'grass',
    isRevealed: false,
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
    ...overrides,
  };
}

function makePlayer(id: string, slot: number, baseX: number, baseY: number, overrides: Partial<PlayerState> = {}): PlayerState {
  return {
    playerId: id,
    username: id,
    score: 0,
    isBot: false,
    isConnected: true,
    slotNumber: slot,
    teamColor: slot === 0 ? 'red' : 'blue',
    baseX, baseY,
    ...overrides,
  };
}

function makeState(overrides: Partial<GameState> = {}): GameState {
  const tiles = new Map<string, TileState>();
  for (let x = 0; x < 5; x++) {
    for (let y = 0; y < 5; y++) {
      tiles.set(tileKey(x, y), makeTile(x, y));
    }
  }
  const explorers = new Map<string, ExplorerState>([
    ['e1', makeExplorer('e1', 'p1', 1, 0)],
    ['e2', makeExplorer('e2', 'p2', 1, 4)],
  ]);
  const players = new Map<string, PlayerState>([
    ['p1', makePlayer('p1', 0, 0, 0)],
    ['p2', makePlayer('p2', 1, 0, 4)],
  ]);
  return {
    matchId: 'test',
    status: 'in_progress',
    gridCols: 5,
    gridRows: 5,
    tiles,
    explorers,
    players,
    turn: { currentPlayerId: 'p1', turnNumber: 1, phase: 'move' },
    winCondition: 'all_treasure',
    ...overrides,
  };
}

// ─── isValidMove ─────────────────────────────────────────────────────────────

describe('isValidMove', () => {
  it('accepts valid orthogonal move', () => {
    const state = makeState();
    expect(isValidMove(state, 'e1', { x: 1, y: 1 })).toBe(true);
  });

  it('rejects diagonal move', () => {
    const state = makeState();
    expect(isValidMove(state, 'e1', { x: 2, y: 1 })).toBe(false);
  });

  it('rejects move of distance 2', () => {
    const state = makeState();
    expect(isValidMove(state, 'e1', { x: 1, y: 2 })).toBe(false);
  });

  it('rejects out-of-bounds target', () => {
    const state = makeState();
    expect(isValidMove(state, 'e1', { x: 1, y: -1 })).toBe(false);
  });

  it('rejects unknown explorer', () => {
    const state = makeState();
    expect(isValidMove(state, 'e99', { x: 1, y: 1 })).toBe(false);
  });

  it('rejects move when not current player', () => {
    const state = makeState();
    expect(isValidMove(state, 'e2', { x: 1, y: 3 })).toBe(false);
  });

  it('rejects water tile without boat', () => {
    const tiles = new Map(makeState().tiles);
    tiles.set(tileKey(1, 1), makeTile(1, 1, { tileType: 'water' }));
    const state = makeState({ tiles });
    expect(isValidMove(state, 'e1', { x: 1, y: 1 })).toBe(false);
  });

  it('accepts water tile with boat', () => {
    const tiles = new Map(makeState().tiles);
    tiles.set(tileKey(1, 1), makeTile(1, 1, { tileType: 'water' }));
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 1, 0, { hasBoat: true }));
    const state = makeState({ tiles, explorers });
    expect(isValidMove(state, 'e1', { x: 1, y: 1 })).toBe(true);
  });
});

// ─── applyMove ───────────────────────────────────────────────────────────────

describe('applyMove', () => {
  it('moves explorer to target', () => {
    const state = makeState();
    const next = applyMove(state, 'e1', { x: 1, y: 1 });
    expect(next.explorers.get('e1')!.x).toBe(1);
    expect(next.explorers.get('e1')!.y).toBe(1);
  });

  it('reveals tile on move', () => {
    const state = makeState();
    expect(state.tiles.get(tileKey(1, 1))!.isRevealed).toBe(false);
    const next = applyMove(state, 'e1', { x: 1, y: 1 });
    expect(next.tiles.get(tileKey(1, 1))!.isRevealed).toBe(true);
  });

  it('collects coins from tile', () => {
    const tiles = new Map(makeState().tiles);
    tiles.set(tileKey(1, 1), makeTile(1, 1, { treasureType: 'coin', treasureValue: 2 }));
    const state = makeState({ tiles });
    const next = applyMove(state, 'e1', { x: 1, y: 1 });
    expect(next.explorers.get('e1')!.coinCount).toBe(2);
    expect(next.tiles.get(tileKey(1, 1))!.treasureValue).toBe(0);
  });

  it('does not exceed max coin capacity', () => {
    const tiles = new Map(makeState().tiles);
    tiles.set(tileKey(1, 1), makeTile(1, 1, { treasureType: 'coin', treasureValue: 10 }));
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 1, 0, { coinCount: 2 }));
    const state = makeState({ tiles, explorers });
    const next = applyMove(state, 'e1', { x: 1, y: 1 });
    expect(next.explorers.get('e1')!.coinCount).toBe(3); // max 3
  });

  it('scores inventory on base return', () => {
    // Player p1 base is at (0,0); move explorer to (0,0)
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 0, 1, { coinCount: 3 }));
    const state = makeState({ explorers });
    const next = applyMove(state, 'e1', { x: 0, y: 0 });
    expect(next.players.get('p1')!.score).toBe(3);
    expect(next.explorers.get('e1')!.coinCount).toBe(0);
  });

  it('triggers combat when moving onto enemy explorer', () => {
    // Place e2 at (1,1) so e1 walks into it
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 1, 0));
    explorers.set('e2', makeExplorer('e2', 'p2', 1, 1));
    const state = makeState({ explorers });
    const next = applyMove(state, 'e1', { x: 1, y: 1 });
    // Attacker wins; defender e2 returns to base (0,4)
    const e2 = next.explorers.get('e2')!;
    expect(e2.x).toBe(0);
    expect(e2.y).toBe(4);
  });
});

// ─── resolveCombat ───────────────────────────────────────────────────────────

describe('resolveCombat', () => {
  it('attacker wins by default', () => {
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 2, 2));
    explorers.set('e2', makeExplorer('e2', 'p2', 2, 2, { coinCount: 2 }));
    const state = makeState({ explorers });
    const next = resolveCombat(state, 'e1', 'e2');
    // Defender (e2) lost → back to base (0,4)
    expect(next.explorers.get('e2')!.x).toBe(0);
    expect(next.explorers.get('e2')!.y).toBe(4);
    expect(next.explorers.get('e2')!.coinCount).toBe(0);
  });

  it('defender wins when holding shield', () => {
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 2, 2, { coinCount: 1 }));
    explorers.set('e2', makeExplorer('e2', 'p2', 2, 2, { hasShield: true }));
    const state = makeState({ explorers });
    const next = resolveCombat(state, 'e1', 'e2');
    // Attacker (e1) lost → back to base (0,0)
    expect(next.explorers.get('e1')!.x).toBe(0);
    expect(next.explorers.get('e1')!.y).toBe(0);
    expect(next.explorers.get('e1')!.coinCount).toBe(0);
  });

  it('drops loser treasure on battle tile', () => {
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 2, 2));
    explorers.set('e2', makeExplorer('e2', 'p2', 2, 2, { coinCount: 3 }));
    const state = makeState({ explorers });
    const next = resolveCombat(state, 'e1', 'e2');
    expect(next.tiles.get(tileKey(2, 2))!.treasureValue).toBe(3);
  });
});

// ─── checkWinCondition ───────────────────────────────────────────────────────

describe('checkWinCondition', () => {
  it('returns null when treasure remains on tiles', () => {
    const tiles = new Map(makeState().tiles);
    tiles.set(tileKey(2, 2), makeTile(2, 2, { treasureValue: 5 }));
    const state = makeState({ tiles });
    expect(checkWinCondition(state)).toBeNull();
  });

  it('returns null when explorer carries treasure', () => {
    const explorers = new Map(makeState().explorers);
    explorers.set('e1', makeExplorer('e1', 'p1', 1, 1, { coinCount: 1 }));
    const state = makeState({ explorers });
    expect(checkWinCondition(state)).toBeNull();
  });

  it('returns winner by score when all treasure gone', () => {
    const players = new Map<string, PlayerState>([
      ['p1', makePlayer('p1', 0, 0, 0, { score: 5 })],
      ['p2', makePlayer('p2', 1, 0, 4, { score: 3 })],
    ]);
    const state = makeState({ players });
    expect(checkWinCondition(state)).toBe('p1');
  });

  it('returns winner when score target reached', () => {
    const players = new Map<string, PlayerState>([
      ['p1', makePlayer('p1', 0, 0, 0, { score: 10 })],
      ['p2', makePlayer('p2', 1, 0, 4, { score: 3 })],
    ]);
    const state = makeState({ players, winCondition: 'score_target', scoreTarget: 10 });
    expect(checkWinCondition(state)).toBe('p1');
  });

  it('returns null under score_target when no one has reached it', () => {
    const state = makeState({ winCondition: 'score_target', scoreTarget: 100 });
    expect(checkWinCondition(state)).toBeNull();
  });
});
