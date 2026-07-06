import { Schema, MapSchema, type } from '@colyseus/schema';
import { TileSchema } from './TileSchema';
import { ExplorerSchema } from './ExplorerSchema';
import { PlayerSchema } from './PlayerSchema';
import { TurnStateSchema } from './TurnStateSchema';

export class FogboundState extends Schema {
  @type('string') matchId: string = '';
  @type('string') status: string = 'pending';
  @type('string') winnerId: string = '';
  @type('string') winCondition: string = 'all_treasure';
  @type('number') turnTimerSeconds: number = 60;
  @type({ map: TileSchema }) tiles = new MapSchema<TileSchema>();
  @type({ map: ExplorerSchema }) explorers = new MapSchema<ExplorerSchema>();
  @type({ map: PlayerSchema }) players = new MapSchema<PlayerSchema>();
  @type(TurnStateSchema) turnState = new TurnStateSchema();
}
