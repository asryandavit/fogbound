import { Room, Client } from 'colyseus';
import { FogboundState } from '../schemas/FogboundState';
import { TileSchema } from '../schemas/TileSchema';
import { ExplorerSchema } from '../schemas/ExplorerSchema';
import { PlayerSchema } from '../schemas/PlayerSchema';
import { isValidMove, applyMove, checkWinCondition } from '../model/GameRules';
import { GameState, TileState, ExplorerState, PlayerState, tileKey } from '../model/GameState';
import { placeTreasure } from '../model/BoardSetup';
import { chooseBotAction } from '../model/BotAI';
import { releasePreMatchSeat } from './PlayerSlots';

const COLORS = ['red', 'blue', 'green', 'yellow'];
const EXPLORERS_PER_PLAYER: Record<number, number> = {
  7: 1, 9: 1,
  11: 2, 13: 2,
  15: 3, 17: 3,
};
const BOT_THINK_MS = 900;
// Universal safety cap so a match always terminates (GDD "time limit runs
// out"): if turnNumber reaches this, the score leader wins. Generous enough
// that an actively-played match ends on treasure/score first; this only bites
// worst-case stalls (e.g. all-bot idle play leaving scattered treasure).
const DEFAULT_MAX_TURNS = 300;

export class GameRoom extends Room<{ state: FogboundState }> {
  private readonly sessionToPlayerId = new Map<string, string>();
  private turnTimer: ReturnType<typeof setTimeout> | null = null;

  onCreate(options: any) {
    // Two-player game: cap real client connections at 2 so matchmaking
    // (join_or_create for "vs Player") never over-fills a room. A synthetic
    // bot is NOT a client connection, so a solo-bot room shows 1/2 here and
    // is additionally lock()ed on bot add (see onJoin) to keep matchmaking
    // from dropping a second human into it.
    this.maxClients = 2;

    this.state = new FogboundState();
    this.state.matchId = options.matchId || `match_${Date.now()}`;
    this.state.winCondition = options.winCondition || 'all_treasure';
    this.state.turnTimerSeconds = options.turnTimerSeconds || 60;
    // ?? not ||: an explicit maxTurns of 0 (opt-in unlimited) is honored.
    this.state.maxTurns = options.maxTurns ?? DEFAULT_MAX_TURNS;
    this.setPatchRate(50);

    const rows: number = options.gridRows || 13;
    const cols: number = options.gridCols || 13;
    this.initializeBoard(rows, cols);

    this.onMessage('move_explorer', (client, message) => this.handleMoveExplorer(client, message));
    this.onMessage('end_turn', (client) => this.handleEndTurn(client));

    this.logRoom('created');
    console.log(`GameRoom created: ${this.state.matchId}`);
  }

  async onJoin(client: Client, options: any) {
    // Defense in depth (Decision 099): once locked (below), Colyseus's
    // own matchmaking never routes a new join_or_create here — but a stray
    // direct join must never silently create a 3rd/4th slot either. This
    // is what actually bounds addPlayer's slot count, not just an
    // assumption that callers behave.
    if (this.state.players.size >= this.maxClients) {
      client.leave(4000, 'Room is full');
      return;
    }

    const playerId: string = options.playerId || client.sessionId;
    const username: string = options.username || 'Player';

    this.sessionToPlayerId.set(client.sessionId, playerId);
    this.addPlayer(playerId, username, false);
    console.log(`Player joined: ${username} (${playerId})`);

    // Solo-vs-bot: if this is the first (and so far only) player and they
    // asked for a bot opponent, spawn one immediately rather than waiting
    // for a second human — otherwise there is no way to play alone.
    if (options.vsBot && this.state.players.size === 1) {
      this.addPlayer(`bot_${playerId}`, 'Bot', true);
      console.log(`Bot opponent added for solo match: ${this.state.matchId}`);
    }

    if (this.state.players.size >= 2) {
      // Lock the moment both slots are filled — vs-Player and solo-vs-bot
      // alike (previously only the solo-bot path locked here). An EXPLICIT
      // lock() persists across any later disconnect; Colyseus's own
      // automatic lock (from reaching maxClients) does not — it is undone
      // the instant a client disconnects unless locked explicitly (Decision
      // 099). This is what closes the stale-match-resume gap at its source:
      // a fresh "Play" can never join_or_create into this room again, no
      // matter what happens to either client afterward.
      this.lock();
      this.logRoom('locked');
      this.startMatch();
    }
  }

