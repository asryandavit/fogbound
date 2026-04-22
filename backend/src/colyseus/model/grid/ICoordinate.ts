export interface ICoordinate {
  readonly x: number;
  readonly y: number;
  equals(other: ICoordinate): boolean;
  toString(): string;
}
