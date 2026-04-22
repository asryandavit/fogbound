import { SquareCoord } from './SquareCoord';
import { SquareGrid } from './SquareGrid';

describe('SquareCoord', () => {
  it('equals same coords', () => {
    expect(new SquareCoord(2, 3).equals(new SquareCoord(2, 3))).toBe(true);
  });

  it('not equals different coords', () => {
    expect(new SquareCoord(1, 2).equals(new SquareCoord(1, 3))).toBe(false);
  });

  it('toString produces x,y', () => {
    expect(new SquareCoord(4, 7).toString()).toBe('4,7');
  });
});

describe('SquareGrid.contains', () => {
  const grid = new SquareGrid(5, 5);

  it('contains center tile', () => {
    expect(grid.contains(new SquareCoord(2, 2))).toBe(true);
  });

  it('contains origin', () => {
    expect(grid.contains(new SquareCoord(0, 0))).toBe(true);
  });

  it('contains far corner', () => {
    expect(grid.contains(new SquareCoord(4, 4))).toBe(true);
  });

  it('rejects negative x', () => {
    expect(grid.contains(new SquareCoord(-1, 2))).toBe(false);
  });

  it('rejects out-of-bounds x', () => {
    expect(grid.contains(new SquareCoord(5, 2))).toBe(false);
  });

  it('rejects out-of-bounds y', () => {
    expect(grid.contains(new SquareCoord(2, 5))).toBe(false);
  });
});

describe('SquareGrid.neighbors', () => {
  const grid = new SquareGrid(5, 5);

  it('center tile has 4 neighbors', () => {
    const n = grid.neighbors(new SquareCoord(2, 2));
    expect(n).toHaveLength(4);
  });

  it('corner tile has 2 neighbors', () => {
    const n = grid.neighbors(new SquareCoord(0, 0));
    expect(n).toHaveLength(2);
  });

  it('edge tile has 3 neighbors', () => {
    const n = grid.neighbors(new SquareCoord(0, 2));
    expect(n).toHaveLength(3);
  });

  it('neighbors are orthogonal only — no diagonals', () => {
    const n = grid.neighbors(new SquareCoord(2, 2));
    for (const c of n) {
      const dx = Math.abs(c.x - 2);
      const dy = Math.abs(c.y - 2);
      expect(dx + dy).toBe(1);
    }
  });
});

describe('SquareGrid.distance', () => {
  const grid = new SquareGrid(10, 10);

  it('same tile = 0', () => {
    expect(grid.distance(new SquareCoord(3, 3), new SquareCoord(3, 3))).toBe(0);
  });

  it('horizontal distance', () => {
    expect(grid.distance(new SquareCoord(0, 0), new SquareCoord(4, 0))).toBe(4);
  });

  it('vertical distance', () => {
    expect(grid.distance(new SquareCoord(0, 0), new SquareCoord(0, 3))).toBe(3);
  });

  it('diagonal distance is Manhattan sum', () => {
    expect(grid.distance(new SquareCoord(0, 0), new SquareCoord(3, 4))).toBe(7);
  });
});

describe('SquareGrid.range', () => {
  const grid = new SquareGrid(7, 7);

  it('radius 0 returns only center', () => {
    const r = grid.range(new SquareCoord(3, 3), 0);
    expect(r).toHaveLength(1);
    expect(r[0].equals(new SquareCoord(3, 3))).toBe(true);
  });

  it('radius 1 returns 5 tiles (diamond)', () => {
    const r = grid.range(new SquareCoord(3, 3), 1);
    expect(r).toHaveLength(5);
  });

  it('radius 2 returns 13 tiles (diamond)', () => {
    const r = grid.range(new SquareCoord(3, 3), 2);
    expect(r).toHaveLength(13);
  });

  it('clamps to grid bounds near corner', () => {
    const r = grid.range(new SquareCoord(0, 0), 2);
    for (const c of r) {
      expect(grid.contains(c)).toBe(true);
    }
  });
});

describe('SquareGrid.findPath', () => {
  const grid = new SquareGrid(5, 5);

  it('same start and end returns single-node path', () => {
    const path = grid.findPath(new SquareCoord(0, 0), new SquareCoord(0, 0));
    expect(path).toHaveLength(1);
  });

  it('finds simple horizontal path', () => {
    const path = grid.findPath(new SquareCoord(0, 0), new SquareCoord(3, 0));
    expect(path).not.toBeNull();
    expect(path![0].equals(new SquareCoord(0, 0))).toBe(true);
    expect(path![path!.length - 1].equals(new SquareCoord(3, 0))).toBe(true);
    expect(path).toHaveLength(4);
  });

  it('finds diagonal-ish path with Manhattan length', () => {
    const path = grid.findPath(new SquareCoord(0, 0), new SquareCoord(2, 2));
    expect(path).not.toBeNull();
    expect(path).toHaveLength(5); // 4 steps + start
  });

  it('avoids high-cost tiles via cost function', () => {
    // Make y=1 row extremely expensive to traverse
    const cost = (a: SquareCoord, b: SquareCoord) => b.y === 1 ? 100 : 1;
    const path = grid.findPath(new SquareCoord(0, 0), new SquareCoord(4, 0), cost);
    expect(path).not.toBeNull();
    // Path should go around row y=1 — check no tile has y=1
    const usesExpensiveRow = path!.some(c => c.y === 1);
    expect(usesExpensiveRow).toBe(false);
  });
});
