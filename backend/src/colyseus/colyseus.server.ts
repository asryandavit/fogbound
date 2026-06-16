import { Server } from 'colyseus';
import { WebSocketTransport } from '@colyseus/ws-transport';
import { createServer } from 'http';
import { GameRoom } from './rooms/GameRoom';
import { ColyseusService } from './colyseus.service';

export function createColyseusServer(service?: ColyseusService): Server {
  const httpServer = createServer();

  const gameServer = new Server({
    transport: new WebSocketTransport({ server: httpServer }),
    greet: false,
    // express option triggers transport.getExpressApp(), which adds Express as
    // an HTTP request listener — required for matchmaking routes to be bound.
    express: (app) => {
      app.get('/', (_req, res) => {
        res.json({ name: 'fogbound-colyseus', status: 'ok' });
      });
    },
  });

  gameServer.define('fogbound_room', GameRoom);
  if (service) service.setServer(gameServer);

  // gameServer.listen() calls bindRouterToTransport() once the HTTP server is
  // up — this registers /matchmake/* routes that clients need for join_or_create.
  // Previously httpServer.listen() was called directly, which skipped that step.
  gameServer.listen(4567)
    .then(() => console.log('Colyseus server running on port 4567'))
    .catch((err) => console.error('Colyseus failed to start:', err));

  return gameServer;
}
