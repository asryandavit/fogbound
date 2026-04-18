import { Schema, MapSchema, type } from '@colyseus/schema'
import { TileSchema } from './TileSchema'
import { ExplorerSchema } from './ExplorerSchema'
import { PlayerSchema } from './PlayerSchema'

export class GameState extends Schema {
  @type('string') status: string = 'pending'
  @type('number') currentTurn: number = 0
  @type('string') currentPlayerId: string = ''
  @type('string') matchId: string = ''
  @type('string') winCondition: string = 'all_treasure'
  @type('number') turnTimerSeconds: number = 60
  @type({ map: TileSchema }) tiles = new MapSchema<TileSchema>()
  @type({ map: ExplorerSchema }) explorers = new MapSchema<ExplorerSchema>()
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>()
}
