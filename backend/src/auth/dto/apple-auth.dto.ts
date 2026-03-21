import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AppleAuthDto {
  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsOptional()
  fullName?: string;
}
