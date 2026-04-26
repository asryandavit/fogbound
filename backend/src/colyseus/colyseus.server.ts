import { Server } from 'colyseus';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom';
import { ColyseusService } from './colyseus.service';

export function createColyseusServer(service?: ColyseusService): Server {
  const httpServer = createServer();
  const gameServer = new Server({ server: httpServer });
  gameServer.define('fogbound_room', GameRoom);
  if (service) service.setServer(gameServer);
  httpServer.listen(4567, () => {
    console.log('Colyseus server running on port 4567');
  });
  return gameServer;
}
