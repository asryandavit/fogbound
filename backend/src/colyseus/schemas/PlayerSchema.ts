import { Schema, type } from '@colyseus/schema'

export class PlayerSchema extends Schema {
  @type('string') playerId: string = ''
  @type('string') username: string = ''
  @type('number') score: number = 0
  @type('boolean') isBot: boolean = false
  @type('boolean') isConnected: boolean = true
  @type('number') slotNumber: number = 0
  @type('string') teamColor: string = 'red'
}
