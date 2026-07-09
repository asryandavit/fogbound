import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LinkProviderDto } from './dto/link-provider.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('google')
  googleLogin(@Body() dto: GoogleAuthDto) {
    return this.authService.googleLogin(dto.token);
  }

  @Post('apple')
  appleLogin(@Body() dto: AppleAuthDto) {
    return this.authService.appleLogin(dto.token, dto.fullName);
  }

  @Post('guest')
  guestLogin() {
    return this.authService.guestLogin();
  }

  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refresh_token);
  }

  @Post('link')
  @UseGuards(JwtAuthGuard)
  link(
    @Request() req: { user: { playerId: string; username: string } },
    @Body() dto: LinkProviderDto,
  ) {
    return this.authService.linkProvider(req.user.playerId, dto.provider, dto.token, dto.fullName);
  }
}
