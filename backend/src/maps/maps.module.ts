import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { AuthModule } from '../auth/auth.module';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
