export type TileCategory = 'terrain' | 'treasure' | 'combat_item' | 'movement' | 'hazard' | 'special';

type TileEffect =
  | { readonly behavior: 'walkable' | 'blocks_without_boat' }
  | { readonly behavior: 'grants_equip'; readonly equipFlag: 'hasShield' | 'hasBag' | 'hasBoat' }
  | { readonly behavior: 'treasure_value'; readonly valueRange: readonly [number, number] }
  | { readonly behavior: 'arrow_push'; readonly direction: 'north' | 'south' | 'east' | 'west' }
  | { readonly behavior: 'cannon_launch'; readonly direction: 'north' | 'south' | 'east' | 'west' }
  | { readonly behavior: 'immobilize' };

export type TileDefinition = TileEffect & {
  readonly id: string;
  readonly category: TileCategory;
  readonly spawnWeight: number;
};

export const TILE_DEFINITIONS = [
  { id: 'grass',        category: 'terrain',     behavior: 'walkable',          spawnWeight: 0       },
  { id: 'water',        category: 'terrain',     behavior: 'blocks_without_boat', spawnWeight: 0     },
  { id: 'coin',         category: 'treasure',    behavior: 'treasure_value',    spawnWeight: 0.12,   valueRange: [1, 3]   },
  { id: 'shield',       category: 'combat_item', behavior: 'grants_equip',      spawnWeight: 0.03,   equipFlag: 'hasShield' },
  { id: 'bag',          category: 'special',     behavior: 'grants_equip',      spawnWeight: 0,      equipFlag: 'hasBag'   },
  { id: 'boat',         category: 'movement',    behavior: 'grants_equip',      spawnWeight: 0,      equipFlag: 'hasBoat'  },
  { id: 'arrow_north',  category: 'movement',    behavior: 'arrow_push',        spawnWeight: 0.01,   direction: 'north' },
  { id: 'arrow_south',  category: 'movement',    behavior: 'arrow_push',        spawnWeight: 0.01,   direction: 'south' },
  { id: 'arrow_east',   category: 'movement',    behavior: 'arrow_push',        spawnWeight: 0.01,   direction: 'east'  },
  { id: 'arrow_west',   category: 'movement',    behavior: 'arrow_push',        spawnWeight: 0.01,   direction: 'west'  },
  { id: 'cannon_north', category: 'movement',    behavior: 'cannon_launch',     spawnWeight: 0.0075, direction: 'north' },
  { id: 'cannon_south', category: 'movement',    behavior: 'cannon_launch',     spawnWeight: 0.0075, direction: 'south' },
  { id: 'cannon_east',  category: 'movement',    behavior: 'cannon_launch',     spawnWeight: 0.0075, direction: 'east'  },
  { id: 'cannon_west',  category: 'movement',    behavior: 'cannon_launch',     spawnWeight: 0.0075, direction: 'west'  },
  { id: 'trap',         category: 'hazard',      behavior: 'immobilize',        spawnWeight: 0.04    },
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

export function directionDelta(dir: 'north' | 'south' | 'east' | 'west'): { readonly dx: number; readonly dy: number } {
  switch (dir) {
    case 'north': return { dx: 0, dy: -1 };
    case 'south': return { dx: 0, dy: 1 };
    case 'east':  return { dx: 1, dy: 0 };
    case 'west':  return { dx: -1, dy: 0 };
  }
}
