import { Injectable } from '@nestjs/common';
import { Server } from 'colyseus';

@Injectable()
export class ColyseusService {
  private server: Server | null = null;

  setServer(server: Server): void {
    this.server = server;
  }

  /** Returns active room count. */
  getRoomStatus(): { running: boolean } {
    return { running: this.server != null };
  }
}
