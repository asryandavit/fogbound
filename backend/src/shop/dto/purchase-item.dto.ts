import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class PurchaseItemDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  itemId!: string;
}
