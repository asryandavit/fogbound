import { ICoordinate } from './ICoordinate';

export type MoveRuleset = 'orthogonal';

export interface IGrid<T extends ICoordinate> {
  contains(coord: T): boolean;
  neighbors(coord: T, ruleset?: MoveRuleset): T[];
  distance(a: T, b: T): number;
  range(center: T, radius: number): T[];
  findPath(from: T, to: T, cost?: (a: T, b: T) => number): T[] | null;
}
