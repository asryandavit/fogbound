import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ShopService } from './shop.service';
import { PurchaseItemDto } from './dto/purchase-item.dto';

@Controller('shop')
@UseGuards(JwtAuthGuard)
export class ShopController {
  constructor(private readonly shopService: ShopService) {}

  @Get()
  async getShopItems() {
    return this.shopService.getShopItems();
  }

  @Get('featured')
  async getFeaturedItems() {
    return this.shopService.getFeaturedItems();
  }

  @Post('purchase')
  async purchaseItem(
    @Request() req: { user: { playerId: string; username: string } },
    @Body() dto: PurchaseItemDto,
  ) {
    return this.shopService.purchaseItem(req.user.playerId, dto.itemId);
  }
}
