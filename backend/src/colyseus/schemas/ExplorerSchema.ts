import { Schema, type } from '@colyseus/schema'

export class ExplorerSchema extends Schema {
  @type('string') explorerId: string = ''
  @type('string') playerId: string = ''
  @type('number') x: number = 0
  @type('number') y: number = 0
  @type('string') state: string = 'idle'
  @type('number') score: number = 0
  @type('number') coinCount: number = 0
  @type('boolean') hasBag: boolean = false
  @type('boolean') hasBoat: boolean = false
  @type('boolean') hasShield: boolean = false
  @type('boolean') isBot: boolean = false
  @type('number') botMoveCount: number = 0
}
