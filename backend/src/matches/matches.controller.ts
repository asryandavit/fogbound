import { Controller, Get, Param, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MatchesService } from './matches.service';

@Controller('matches')
@UseGuards(JwtAuthGuard)
export class MatchesController {
  constructor(private readonly matchesService: MatchesService) {}

  @Get('history')
  async getMatchHistory(
    @Request() req: { user: { playerId: string; username: string } },
  ) {
    return this.matchesService.getMatchHistory(req.user.playerId);
  }

  @Get(':id')
  async getMatch(@Param('id') id: string) {
    return this.matchesService.getMatch(id);
  }

  @Get(':id/players')
  async getMatchPlayers(@Param('id') id: string) {
    return this.matchesService.getMatchPlayers(id);
  }
}
