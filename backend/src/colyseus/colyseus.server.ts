import { Server } from 'colyseus';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom';
import { ColyseusService } from './colyseus.service';

export function createColyseusServer(service?: ColyseusService): Server {
  const httpServer = createServer();

  // Colyseus 0.14 snapshots existing 'request' listeners inside attachMatchMakingRoutes
  // and replays them for non-matchmake URLs. Without a pre-registered handler, GET /
  // is never answered and curl/browsers hang. This listener is captured by that snapshot.
  httpServer.on('request', (req, res) => {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ name: 'fogbound-colyseus', status: 'ok' }));
    }
  });

  const gameServer = new Server({ server: httpServer });
  gameServer.define('fogbound_room', GameRoom);
  if (service) service.setServer(gameServer);
  httpServer.listen(4567, () => {
    console.log('Colyseus server running on port 4567');
  });
  return gameServer;
}
