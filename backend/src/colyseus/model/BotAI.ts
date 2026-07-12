import { GameState, Coord, ExplorerState, PlayerState, tileKey } from './GameState';
import { isValidMove, applyMove, checkWinCondition } from './GameRules';
import { getTileDefinition, directionDelta } from './TileRegistry';

export type BotAction =
  | { type: 'move'; explorerId: string; target: Coord }
  | { type: 'end_turn' };

const SIMULATIONS = 150;
// Per-ply discounting (see PER_PLY_DISCOUNT below) already makes earlier
// value capture strictly better than later, so this can afford genuine
// lookahead without losing the "prefer efficient play" property.
const MAX_ROLLOUT_PLIES = 16;
const RANDOM_ROLLOUT_MOVE_CHANCE = 0.15;
const UCB1_EXPLORATION = Math.SQRT2;

interface ActionStats {
  action: BotAction;
  visits: number;
  totalValue: number;
}

/**
 * Server-side-only bot decision maker (Decision 003 — MCTS bot never runs
 * client-side). Root-level UCB1 Monte Carlo: each turn is exactly one
 * explorer move (or pass), so the branching factor is small — at most
 * (explorers × 4 directions) + 1 — making a flat, root-only search over
 * every candidate tractable within a single synchronous call.
 */
export function chooseBotAction(
  state: GameState,
  playerId: string,
  rng: () => number = Math.random,
): BotAction {
  const candidates = enumerateActions(state, playerId);
  if (candidates.length === 0) return { type: 'end_turn' };
  if (candidates.length === 1) return candidates[0];

  const stats: ActionStats[] = candidates.map(action => ({ action, visits: 0, totalValue: 0 }));

  for (let i = 0; i < SIMULATIONS; i++) {
    const chosen = selectByUcb1(stats, i);
    const childState = applyAction(state, playerId, chosen.action);
    const value = rollout(childState, playerId, rng);
    chosen.visits++;
    chosen.totalValue += value;
  }

  let best = stats[0];
  for (const s of stats) {
    if (s.visits > 0 && (best.visits === 0 || s.totalValue / s.visits > best.totalValue / best.visits)) {
      best = s;
    }
  }
  return best.action;
}

function selectByUcb1(stats: ActionStats[], totalSimsSoFar: number): ActionStats {
  const untried = stats.find(s => s.visits === 0);
  if (untried) return untried;

  let best = stats[0];
  let bestUcb = -Infinity;
  for (const s of stats) {
    const exploitation = s.totalValue / s.visits;
    const exploration = UCB1_EXPLORATION * Math.sqrt(Math.log(totalSimsSoFar + 1) / s.visits);
    const ucb = exploitation + exploration;
    if (ucb > bestUcb) {
      bestUcb = ucb;
      best = s;
    }
  }
  return best;
}

function enumerateActions(state: GameState, playerId: string): BotAction[] {
  const actions: BotAction[] = [];
  for (const explorer of state.explorers.values()) {
    if (explorer.playerId !== playerId) continue;
    const targets: Coord[] = [
      { x: explorer.x + 1, y: explorer.y },
      { x: explorer.x - 1, y: explorer.y },
      { x: explorer.x, y: explorer.y + 1 },
      { x: explorer.x, y: explorer.y - 1 },
    ];
    for (const target of targets) {
      if (isValidMove(state, explorer.explorerId, target)) {
        actions.push({ type: 'move', explorerId: explorer.explorerId, target });
      }
    }
  }
  actions.push({ type: 'end_turn' });
  return actions;
}

function advanceTurnPure(state: GameState, playerIds: string[]): GameState {
  const idx = playerIds.indexOf(state.turn.currentPlayerId);
  const nextPlayerId = playerIds[(idx + 1) % playerIds.length];
  return {
    ...state,
    turn: { ...state.turn, currentPlayerId: nextPlayerId, turnNumber: state.turn.turnNumber + 1 },
  };
}

function applyAction(state: GameState, playerId: string, action: BotAction): GameState {
  const playerIds = [...state.players.keys()];
  if (action.type === 'move') {
    return advanceTurnPure(applyMove(state, action.explorerId, action.target), playerIds);
  }
  return advanceTurnPure(state, playerIds);
}

const PER_PLY_DISCOUNT = 0.9;
const WIN_LOSS_REWARD = 5;
const FINAL_SHAPING_WEIGHT = 0.3;

/** Simulates forward with a fast heuristic policy for every player (self-play
 * rollout). Rewards are discounted per ply so delivering the SAME outcome
 * sooner scores strictly higher than later — without this, a fixed-horizon
 * rollout can't tell "grab it now" from "grab it in two turns" whenever both
 * finish within the horizon, which produced a bot indifferent to efficiency
 * (and flaky tests) on early attempts. */
function rollout(initialState: GameState, botPlayerId: string, rng: () => number): number {
  let state = initialState;
  let discount = 1;
  let cumulative = 0;

  for (let ply = 0; ply < MAX_ROLLOUT_PLIES; ply++) {
    const winner = checkWinCondition(state);
    if (winner) return cumulative + discount * (winner === botPlayerId ? WIN_LOSS_REWARD : -WIN_LOSS_REWARD);

    const currentPlayerId = state.turn.currentPlayerId;
    const action = pickHeuristicAction(state, currentPlayerId, rng);
    const nextState = applyAction(state, currentPlayerId, action);

    const scoreDelta = netScoreDelta(state, nextState, botPlayerId);
    cumulative += discount * scoreDelta;
    discount *= PER_PLY_DISCOUNT;
    state = nextState;
  }

  return cumulative + discount * FINAL_SHAPING_WEIGHT * evaluateHeuristic(state, botPlayerId);
}

