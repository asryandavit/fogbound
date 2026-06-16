import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom';
import { ColyseusService } from './colyseus.service';

export function createColyseusServer(service?: ColyseusService): Server {
  const httpServer = createServer();

  httpServer.on('request', (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name: 'fogbound-colyseus', status: 'ok' }));
    }
  });

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
  });
  gameServer.define('fogbound_room', GameRoom);
  if (service) service.setServer(gameServer);
  httpServer.listen(4567, () => {
    console.log('Colyseus server running on port 4567');
  });
  return gameServer;
}
