import { Module } from '@nestjs/common';
import { ColyseusService } from './colyseus.service';

@Module({
  providers: [ColyseusService],
  exports: [ColyseusService],
})
export class ColyseusModule {
  constructor(private readonly colyseusService: ColyseusService) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createColyseusServer } = require('./colyseus.server') as {
      createColyseusServer: (svc: ColyseusService) => void;
    };
    createColyseusServer(colyseusService);
  }
}