/** How much bot's score improved relative to the best opponent's, this ply. */
function netScoreDelta(before: GameState, after: GameState, botPlayerId: string): number {
  const botDelta = (after.players.get(botPlayerId)?.score ?? 0) - (before.players.get(botPlayerId)?.score ?? 0);
  const oppDelta = maxOtherScore(after, botPlayerId) - maxOtherScore(before, botPlayerId);
  return botDelta - oppDelta;
}

function maxOtherScore(state: GameState, botPlayerId: string): number {
  let best = 0;
  for (const [id, p] of state.players) {
    if (id !== botPlayerId) best = Math.max(best, p.score);
  }
  return best;
}

function pickHeuristicAction(state: GameState, playerId: string, rng: () => number): BotAction {
  const candidates = enumerateActions(state, playerId);
  const moves = candidates.filter((a): a is Extract<BotAction, { type: 'move' }> => a.type === 'move');
  if (moves.length === 0) return { type: 'end_turn' };

  if (rng() < RANDOM_ROLLOUT_MOVE_CHANCE) {
    return moves[Math.floor(rng() * moves.length)];
  }

  const player = state.players.get(playerId)!;
  let best = moves[0];
  let bestScore = -Infinity;
  for (const candidate of moves) {
    const explorer = state.explorers.get(candidate.explorerId)!;
    const score = scoreMoveHeuristic(state, playerId, explorer, candidate.target, player);
    if (score > bestScore) {
      bestScore = score;
      best = candidate;
    }
  }
  return best;
}

function scoreMoveHeuristic(
  state: GameState,
  playerId: string,
  explorer: ExplorerState,
  target: Coord,
  player: PlayerState,
): number {
  let score = 0;

  const enemyAtTarget = [...state.explorers.values()].find(
    e => e.x === target.x && e.y === target.y && e.playerId !== playerId,
  );
  if (enemyAtTarget) {
    score += enemyAtTarget.hasShield ? -8 : 6 + enemyAtTarget.coinCount;
  }

  const tile = state.tiles.get(tileKey(target.x, target.y));
  if (tile) {
    if (tile.treasureValue > 0) score += 3 + tile.treasureValue;
    // Must include 'treasure', not just 'combat_item': a fully-drained coin
    // tile keeps treasureType:'coin'/treasureValue:0 (never reset), which
    // reaches here too — narrowing to 'combat_item' only would silently stop
    // scoring that (already-empty, harmless) case, not a new one.
    else if (['treasure', 'combat_item'].includes(getTileDefinition(tile.treasureType)?.category ?? '')) score += 3;
    if (!tile.isRevealed) score += 0.5;
  }

  // Compute effective landing position after arrow/cannon tile effects,
  // and apply trap penalty (immobilize = lose next turn = -4 opportunity cost).
  let effectiveX = target.x;
  let effectiveY = target.y;
  if (tile) {
    const def = getTileDefinition(tile.treasureType);
    if (def?.behavior === 'immobilize') {
      score -= 4;
    } else if (def?.behavior === 'arrow_push') {
      const { dx, dy } = directionDelta(def.direction);
      const nx = target.x + dx, ny = target.y + dy;
      if (nx >= 0 && nx < state.gridCols && ny >= 0 && ny < state.gridRows) {
        const nextT = state.tiles.get(tileKey(nx, ny));
        const nextDef = nextT ? getTileDefinition(nextT.tileType) : undefined;
        if (nextDef?.behavior !== 'blocks_without_boat' || explorer.hasBoat) {
          effectiveX = nx; effectiveY = ny;
        }
      }
    } else if (def?.behavior === 'cannon_launch') {
      const { dx, dy } = directionDelta(def.direction);
      let cx = target.x + dx, cy = target.y + dy;
      while (cx >= 0 && cx < state.gridCols && cy >= 0 && cy < state.gridRows) {
        const scanT = state.tiles.get(tileKey(cx, cy));
        const scanDef = scanT ? getTileDefinition(scanT.tileType) : undefined;
        if (scanDef?.behavior === 'blocks_without_boat' && !explorer.hasBoat) break;
        effectiveX = cx; effectiveY = cy;
        cx += dx; cy += dy;
      }
    }
  }

  const carryingTreasure = explorer.coinCount > 0 || explorer.otherItems.length > 0;
  if (carryingTreasure) {
    const distBefore = manhattan(explorer.x, explorer.y, player.baseX, player.baseY);
    const distAfter = manhattan(effectiveX, effectiveY, player.baseX, player.baseY);
    score += (distBefore - distAfter) * 2;
  }

  return score;
}

/** "Unfinished business" shaping for whatever's still in play when the
 * rollout horizon runs out — actual delivered score is already captured,
 * ply by ply, via netScoreDelta; this only values treasure the bot is
 * carrying but hasn't banked yet, weighted by how close it is to home. */
function evaluateHeuristic(state: GameState, botPlayerId: string): number {
  const bot = state.players.get(botPlayerId);
  if (!bot) return 0;

  let carryBonus = 0;
  for (const e of state.explorers.values()) {
    if (e.playerId !== botPlayerId) continue;
    if (e.coinCount > 0 || e.otherItems.length > 0) {
      const dist = manhattan(e.x, e.y, bot.baseX, bot.baseY);
      carryBonus += Math.max(0, 10 - dist) * 0.05;
    }
  }

  return carryBonus;
}

function manhattan(x1: number, y1: number, x2: number, y2: number): number {
  return Math.abs(x1 - x2) + Math.abs(y1 - y2);
}
