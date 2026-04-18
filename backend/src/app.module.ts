import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './auth/auth.module';
import { MapsModule } from './maps/maps.module';
import { PlayersModule } from './players/players.module';
import { MatchesModule } from './matches/matches.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { LeaderboardModule } from './leaderboard/leaderboard.module';
import { ShopModule } from './shop/shop.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ColyseusModule } from './colyseus/colyseus.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    MapsModule,
    PlayersModule,
    MatchesModule,
    LeaderboardModule,
    ShopModule,
    NotificationsModule,
    ColyseusModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
