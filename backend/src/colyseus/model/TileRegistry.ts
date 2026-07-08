export type TileCategory = 'terrain' | 'treasure' | 'combat_item' | 'movement' | 'hazard' | 'special';

type TileEffect =
  | { readonly behavior: 'walkable' | 'blocks_without_boat' }
  | { readonly behavior: 'grants_equip'; readonly equipFlag: 'hasShield' | 'hasBag' | 'hasBoat' }
  | { readonly behavior: 'treasure_value'; readonly valueRange: readonly [number, number] };

export type TileDefinition = TileEffect & {
  readonly id: string;
  readonly category: TileCategory;
  readonly spawnWeight: number;
};

export const TILE_DEFINITIONS = [
  { id: 'grass', category: 'terrain', behavior: 'walkable', spawnWeight: 0 },
  { id: 'water', category: 'terrain', behavior: 'blocks_without_boat', spawnWeight: 0 },
  { id: 'coin', category: 'treasure', behavior: 'treasure_value', spawnWeight: 0.12, valueRange: [1, 3] },
  { id: 'shield', category: 'combat_item', behavior: 'grants_equip', spawnWeight: 0.03, equipFlag: 'hasShield' },
  { id: 'bag', category: 'special', behavior: 'grants_equip', spawnWeight: 0, equipFlag: 'hasBag' },
  { id: 'boat', category: 'movement', behavior: 'grants_equip', spawnWeight: 0, equipFlag: 'hasBoat' },
] as const satisfies readonly TileDefinition[];

const BY_ID = new Map<string, TileDefinition>(TILE_DEFINITIONS.map(d => [d.id, d]));

export function getTileDefinition(id: string): TileDefinition | undefined {
  return BY_ID.get(id);
}

/** Treasure/item tiles placeTreasure can actually roll for, in declaration
 * order — that order is load-bearing (see BoardSetup.placeTreasure). */
export function getSpawnableTreasureTiles(): readonly TileDefinition[] {
  return TILE_DEFINITIONS.filter(d => d.spawnWeight > 0 && d.category !== 'terrain');
}
