import { IsString, IsNumber, IsOptional, IsDateString, MaxLength, Min, Max, IsArray } from 'class-validator';

export class CreateSecretSantaEventDto {
  @IsString()
  @MaxLength(100)
  title: string;

  @IsDateString()
  drawDate: string;

  @IsDateString()
  exchangeDate: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsArray()
  @IsString({ each: true })
  participantIds: string[];
}

export class UpdateSecretSantaEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsDateString()
  drawDate?: string;

  @IsOptional()
  @IsDateString()
  exchangeDate?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  budget?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;
}

export class InviteParticipantDto {
  @IsString()
  userId: string;
}
