import { Module } from '@nestjs/common'

@Module({})
export class ColyseusModule {
  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createColyseusServer } = require('./colyseus.server')
    createColyseusServer()
  }
}
