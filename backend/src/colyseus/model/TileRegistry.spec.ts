import { getTileDefinition, getSpawnableTreasureTiles } from './TileRegistry';

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
  it('returns coin then shield, in that order', () => {
    expect(getSpawnableTreasureTiles().map(d => d.id)).toEqual(['coin', 'shield']);
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
