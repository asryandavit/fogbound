import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { AppleAuthDto } from './dto/apple-auth.dto';

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
}
