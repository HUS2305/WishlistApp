import { IsString, IsEnum, IsBoolean, MaxLength, IsOptional } from 'class-validator';
import { PrivacyLevel } from './create-wishlist.dto';

export class UpdateWishlistDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacyLevel?: PrivacyLevel;

  @IsOptional()
  @IsBoolean()
  allowComments?: boolean;

  @IsOptional()
  @IsBoolean()
  allowReservations?: boolean;

  @IsOptional()
  @IsString()
  coverImage?: string;
}

export class InviteCollaboratorDto {
  @IsString()
  inviteeUserId: string;
}

export enum CollaboratorRole {
  VIEWER = 'VIEWER',
  EDITOR = 'EDITOR',
  ADMIN = 'ADMIN',
}

export class UpdateCollaboratorRoleDto {
  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;
}

export class WishlistQueryDto {
  @IsOptional()
  @IsString()
  ownerId?: string;

  @IsOptional()
  @IsEnum(PrivacyLevel)
  privacyLevel?: PrivacyLevel;
}
