import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LinkProviderDto {
  @IsIn(['google', 'apple'])
  provider!: 'google' | 'apple';

  @IsString()
  @IsNotEmpty()
  token!: string;

  @IsString()
  @IsOptional()
  fullName?: string;
}
