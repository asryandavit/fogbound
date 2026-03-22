import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { MapsService } from './maps.service';

@Controller('maps')
@UseGuards(JwtAuthGuard)
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get()
  async findAll() {
    return this.mapsService.findAll();
  }

  @Get('slug/:slug')
  async findBySlug(@Param('slug') slug: string) {
    return this.mapsService.findBySlug(slug);
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.mapsService.findOne(id);
  }
}
