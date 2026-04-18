import { Schema, type } from '@colyseus/schema'

export class TileSchema extends Schema {
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('string') tileType: string = 'unknown'
  @type('boolean') isRevealed: boolean = false
  @type('string') treasureType: string = 'none'
  @type('number') treasureValue: number = 0
  @type('boolean') isOccupied: boolean = false
}
