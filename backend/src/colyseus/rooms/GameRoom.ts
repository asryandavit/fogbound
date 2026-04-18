import { Room, Client } from 'colyseus'
import { GameState } from '../schemas/GameState'
import { TileSchema } from '../schemas/TileSchema'
import { ExplorerSchema } from '../schemas/ExplorerSchema'
import { PlayerSchema } from '../schemas/PlayerSchema'

export class GameRoom extends Room<GameState> {
  private turnTimer: any = null
  private botMoveCounts: Map<string, number> = new Map()

  onCreate(options: any) {
    this.setState(new GameState())
    this.state.matchId = options.matchId || `match_${Date.now()}`
    this.state.winCondition = options.winCondition || 'all_treasure'
    this.state.turnTimerSeconds = options.turnTimerSeconds || 60
    this.setPatchRate(50)
    this.initializeBoard(options.gridRows || 13, options.gridCols || 13)
    this.onMessage('move_explorer', (client, message) => {
      this.handleMoveExplorer(client, message)
    })
    this.onMessage('end_turn', (client, _message) => {
      this.handleEndTurn(client)
    })
    console.log(`GameRoom created: ${this.state.matchId}`)
  }

  async onJoin(client: Client, options: any) {
    const playerId = options.playerId || client.sessionId
    const username = options.username || 'Player'
    const slotNumber = this.state.players.size
    const colors = ['red', 'blue', 'green', 'yellow']
    const player = new PlayerSchema()
    player.playerId = playerId
    player.username = username
    player.slotNumber = slotNumber
    player.teamColor = colors[slotNumber] || 'red'
    player.isConnected = true
    this.state.players.set(playerId, player)
    console.log(`Player joined: ${username} (${playerId})`)
    if (this.state.players.size >= 2) {
      this.startMatch()
    }
  }

  async onLeave(client: Client, consented: boolean) {
    const player = this.findPlayerBySession(client.sessionId)
    if (!player) return
    player.isConnected = false
    console.log(`Player disconnected: ${player.playerId}`)
    if (!consented) {
      try {
        await this.allowReconnection(client, 60)
        player.isConnected = true
        console.log(`Player reconnected: ${player.playerId}`)
      } catch {
        player.isBot = true
        this.botMoveCounts.set(player.playerId, 0)
        console.log(`Player replaced by bot: ${player.playerId}`)
        this.checkAllBots()
      }
    }
  }

  onDispose() {
    if (this.turnTimer) clearTimeout(this.turnTimer)
    console.log(`GameRoom disposed: ${this.state.matchId}`)
  }

  private initializeBoard(rows: number, cols: number) {
    for (let x = 0; x < cols; x++) {
      for (let y = 0; y < rows; y++) {
        const tile = new TileSchema()
        tile.x = x
        tile.y = y
        tile.tileType = 'grass'
        tile.isRevealed = false
        const key = `${x}_${y}`
        this.state.tiles.set(key, tile)
      }
    }
    this.revealStartingRows(rows, cols)
  }

  private revealStartingRows(rows: number, cols: number) {
    for (let x = 0; x < cols; x++) {
      const bottom = this.state.tiles.get(`${x}_0`)
      if (bottom) bottom.isRevealed = true
      const top = this.state.tiles.get(`${x}_${rows - 1}`)
      if (top) top.isRevealed = true
    }
  }

  private startMatch() {
    this.state.status = 'in_progress'
    const firstPlayerId = Array.from(this.state.players.keys())[0] as string
    this.state.currentPlayerId = firstPlayerId
    this.startTurnTimer()
    console.log(`Match started: ${this.state.matchId}`)
  }

  private startTurnTimer() {
    if (this.turnTimer) clearTimeout(this.turnTimer)
    this.turnTimer = setTimeout(() => {
      this.advanceTurn()
    }, this.state.turnTimerSeconds * 1000)
  }

  private advanceTurn() {
    const playerIds = Array.from(this.state.players.keys()) as string[]
    const currentIndex = playerIds.indexOf(this.state.currentPlayerId)
    const nextIndex = (currentIndex + 1) % playerIds.length
    this.state.currentPlayerId = playerIds[nextIndex]
    this.state.currentTurn++
    const nextPlayer = this.state.players.get(this.state.currentPlayerId)
    if (nextPlayer?.isBot) {
      const botCount = (this.botMoveCounts.get(this.state.currentPlayerId) || 0) + 1
      this.botMoveCounts.set(this.state.currentPlayerId, botCount)
      if (botCount >= 3) {
        nextPlayer.isBot = true
      }
      setTimeout(() => this.advanceTurn(), 2000)
    } else {
      this.startTurnTimer()
    }
  }

  private handleMoveExplorer(client: Client, message: any) {
    const player = this.findPlayerBySession(client.sessionId)
    if (!player) return
    if (player.playerId !== this.state.currentPlayerId) {
      client.send('error', { message: 'NOT_YOUR_TURN' })
      return
    }
    const { explorerId, targetX, targetY } = message
    const explorer = this.state.explorers.get(explorerId)
    if (!explorer) return
    if (explorer.playerId !== player.playerId) return
    if (!this.isValidMove(explorer, targetX, targetY)) {
      client.send('error', { message: 'INVALID_MOVE' })
      return
    }
    explorer.x = targetX
    explorer.y = targetY
    const tileKey = `${targetX}_${targetY}`
    const tile = this.state.tiles.get(tileKey)
    if (tile && !tile.isRevealed) {
      tile.isRevealed = true
    }
    this.advanceTurn()
  }

  private handleEndTurn(client: Client) {
    const player = this.findPlayerBySession(client.sessionId)
    if (!player) return
    if (player.playerId !== this.state.currentPlayerId) return
    this.advanceTurn()
  }

  private isValidMove(
    explorer: ExplorerSchema,
    targetX: number,
    targetY: number
  ): boolean {
    const dx = Math.abs(explorer.x - targetX)
    const dy = Math.abs(explorer.y - targetY)
    if (dx + dy !== 1) return false
    const tileKey = `${targetX}_${targetY}`
    const tile = this.state.tiles.get(tileKey)
    if (!tile) return false
    if (tile.tileType === 'water' && !explorer.hasBoat) return false
    return true
  }

  private findPlayerBySession(sessionId: string): PlayerSchema | null {
    for (const [, player] of this.state.players) {
      if ((player as any)._sessionId === sessionId) return player
    }
    return null
  }

  private checkAllBots() {
    const allBots = Array.from(this.state.players.values()).every(p => (p as PlayerSchema).isBot)
    if (allBots) {
      this.state.status = 'abandoned'
      console.log('All players are bots — match abandoned')
      this.disconnect()
    }
  }
}
