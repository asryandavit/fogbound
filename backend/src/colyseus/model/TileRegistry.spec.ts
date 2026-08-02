import { getTileDefinition, getSpawnableTreasureTiles, directionDelta } from './TileRegistry';

describe('getTileDefinition', () => {
  it('returns the definition for a known id', () => {
    expect(getTileDefinition('coin')).toEqual({
      id: 'coin', category: 'treasure', behavior: 'treasure_value', spawnWeight: 0.12, valueRange: [1, 3],
    });
  });

  it('returns undefined for an unknown id', () => {
    expect(getTileDefinition('nonexistent')).toBeUndefined();
  });
});

describe('getSpawnableTreasureTiles', () => {
  it('returns coin then shield as first two entries, in that order', () => {
    const ids = getSpawnableTreasureTiles().map(d => d.id);
    expect(ids[0]).toBe('coin');
    expect(ids[1]).toBe('shield');
  });

  it('excludes terrain and spawnWeight:0 catalog-only entries', () => {
    const ids = getSpawnableTreasureTiles().map(d => d.id);
    expect(ids).not.toContain('grass');
    expect(ids).not.toContain('water');
    expect(ids).not.toContain('bag');
    expect(ids).not.toContain('boat');
  });

  it('preserves the original hardcoded spawn chances (migrated unchanged)', () => {
    expect(getTileDefinition('coin')?.spawnWeight).toBe(0.12);
    expect(getTileDefinition('shield')?.spawnWeight).toBe(0.03);
  });
});

describe('new tile definitions', () => {
  it('arrow_north is defined with behavior arrow_push and direction north', () => {
    const def = getTileDefinition('arrow_north');
    expect(def?.behavior).toBe('arrow_push');
    expect((def as { direction?: string })?.direction).toBe('north');
    expect(def?.category).toBe('movement');
    expect(def?.spawnWeight).toBeGreaterThan(0);
  });

  it('cannon_east is still defined with behavior cannon_launch and direction east', () => {
    const def = getTileDefinition('cannon_east');
    expect(def?.behavior).toBe('cannon_launch');
    expect((def as { direction?: string })?.direction).toBe('east');
  });

  it('every cannon variant is defined but unspawnable — expansion scope (Decision 103)', () => {
    for (const id of ['cannon_north', 'cannon_south', 'cannon_east', 'cannon_west']) {
      expect(getTileDefinition(id)).toBeDefined();
      expect(getTileDefinition(id)?.spawnWeight).toBe(0);
    }
  });

  it('trap is defined with behavior immobilize', () => {
    const def = getTileDefinition('trap');
    expect(def?.behavior).toBe('immobilize');
    expect(def?.category).toBe('hazard');
    expect(def?.spawnWeight).toBeGreaterThan(0);
  });

  it('getSpawnableTreasureTiles includes arrow and trap variants, but no cannon', () => {
    const ids = getSpawnableTreasureTiles().map(d => d.id);
    expect(ids).toContain('arrow_north');
    expect(ids).toContain('trap');
    expect(ids.filter(id => id.startsWith('cannon_'))).toEqual([]);
  });

  it('no out-of-launch-scope tile is spawnable (Decision 103 expansion list)', () => {
    const spawnable = getSpawnableTreasureTiles().map(d => d.id);
    expect(spawnable.some(id => /^(cannon_|crocodile|rum|ice|lava)/.test(id))).toBe(false);
  });

  it('getSpawnableTreasureTiles still starts with coin then shield', () => {
    const ids = getSpawnableTreasureTiles().map(d => d.id);
    expect(ids[0]).toBe('coin');
    expect(ids[1]).toBe('shield');
  });
});

describe('directionDelta', () => {
  it('north moves y by -1', () => expect(directionDelta('north')).toEqual({ dx: 0, dy: -1 }));
  it('south moves y by +1', () => expect(directionDelta('south')).toEqual({ dx: 0, dy: 1 }));
  it('east moves x by +1', () => expect(directionDelta('east')).toEqual({ dx: 1, dy: 0 }));
  it('west moves x by -1', () => expect(directionDelta('west')).toEqual({ dx: -1, dy: 0 }));
});
