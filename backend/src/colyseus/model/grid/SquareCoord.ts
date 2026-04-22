import { ICoordinate } from './ICoordinate';

export class SquareCoord implements ICoordinate {
  constructor(readonly x: number, readonly y: number) {}

  equals(other: ICoordinate): boolean {
    return this.x === other.x && this.y === other.y;
  }

  toString(): string {
    return `${this.x},${this.y}`;
  }
}
