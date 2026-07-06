export interface TreasurePlacement {
  readonly x: number;
  readonly y: number;
  readonly treasureType: string;
  readonly treasureValue: number;
}

const COIN_CHANCE = 0.12;
const SHIELD_CHANCE = 0.03;

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
  const placements: TreasurePlacement[] = [];
  for (let x = 0; x < cols; x++) {
    for (let y = 0; y < rows; y++) {
      if (y === 0 || y === rows - 1) continue;
      const roll = rng();
      if (roll < COIN_CHANCE) {
        const treasureValue = 1 + Math.floor(rng() * 3);
        placements.push({ x, y, treasureType: 'coin', treasureValue });
      } else if (roll < COIN_CHANCE + SHIELD_CHANCE) {
        placements.push({ x, y, treasureType: 'shield', treasureValue: 0 });
      }
    }
  }
  return placements;
}
