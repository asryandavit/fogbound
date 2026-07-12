import {
  GameState,
  ExplorerState,
  TileState,
  PlayerState,
  Coord,
  tileKey,
  maxCoins,
  maxOtherItems,
} from './GameState';
import { getTileDefinition, directionDelta } from './TileRegistry';

function cloneState(state: GameState): {
  tiles: Map<string, TileState>;
  explorers: Map<string, ExplorerState>;
  players: Map<string, PlayerState>;
} {
  return {
    tiles: new Map(state.tiles),
    explorers: new Map(state.explorers),
    players: new Map(state.players),
  };
}

function revealTile(mutableTiles: Map<string, TileState>, x: number, y: number): void {
  const k = tileKey(x, y);
  const t = mutableTiles.get(k);
  if (t && !t.isRevealed) mutableTiles.set(k, { ...t, isRevealed: true });
}

function collectFromTile(
  explorer: ExplorerState,
  landX: number,
  landY: number,
  mutableTiles: Map<string, TileState>,
  mutablePlayers: Map<string, PlayerState>,
): ExplorerState {
  const k = tileKey(landX, landY);
  const tile = mutableTiles.get(k);
  const player = mutablePlayers.get(explorer.playerId)!;
  const atBase = landX === player.baseX && landY === player.baseY;

  if (atBase && (explorer.coinCount > 0 || explorer.otherItems.length > 0)) {
    const scored = explorer.coinCount + explorer.otherItems.length;
    mutablePlayers.set(explorer.playerId, { ...player, score: player.score + scored });
    return { ...explorer, coinCount: 0, otherItems: [] };
  }
  if (tile && tile.treasureValue > 0) {
    const pick = Math.min(tile.treasureValue, maxCoins(explorer) - explorer.coinCount);
    if (pick > 0) {
      mutableTiles.set(k, { ...tile, treasureValue: tile.treasureValue - pick });
      return { ...explorer, coinCount: explorer.coinCount + pick };
    }
  } else if (tile && tile.treasureType !== 'none' && tile.treasureType !== '' && tile.treasureValue === 0) {
    const def = getTileDefinition(tile.treasureType);
    if (def?.behavior === 'grants_equip' && explorer.otherItems.length < maxOtherItems(explorer)) {
      mutableTiles.set(k, { ...tile, treasureType: 'none' });
      return {
        ...explorer,
        otherItems: [...explorer.otherItems, tile.treasureType],
        ...(def.behavior === 'grants_equip' ? { [def.equipFlag]: true } : {}),
      };
    }
  }
  return explorer;
}

export function isValidMove(
  state: GameState,
  explorerId: string,
  target: Coord,
): boolean {
  const explorer = state.explorers.get(explorerId);
  if (!explorer) return false;
  if (explorer.playerId !== state.turn.currentPlayerId) return false;

  if (explorer.immobilizedUntilTurn > 0 && state.turn.turnNumber <= explorer.immobilizedUntilTurn) return false;

  const dx = Math.abs(explorer.x - target.x);
  const dy = Math.abs(explorer.y - target.y);
  if (dx + dy !== 1) return false;

  if (target.x < 0 || target.x >= state.gridCols) return false;
  if (target.y < 0 || target.y >= state.gridRows) return false;

  const tile = state.tiles.get(tileKey(target.x, target.y));
  const terrainDef = tile ? getTileDefinition(tile.tileType) : undefined;
  if (terrainDef?.behavior === 'blocks_without_boat' && !explorer.hasBoat) return false;

  return true;
}

export function resolveCombat(
  state: GameState,
  attackerId: string,
  defenderId: string,
): GameState {
  const { tiles, explorers, players } = cloneState(state);

  const attacker = explorers.get(attackerId)!;
  const defender = explorers.get(defenderId)!;

  const defenderWins = defender.hasShield;
  const loserId = defenderWins ? attackerId : defenderId;

  const loser = explorers.get(loserId)!;
  const loserPlayer = players.get(loser.playerId)!;

  const droppedCoins = loser.coinCount;
  const droppedItems = [...loser.otherItems];

  // Drop all treasure on the battle tile
  const battleKey = tileKey(
    defenderWins ? attacker.x : defender.x,
    defenderWins ? attacker.y : defender.y,
  );
  const battleTile = tiles.get(battleKey);
  if (battleTile) {
    tiles.set(battleKey, {
      ...battleTile,
      treasureType: droppedItems.length > 0 ? droppedItems[0] : battleTile.treasureType,
      treasureValue: battleTile.treasureValue + droppedCoins,
    });
  }

  // Loser returns to base with empty inventory
  explorers.set(loserId, {
    ...loser,
    x: loserPlayer.baseX,
    y: loserPlayer.baseY,
    coinCount: 0,
    otherItems: [],
    hasShield: false,
    hasBag: false,
  });

  return { ...state, tiles, explorers, players };
}

