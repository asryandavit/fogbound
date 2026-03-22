import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlayersService } from './players.service';
import { UpdatePlayerDto } from './dto/update-player.dto';

@Controller('players')
@UseGuards(JwtAuthGuard)
export class PlayersController {
  constructor(private readonly playersService: PlayersService) {}

  @Get('me')
  async getMyProfile(
    @Request() req: { user: { playerId: string; username: string } },
  ) {
    return this.playersService.getMyProfile(req.user.playerId);
  }

  @Get(':id')
  async getProfile(@Param('id') id: string) {
    return this.playersService.getProfile(id);
  }

  @Patch('me')
  async updateProfile(
    @Request() req: { user: { playerId: string; username: string } },
    @Body() dto: UpdatePlayerDto,
  ) {
    return this.playersService.updateProfile(req.user.playerId, dto);
  }

  @Get(':id/stats')
  async getStats(@Param('id') id: string) {
    return this.playersService.getStats(id);
  }
}
