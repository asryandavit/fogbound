import { IGrid, MoveRuleset } from './IGrid';
import { SquareCoord } from './SquareCoord';

const ORTHOGONAL_DIRS = [
  [0, 1],
  [0, -1],
  [1, 0],
  [-1, 0],
] as const;

export class SquareGrid implements IGrid<SquareCoord> {
  constructor(readonly cols: number, readonly rows: number) {}

  contains(coord: SquareCoord): boolean {
    return coord.x >= 0 && coord.x < this.cols && coord.y >= 0 && coord.y < this.rows;
  }

  neighbors(coord: SquareCoord, _ruleset: MoveRuleset = 'orthogonal'): SquareCoord[] {
    return ORTHOGONAL_DIRS
      .map(([dx, dy]) => new SquareCoord(coord.x + dx, coord.y + dy))
      .filter(c => this.contains(c));
  }

  distance(a: SquareCoord, b: SquareCoord): number {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
  }

  range(center: SquareCoord, radius: number): SquareCoord[] {
    const result: SquareCoord[] = [];
    for (let x = center.x - radius; x <= center.x + radius; x++) {
      for (let y = center.y - radius; y <= center.y + radius; y++) {
        const c = new SquareCoord(x, y);
        if (this.contains(c) && this.distance(center, c) <= radius) {
          result.push(c);
        }
      }
    }
    return result;
  }

  findPath(
    from: SquareCoord,
    to: SquareCoord,
    cost?: (a: SquareCoord, b: SquareCoord) => number,
  ): SquareCoord[] | null {
    type Node = { coord: SquareCoord; g: number; parent: Node | null };

    const start: Node = { coord: from, g: 0, parent: null };
    const open: Node[] = [start];
    const visited = new Set<string>([from.toString()]);

    while (open.length > 0) {
      if (cost) open.sort((a, b) => a.g - b.g);
      const current = open.shift()!;

      if (current.coord.equals(to)) {
        const path: SquareCoord[] = [];
        let node: Node | null = current;
        while (node) {
          path.unshift(node.coord);
          node = node.parent;
        }
        return path;
      }

      for (const neighbor of this.neighbors(current.coord)) {
        const key = neighbor.toString();
        if (!visited.has(key)) {
          visited.add(key);
          const moveCost = cost ? cost(current.coord, neighbor) : 1;
          open.push({ coord: neighbor, g: current.g + moveCost, parent: current });
        }
      }
    }

    return null;
  }
}