export function applyMove(
  state: GameState,
  explorerId: string,
  target: Coord,
): GameState {
  const { tiles, explorers, players } = cloneState(state);

  let explorer = explorers.get(explorerId)!;
  const key = tileKey(target.x, target.y);

  // Check for enemy explorer at target
  let workingState: GameState = { ...state, tiles, explorers, players };
  for (const [otherId, other] of explorers) {
    if (otherId !== explorerId && other.x === target.x && other.y === target.y && other.playerId !== explorer.playerId) {
      workingState = resolveCombat(workingState, explorerId, otherId);
      explorer = workingState.explorers.get(explorerId)!;
      break;
    }
  }

  const mutableExplorers = new Map(workingState.explorers);
  const mutableTiles = new Map(workingState.tiles);
  const mutablePlayers = new Map(workingState.players);

  // Move explorer to target
  let updatedExplorer: ExplorerState = { ...explorer, x: target.x, y: target.y };

  // Reveal tile and snapshot it before collection modifies it
  revealTile(mutableTiles, target.x, target.y);
  const tile = mutableTiles.get(key);

  // Collect coins/equip at landing tile (arrow/cannon/trap are NOT consumed)
  updatedExplorer = collectFromTile(updatedExplorer, target.x, target.y, mutableTiles, mutablePlayers);

  // Apply tile special effects after collection
  const landedTileDef = tile ? getTileDefinition(tile.treasureType) : undefined;

  if (landedTileDef?.behavior === 'immobilize') {
    updatedExplorer = {
      ...updatedExplorer,
      immobilizedUntilTurn: state.turn.turnNumber + state.players.size,
    };
  } else if (landedTileDef?.behavior === 'arrow_push' || landedTileDef?.behavior === 'cannon_launch') {
    const { dx, dy } = directionDelta((landedTileDef as { direction: 'north' | 'south' | 'east' | 'west' }).direction);
    let landX = target.x;
    let landY = target.y;

    if (landedTileDef.behavior === 'arrow_push') {
      const nx = target.x + dx;
      const ny = target.y + dy;
      if (nx >= 0 && nx < state.gridCols && ny >= 0 && ny < state.gridRows) {
        const pushTile = mutableTiles.get(tileKey(nx, ny));
        const pushDef = pushTile ? getTileDefinition(pushTile.tileType) : undefined;
        if (pushDef?.behavior !== 'blocks_without_boat' || updatedExplorer.hasBoat) {
          landX = nx; landY = ny;
        }
      }
    } else {
      // cannon_launch: scan to last walkable tile in direction
      let cx = target.x + dx, cy = target.y + dy;
      while (cx >= 0 && cx < state.gridCols && cy >= 0 && cy < state.gridRows) {
        const scanTile = mutableTiles.get(tileKey(cx, cy));
        const scanDef = scanTile ? getTileDefinition(scanTile.tileType) : undefined;
        if (scanDef?.behavior === 'blocks_without_boat' && !updatedExplorer.hasBoat) break;
        landX = cx; landY = cy;
        cx += dx; cy += dy;
      }
    }

    if (landX !== target.x || landY !== target.y) {
      revealTile(mutableTiles, landX, landY);
      updatedExplorer = collectFromTile(updatedExplorer, landX, landY, mutableTiles, mutablePlayers);
      updatedExplorer = { ...updatedExplorer, x: landX, y: landY };
    }
  }

  mutableExplorers.set(explorerId, updatedExplorer);

  return {
    ...workingState,
    tiles: mutableTiles,
    explorers: mutableExplorers,
    players: mutablePlayers,
  };
}

/** Highest-scoring player id, deterministic first-wins tiebreak. Null if no
 * players. Shared by the turn-limit and all-treasure end conditions. */
function scoreLeader(state: GameState): string | null {
  let winner: string | null = null;
  let best = -1;
  for (const [id, player] of state.players) {
    if (player.score > best) {
      best = player.score;
      winner = id;
    }
  }
  return winner;
}

export function checkWinCondition(state: GameState): string | null {
  // Turn/time limit (GDD "time limit runs out") — checked first so it acts as a
  // universal backstop: a match ALWAYS terminates once the cap is hit, whatever
  // the configured win condition, with the score leader winning. Guards against
  // stalls where sparse treasure is never collected.
  if (state.maxTurns != null && state.maxTurns > 0 && state.turn.turnNumber >= state.maxTurns) {
    return scoreLeader(state);
  }

  if (state.winCondition === 'score_target' && state.scoreTarget != null) {
    let topPlayerId: string | null = null;
    let topScore = 0;
    let allReachedTarget = false;
    for (const [id, player] of state.players) {
      if (player.score >= state.scoreTarget) {
        allReachedTarget = true;
        if (player.score > topScore) {
          topScore = player.score;
          topPlayerId = id;
        }
      }
    }
    if (allReachedTarget && topPlayerId) return topPlayerId;
  }

  if (state.winCondition === 'all_treasure') {
    const anyTileHasTreasure = [...state.tiles.values()].some(
      t => t.treasureValue > 0 || (t.treasureType !== 'none' && t.treasureType !== ''),
    );
    const anyExplorerHasTreasure = [...state.explorers.values()].some(
      e => e.coinCount > 0 || e.otherItems.length > 0,
    );

    if (!anyTileHasTreasure && !anyExplorerHasTreasure) {
      return scoreLeader(state);
    }
  }

  return null;
}
