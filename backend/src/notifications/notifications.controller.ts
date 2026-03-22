import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async getNotifications(
    @Request() req: { user: { playerId: string; username: string } },
  ) {
    return this.notificationsService.getNotifications(req.user.playerId);
  }

  @Get('unread-count')
  async getUnreadCount(
    @Request() req: { user: { playerId: string; username: string } },
  ) {
    return this.notificationsService.getUnreadCount(req.user.playerId);
  }

  @Patch('read-all')
  async markAllAsRead(
    @Request() req: { user: { playerId: string; username: string } },
  ) {
    return this.notificationsService.markAllAsRead(req.user.playerId);
  }

  @Patch(':id/read')
  async markAsRead(
    @Request() req: { user: { playerId: string; username: string } },
    @Param('id') id: string,
  ) {
    return this.notificationsService.markAsRead(req.user.playerId, id);
  }
}
