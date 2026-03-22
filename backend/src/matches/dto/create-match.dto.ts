import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreateMatchDto {
  @IsString()
  @IsNotEmpty()
  @IsUUID()
  mapId!: string;
}
