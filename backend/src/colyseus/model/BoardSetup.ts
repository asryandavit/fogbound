import { TileDefinition, getSpawnableTreasureTiles } from './TileRegistry';

export interface TreasurePlacement {
  readonly x: number;
  readonly y: number;
  readonly treasureType: string;
  readonly treasureValue: number;
}

function rollTreasureValue(def: TileDefinition, rng: () => number): number {
  if (def.behavior !== 'treasure_value') return 0;
  const [min, max] = def.valueRange;
  return min + Math.floor(rng() * (max - min + 1));
}

/**
 * Pure, seedable treasure layout for a fresh board. Starting rows (y=0 and
 * y=rows-1) are always excluded — GDD: "no treasure on starting row/column
 * tiles." rng is injectable for deterministic tests; defaults to Math.random
 * for real matches.
 */
export function placeTreasure(
  rows: number,
  cols: number,
  rng: () => number = Math.random,
): TreasurePlacement[] {
  const spawnable = getSpawnableTreasureTiles();
  const placements: TreasurePlacement[] = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (y === 0 || y === rows - 1) continue;
      const roll = rng();
      let cumulative = 0;
      for (const def of spawnable) {
        cumulative += def.spawnWeight;
        if (roll < cumulative) {
          placements.push({ x, y, treasureType: def.id, treasureValue: rollTreasureValue(def, rng) });
          break;
        }
      }
    }
  }
  return placements;
}
