import { IsString, IsOptional, IsNumber, IsUrl, IsEnum, Min, Max, MaxLength, ValidateIf } from 'class-validator';

// Must match Prisma schema enum: MUST_HAVE | NICE_TO_HAVE
export enum Priority {
  MUST_HAVE = 'MUST_HAVE',
  NICE_TO_HAVE = 'NICE_TO_HAVE',
}

// Must match Prisma schema enum: WANTED | RESERVED | PURCHASED
export enum ItemStatus {
  WANTED = 'WANTED',
  RESERVED = 'RESERVED',
  PURCHASED = 'PURCHASED',
}

export class CreateItemDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @ValidateIf((o) => o.url !== undefined && o.url !== null && o.url !== '')
  @IsUrl()
  url?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000000)
  price?: number;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsEnum(Priority)
  priority: Priority;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  quantity?: number;
}

