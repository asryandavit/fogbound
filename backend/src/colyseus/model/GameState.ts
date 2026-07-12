export interface Coord {
  readonly x: number;
  readonly y: number;
}

export interface TileState {
  readonly x: number;
  readonly y: number;
  readonly tileType: string;
  readonly isRevealed: boolean;
  readonly treasureType: string;
  readonly treasureValue: number;
}

export interface ExplorerState {
  readonly explorerId: string;
  readonly playerId: string;
  readonly x: number;
  readonly y: number;
  readonly coinCount: number;
  readonly otherItems: readonly string[];
  readonly hasBag: boolean;
  readonly hasBoat: boolean;
  readonly hasShield: boolean;
  readonly immobilizedUntilTurn: number; // 0 = free; blocked while state.turn.turnNumber <= this
}

export interface PlayerState {
  readonly playerId: string;
  readonly username: string;
  readonly score: number;
  readonly isBot: boolean;
  readonly isConnected: boolean;
  readonly slotNumber: number;
  readonly teamColor: string;
  readonly baseX: number;
  readonly baseY: number;
}

export interface TurnState {
  readonly currentPlayerId: string;
  readonly turnNumber: number;
  readonly phase: 'move' | 'resolve' | 'end';
}

export interface GameState {
  readonly matchId: string;
  readonly status: 'pending' | 'in_progress' | 'finished' | 'abandoned';
  readonly gridCols: number;
  readonly gridRows: number;
  readonly tiles: ReadonlyMap<string, TileState>;
  readonly explorers: ReadonlyMap<string, ExplorerState>;
  readonly players: ReadonlyMap<string, PlayerState>;
  readonly turn: TurnState;
  readonly winCondition: 'all_treasure' | 'time_limit' | 'score_target';
  readonly scoreTarget?: number;
  /** Hard cap on turnNumber. When turn.turnNumber reaches it, the match ends
   * and the score leader wins — the GDD "time limit runs out" condition, and a
   * universal backstop so a match can never run forever (e.g. scattered
   * treasure the bots never reach). 0 / undefined = no cap. */
  readonly maxTurns?: number;
}

export function tileKey(x: number, y: number): string {
  return `${x},${y}`;
}

export function maxCoins(explorer: ExplorerState): number {
  return explorer.hasBag ? 5 : 3;
}

export function maxOtherItems(explorer: ExplorerState): number {
  return explorer.hasBag ? 2 : 1;
}
