import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
@UseGuards(JwtAuthGuard)
export class LeaderboardController {
  constructor(private readonly leaderboardService: LeaderboardService) {}

  @Get('global')
  async getGlobalLeaderboard() {
    return this.leaderboardService.getGlobalLeaderboard();
  }

  @Get('me')
  async getPlayerRank(
    @Request() req: { user: { playerId: string; username: string } },
  ) {
    return this.leaderboardService.getPlayerRank(req.user.playerId);
  }

  @Get('map/:mapId')
  async getMapLeaderboard(@Param('mapId') mapId: string) {
    return this.leaderboardService.getMapLeaderboard(mapId);
  }
}
