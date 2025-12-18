import { IsString, IsOptional, IsEnum, IsBoolean, MaxLength } from 'class-validator';

export enum PrivacyLevel {
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
  PUBLIC = 'PUBLIC',
}

export class CreateWishlistDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum(PrivacyLevel)
  privacyLevel: PrivacyLevel;

  @IsBoolean()
  allowComments: boolean;

  @IsBoolean()
  allowReservations: boolean;
}

