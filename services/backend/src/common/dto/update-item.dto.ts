import { IsString, IsOptional, IsNumber, IsUrl, IsEnum, Min, Max, MaxLength, ValidateIf } from 'class-validator';
import { Priority, ItemStatus } from './create-item.dto';

export class UpdateItemDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

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

  @IsOptional()
  @IsEnum(Priority)
  priority?: Priority;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(10000)
  quantity?: number;

  @IsOptional()
  @IsEnum(ItemStatus)
  status?: ItemStatus;
}