  async onLeave(client: Client, code?: number) {
    const player = this.findPlayerBySession(client.sessionId);
    if (!player) return;
    player.isConnected = false;
    console.log(`Player disconnected: ${player.playerId}`);

    // Pre-match only (Decision 101): the seat is released outright instead of
    // entering the reconnection window, so a rejoin inside those 60s cannot be
    // seated behind the joiner's own abandoned entry. Once the match is under
    // way this returns false and everything below runs exactly as before.
    if (releasePreMatchSeat(this.state, player.playerId)) {
      this.sessionToPlayerId.delete(client.sessionId);
      this.logRoom('seat_released', { playerId: player.playerId, playersRemaining: this.state.players.size });
      return;
    }

    // Every disconnect — an intentional Exit/Play Again as much as an
    // accidental drop — goes through the same 60s reconnection window here.
    // The Godot client's native SDK does not distinguish these: `leave()`
    // was confirmed live to close with code 1006 (abnormal) even for a
    // deliberate Exit tap, so a code-based fast path is unreachable dead
    // code with this client, not a real optimization. This does not weaken
    // point 4 (room destroyed once emptied of humans) — it just means that
    // guarantee lands up to 60s later than an intentional leave alone could
    // in principle allow, which matches the existing accepted design for
    // accidental disconnects (Decision 045) rather than regressing it.
    try {
      await this.allowReconnection(client, 60);
      player.isConnected = true;
      console.log(`Player reconnected: ${player.playerId}`);
    } catch {
      this.convertToBotAndCheckEmpty(player);
    }
  }

