import { placeTreasure } from './BoardSetup';

function sequenceRng(values: number[]): () => number {
  let i = 0;
  return () => values[Math.min(i++, values.length - 1)];
}

describe('placeTreasure', () => {
  it('never places treasure on the starting rows (y=0 or y=rows-1)', () => {
    const placements = placeTreasure(5, 5, sequenceRng([0])); // always "roll a coin"
    expect(placements.every(p => p.y !== 0 && p.y !== 4)).toBe(true);
  });

  it('places a coin with a value between 1 and 3 when the roll is below the coin threshold', () => {
    // First rng call (roll) < 0.12 → coin; second call (value roll) = 0.5 → floor(0.5*3)=1, +1 = 2
    const placements = placeTreasure(3, 1, sequenceRng([0.05, 0.5]));
    expect(placements).toHaveLength(1);
    expect(placements[0]).toEqual({ x: 0, y: 1, treasureType: 'coin', treasureValue: 2 });
  });

  it('places a shield when the roll is between the coin and shield thresholds', () => {
    const placements = placeTreasure(3, 1, sequenceRng([0.13]));
    expect(placements).toHaveLength(1);
    expect(placements[0]).toEqual({ x: 0, y: 1, treasureType: 'shield', treasureValue: 0 });
  });

  it('places nothing when the roll is above both thresholds', () => {
    const placements = placeTreasure(3, 1, sequenceRng([0.99]));
    expect(placements).toHaveLength(0);
  });

  it('is deterministic given the same rng sequence', () => {
    const values = [0.05, 0.9, 0.2, 0.5, 0.5, 0.99];
    const a = placeTreasure(4, 4, sequenceRng(values));
    const b = placeTreasure(4, 4, sequenceRng(values));
    expect(a).toEqual(b);
  });
});
