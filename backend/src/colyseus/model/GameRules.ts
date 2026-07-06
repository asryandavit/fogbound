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

export function isValidMove(
  state: GameState,
  explorerId: string,
  target: Coord,
): boolean {
  const explorer = state.explorers.get(explorerId);
  if (!explorer) return false;
  if (explorer.playerId !== state.turn.currentPlayerId) return false;

  const dx = Math.abs(explorer.x - target.x);
  const dy = Math.abs(explorer.y - target.y);
  if (dx + dy !== 1) return false;

  if (target.x < 0 || target.x >= state.gridCols) return false;
  if (target.y < 0 || target.y >= state.gridRows) return false;

  const tile = state.tiles.get(tileKey(target.x, target.y));
  if (tile && tile.tileType === 'water' && !explorer.hasBoat) return false;

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
      // After combat, re-read mutable maps
      explorer = workingState.explorers.get(explorerId)!;
      break;
    }
  }

  const mutableExplorers = new Map(workingState.explorers);
  const mutableTiles = new Map(workingState.tiles);
  const mutablePlayers = new Map(workingState.players);

  // Move explorer
  let updatedExplorer: ExplorerState = { ...explorer, x: target.x, y: target.y };

  // Reveal tile
  let tile = mutableTiles.get(key);
  if (tile && !tile.isRevealed) {
    tile = { ...tile, isRevealed: true };
    mutableTiles.set(key, tile);
  }

  const player = mutablePlayers.get(explorer.playerId)!;
  const atBase = target.x === player.baseX && target.y === player.baseY;

  if (atBase && (updatedExplorer.coinCount > 0 || updatedExplorer.otherItems.length > 0)) {
    // Score inventory on base return
    const scored = updatedExplorer.coinCount + updatedExplorer.otherItems.length;
    mutablePlayers.set(explorer.playerId, { ...player, score: player.score + scored });
    updatedExplorer = { ...updatedExplorer, coinCount: 0, otherItems: [] };
  } else if (tile && tile.treasureValue > 0) {
    // Collect coins from tile
    const canPickUp = Math.min(tile.treasureValue, maxCoins(updatedExplorer) - updatedExplorer.coinCount);
    if (canPickUp > 0) {
      updatedExplorer = { ...updatedExplorer, coinCount: updatedExplorer.coinCount + canPickUp };
      mutableTiles.set(key, { ...tile, treasureValue: tile.treasureValue - canPickUp });
    }
  } else if (tile && tile.treasureType !== 'none' && tile.treasureType !== '' && tile.treasureValue === 0) {
    // Collect a non-coin item if inventory has space
    if (updatedExplorer.otherItems.length < maxOtherItems(updatedExplorer)) {
      updatedExplorer = {
        ...updatedExplorer,
        otherItems: [...updatedExplorer.otherItems, tile.treasureType],
        hasBag: tile.treasureType === 'bag' ? true : updatedExplorer.hasBag,
        hasShield: tile.treasureType === 'shield' ? true : updatedExplorer.hasShield,
        hasBoat: tile.treasureType === 'boat' ? true : updatedExplorer.hasBoat,
      };
      mutableTiles.set(key, { ...tile, treasureType: 'none' });
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
