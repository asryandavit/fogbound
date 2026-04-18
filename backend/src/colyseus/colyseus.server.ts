import { Server } from 'colyseus'
import { createServer } from 'http'
import { GameRoom } from './rooms/GameRoom'

export function createColyseusServer(): Server {
  const httpServer = createServer()
  const gameServer = new Server({ server: httpServer })
  gameServer.define('game_room', GameRoom)
  httpServer.listen(2567, () => {
    console.log('Colyseus server running on port 2567')
  })
  return gameServer
}
