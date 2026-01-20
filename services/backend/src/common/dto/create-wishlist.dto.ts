import { IsString, IsEnum, IsBoolean, MaxLength, IsOptional } from 'class-validator';

export enum PrivacyLevel {
  PRIVATE = 'PRIVATE',
  FRIENDS_ONLY = 'FRIENDS_ONLY',
  PUBLIC = 'PUBLIC',
}

export class CreateWishlistDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsEnum(PrivacyLevel)
  privacyLevel: PrivacyLevel;

  @IsBoolean()
  allowComments: boolean;

  @IsBoolean()
  allowReservations: boolean;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