  onDispose() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.logRoom('disposed');
    console.log(`GameRoom disposed: ${this.state.matchId}`);
  }

  /** One structured log line per room lifecycle event (created, locked,
   *  disposing, disposed) — mirrors logAction's shape (Decision 093) for
   *  room-level rather than per-move events. Non-sensitive: ids/counts only. */
  private logRoom(phase: string, fields: Record<string, unknown> = {}): void {
    console.log(JSON.stringify({ event: 'room', roomId: this.roomId, matchId: this.state.matchId, phase, ...fields }));
  }

  /** A player who will never return this session (permanently disconnected,
   *  or an intentional leave) is converted to a bot so their opponent isn't
   *  stuck waiting on a turn that can never come — same behavior GDD already
   *  specifies for accidental drops (Decision 011/012/029), applied here to
   *  the accidental-AND-intentional cases uniformly. checkAllBots then
   *  destroys the room once every remaining player is a bot (point 3/4). */
  private convertToBotAndCheckEmpty(player: PlayerSchema): void {
    player.isBot = true;
    console.log(`Player replaced by bot: ${player.playerId}`);
    this.broadcast('player_afk_bot_controlling', { playerId: player.playerId });
    this.checkAllBots();
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private initializeBoard(rows: number, cols: number) {
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const tile = new TileSchema();
        tile.x = x;
        tile.y = y;
        tile.tileType = 'grass';
        tile.isRevealed = false;
        this.state.tiles.set(tileKey(x, y), tile);
      }
    }
    for (let x = 0; x < cols; x++) {
      const bottom = this.state.tiles.get(tileKey(x, 0));
      if (bottom) bottom.isRevealed = true;
      const top = this.state.tiles.get(tileKey(x, rows - 1));
      if (top) top.isRevealed = true;
    }

    for (const placement of placeTreasure(rows, cols)) {
      const tile = this.state.tiles.get(tileKey(placement.x, placement.y));
      if (!tile) continue;
      tile.treasureType = placement.treasureType;
      tile.treasureValue = placement.treasureValue;
    }
  }

  /** Every caller (onJoin's human path, onJoin's solo-bot path) is guarded
   *  to run only while this.state.players.size < maxClients (point 6) — the
   *  onJoin guard above refuses a 3rd join outright, so `slot` here never
   *  exceeds 1. A pre-match departure releases its seat (Decision 101), so
   *  map size stays a correct allocator for the only phase that allocates;
   *  in-match departures keep their entry permanently for bot takeover
   *  (Decisions 011/012/029). */
  private addPlayer(playerId: string, username: string, isBot: boolean): void {
    const slot = this.state.players.size;
    const cols = this.boardCols();
    const rows = this.boardRows();
    const baseX = Math.floor(cols / 2);
    const baseY = slot === 0 ? 0 : rows - 1;

    const player = new PlayerSchema();
    player.playerId = playerId;
    player.username = username;
    player.slotNumber = slot;
    player.teamColor = COLORS[slot] || 'red';
    player.isConnected = !isBot;
    player.isBot = isBot;
    player.baseX = baseX;
    player.baseY = baseY;
    this.state.players.set(playerId, player);

    this.spawnExplorers(playerId, slot, baseX, baseY, rows, cols);
  }

  private spawnExplorers(playerId: string, slot: number, baseX: number, baseY: number, rows: number, cols: number) {
    const count = EXPLORERS_PER_PLAYER[cols] ?? 2;
    const spacing = Math.floor(cols / (count + 1));
    for (let i = 0; i < count; i++) {
      const explorerId = `${playerId}_e${i}`;
      const x = spacing * (i + 1);
      const explorer = new ExplorerSchema();
      explorer.explorerId = explorerId;
      explorer.playerId = playerId;
      explorer.x = x;
      explorer.y = baseY;
      this.state.explorers.set(explorerId, explorer);
    }
  }

  private startMatch() {
    this.state.status = 'in_progress';
    const firstPlayerId = [...this.state.players.keys()][0] as string;
    this.state.turnState.currentPlayerId = firstPlayerId;
    this.state.turnState.turnNumber = 1;
    this.startTurnTimer();
    console.log(`Match started: ${this.state.matchId}`);
  }

  private startTurnTimer() {
    if (this.turnTimer) clearTimeout(this.turnTimer);
    const playerId = this.state.turnState.currentPlayerId;
    // GDD: "When the timer expires, the game auto-selects the safest legal
    // move" — reuses the same bot brain rather than a bare turn-skip.
    this.turnTimer = setTimeout(() => this.playAutoTurn(playerId), this.state.turnTimerSeconds * 1000);
  }

  private advanceTurn() {
    const playerIds = [...this.state.players.keys()] as string[];
    const current = this.state.turnState.currentPlayerId;
    const idx = playerIds.indexOf(current);
    const next = playerIds[(idx + 1) % playerIds.length];
    this.state.turnState.currentPlayerId = next;
    this.state.turnState.turnNumber++;

    const nextPlayer = this.state.players.get(next);
    if (nextPlayer?.isBot) {
      const botCount = (nextPlayer as PlayerSchema & { _botMoves?: number })._botMoves ?? 0;
      (nextPlayer as PlayerSchema & { _botMoves?: number })._botMoves = botCount + 1;
      if (botCount + 1 >= 3) {
        this.broadcast('player_afk_bot_controlling', { playerId: next });
      }
      setTimeout(() => this.playAutoTurn(next), BOT_THINK_MS);
    } else {
      this.startTurnTimer();
    }
  }

  /** Plays one action (move, or pass if none is worth making) for playerId
   * using the server-side bot brain (Decision 003 — never client-side), then
   * advances the turn. Used both for actual bot-controlled players and for
   * a human whose turn timer expired (GDD: auto-select the safest legal
   * move rather than a bare skip). */
  private playAutoTurn(playerId: string) {
    if (this.state.status === 'finished') return;
    if (this.state.turnState.currentPlayerId !== playerId) return; // stale timer

    const pureState = this.toPureState();
    const action = chooseBotAction(pureState, playerId);
    if (action.type === 'move') {
      const nextState = applyMove(pureState, action.explorerId, action.target);
      this.applyPureState(nextState);
      if (this.checkForWinner()) return;
    }
    this.advanceTurn();
  }

  private handleMoveExplorer(client: Client, message: any) {
    const player = this.findPlayerBySession(client.sessionId);
    if (!player) return;

    const { explorerId, targetX, targetY } = message as { explorerId: string; targetX: number; targetY: number };
    const turn = this.state.turnState.turnNumber;
    const matchId = this.state.matchId;
    const playerId = player.playerId;

    if (playerId !== this.state.turnState.currentPlayerId) {
      this.logAction(matchId, turn, playerId, 'move_explorer',
        { explorerId, targetX, targetY }, 'rejected:NOT_YOUR_TURN');
      client.send('error', { code: 'NOT_YOUR_TURN' });
      return;
    }

    const pureState = this.toPureState();
    if (!isValidMove(pureState, explorerId, { x: targetX, y: targetY })) {
      this.logAction(matchId, turn, playerId, 'move_explorer',
        { explorerId, targetX, targetY }, 'rejected:INVALID_MOVE');
      client.send('error', { code: 'INVALID_MOVE' });
      return;
    }

    this.logAction(matchId, turn, playerId, 'move_explorer',
      { explorerId, targetX, targetY }, 'accepted');
    const nextState = applyMove(pureState, explorerId, { x: targetX, y: targetY });
    this.applyPureState(nextState);
    if (this.checkForWinner()) return;
    this.advanceTurn();
  }

  private handleEndTurn(client: Client) {
    const player = this.findPlayerBySession(client.sessionId);
    if (!player) return;
    if (player.playerId !== this.state.turnState.currentPlayerId) return;
    this.logAction(this.state.matchId, this.state.turnState.turnNumber,
      player.playerId, 'end_turn', {}, 'accepted');
    this.advanceTurn();
  }

  /** One structured log line per player action — match_id, turn, player_id,
   *  action, payload summary, verdict. Non-sensitive: coords and IDs only. */
  private logAction(
    matchId: string, turn: number, playerId: string,
    action: string, payload: Record<string, unknown>, verdict: string,
  ): void {
    console.log(JSON.stringify({ event: 'action', matchId, turn, playerId, action, payload, verdict }));
  }

  /** Returns true (and ends the match) if checkWinCondition now reports a
   *  winner. checkWinCondition (Decision 073) already checks the turn-limit
   *  backstop before all_treasure/score_target, so this single path covers
   *  every win/turn-limit termination — no room may outlive its match
   *  (point 3): once finished, it is disposed, never left to linger. */
  private checkForWinner(): boolean {
    const winnerId = checkWinCondition(this.toPureState());
    if (!winnerId) return false;
    this.state.status = 'finished';
    this.state.winnerId = winnerId;
    if (this.turnTimer) clearTimeout(this.turnTimer);
    this.broadcast('match_ended', { winnerId });
    console.log(`Match ended: ${this.state.matchId}, winner=${winnerId}`);
    this.logRoom('disposing', { reason: 'match_ended', winnerId });
    void this.disconnect();
    return true;
  }

  private findPlayerBySession(sessionId: string): PlayerSchema | null {
    const playerId = this.sessionToPlayerId.get(sessionId);
    if (!playerId) return null;
    return this.state.players.get(playerId) || null;
  }

  private boardCols(): number {
    return Math.round(Math.sqrt(this.state.tiles.size)) || 13;
  }

  private boardRows(): number {
    return this.boardCols();
  }

  /** Destroys the room once it has emptied of humans (point 4) — every
   *  remaining player permanently bot-controlled, whether via reconnection
   *  timeout, an intentional leave, or a from-the-start solo-vs-bot match. */
  private checkAllBots() {
    const allBots = [...this.state.players.values()].every(p => p.isBot);
    if (allBots) {
      this.state.status = 'abandoned';
      console.log('All players are bots — match abandoned');
      this.logRoom('disposing', { reason: 'all_bots_abandoned' });
      void this.disconnect();
    }
  }

  // ─── Pure model bridge ────────────────────────────────────────────────────

  private toPureState(): GameState {
    const tiles = new Map<string, TileState>();
    for (const [k, t] of this.state.tiles) {
      tiles.set(k, {
        x: t.x, y: t.y,
        tileType: t.tileType,
        isRevealed: t.isRevealed,
        treasureType: t.treasureType,
        treasureValue: t.treasureValue,
      });
    }

    const explorers = new Map<string, ExplorerState>();
    for (const [k, e] of this.state.explorers) {
      explorers.set(k, {
        explorerId: e.explorerId,
        playerId: e.playerId,
        x: e.x, y: e.y,
        coinCount: e.coinCount,
        otherItems: [],
        hasBag: e.hasBag,
        hasBoat: e.hasBoat,
        hasShield: e.hasShield,
        immobilizedUntilTurn: e.immobilizedUntilTurn,
      });
    }

    const players = new Map<string, PlayerState>();
    for (const [k, p] of this.state.players) {
      players.set(k, {
        playerId: p.playerId,
        username: p.username,
        score: p.score,
        isBot: p.isBot,
        isConnected: p.isConnected,
        slotNumber: p.slotNumber,
        teamColor: p.teamColor,
        baseX: p.baseX,
        baseY: p.baseY,
      });
    }

    return {
      matchId: this.state.matchId,
      status: this.state.status as GameState['status'],
      gridCols: this.boardCols(),
      gridRows: this.boardRows(),
      tiles,
      explorers,
      players,
      turn: {
        currentPlayerId: this.state.turnState.currentPlayerId,
        turnNumber: this.state.turnState.turnNumber,
        phase: this.state.turnState.phase as GameState['turn']['phase'],
      },
      winCondition: this.state.winCondition as GameState['winCondition'],
      maxTurns: this.state.maxTurns,
    };
  }

  private applyPureState(next: GameState) {
    for (const [k, t] of next.tiles) {
      const schema = this.state.tiles.get(k);
      if (!schema) continue;
      if (schema.isRevealed !== t.isRevealed) schema.isRevealed = t.isRevealed;
      if (schema.treasureType !== t.treasureType) schema.treasureType = t.treasureType;
      if (schema.treasureValue !== t.treasureValue) schema.treasureValue = t.treasureValue;
    }

    for (const [k, e] of next.explorers) {
      const schema = this.state.explorers.get(k);
      if (!schema) continue;
      if (schema.x !== e.x) schema.x = e.x;
      if (schema.y !== e.y) schema.y = e.y;
      if (schema.coinCount !== e.coinCount) schema.coinCount = e.coinCount;
      if (schema.hasBag !== e.hasBag) schema.hasBag = e.hasBag;
      if (schema.hasBoat !== e.hasBoat) schema.hasBoat = e.hasBoat;
      if (schema.hasShield !== e.hasShield) schema.hasShield = e.hasShield;
      if (schema.immobilizedUntilTurn !== e.immobilizedUntilTurn) schema.immobilizedUntilTurn = e.immobilizedUntilTurn;
    }

    for (const [k, p] of next.players) {
      const schema = this.state.players.get(k);
      if (!schema) continue;
      if (schema.score !== p.score) schema.score = p.score;
    }
  }
}
