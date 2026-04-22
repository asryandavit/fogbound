import { Schema, type } from '@colyseus/schema';

export class TurnStateSchema extends Schema {
  @type('string') currentPlayerId: string = '';
  @type('number') turnNumber: number = 0;
  @type('string') phase: string = 'move';
}
