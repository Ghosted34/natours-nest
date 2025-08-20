// src/tour/dto/create-tour.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsArray,
  IsBoolean,
  IsDate,
  Min,
  ArrayMaxSize,
  Max,
  Matches,
  IsIn,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum Difficulty {
  easy = 'easy',
  medium = 'medium',
  difficult = 'difficult',
}

export class CreateTourDto {
  @ApiProperty({ description: 'Tour name' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Tour price', minimum: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({ description: 'Tour summary' })
  @IsString()
  summary: string;

  @ApiPropertyOptional({ description: 'Tour description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Tour difficulty',
    enum: ['easy', 'medium', 'difficult'],
  })
  @IsOptional()
  @IsString()
  difficulty?: Difficulty;

  @ApiPropertyOptional({ description: 'Tour duration in days', minimum: 1 })
  @IsNumber()
  @Min(1)
  duration: number;

  @ApiPropertyOptional({ description: 'Maximum group size', minimum: 1 })
  @IsNumber()
  @Min(1)
  maxGroupSize: number;

  @ApiPropertyOptional({ description: 'Tour cover image URL' })
  @IsOptional()
  @IsString()
  imageCover?: string;

  @ApiPropertyOptional({ description: 'Tour images URLs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(5)
  images?: string[];

  @ApiPropertyOptional({ description: 'Tour start dates', type: [Date] })
  @IsOptional()
  @IsArray()
  @Type(() => Date)
  @IsDate({ each: true })
  startDates?: Date[];

  @ApiPropertyOptional({ description: 'Is premium tour' })
  @IsOptional()
  @IsBoolean()
  premium?: boolean;

  @ApiPropertyOptional({ description: 'Tour guide IDs', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  guides?: string[];

  @ApiPropertyOptional({ description: 'Secret Tour', type: Boolean })
  @IsOptional()
  @IsBoolean()
  secretTour?: boolean;
}

export class UpdateTourDto extends PartialType(CreateTourDto) {}

export class QueryTourDto {
  @ApiPropertyOptional({
    description: 'Number of results per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional({ description: 'Page number', minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({
    description: 'Sort field and direction (e.g., -price,name)',
  })
  @IsOptional()
  @IsString()
  @IsIn([
    '-price',
    'price',
    '-ratingsAverage',
    'ratingsAverage',
    '-createdAt',
    'createdAt',
  ])
  sort?: string;

  @ApiPropertyOptional({ description: 'Fields to include in response' })
  @IsOptional()
  @IsString()
  fields?: string;

  @ApiPropertyOptional({ description: 'Filter by difficulty' })
  @IsOptional()
  @IsString()
  difficulty?: string;

  @ApiPropertyOptional({ description: 'Filter by price range' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  price?: number;

  @ApiPropertyOptional({ description: 'Filter by premium status' })
  @IsOptional()
  @Transform(({ value }) => value === 'true')
  premium?: boolean;

  @ApiPropertyOptional({ description: 'Filter by minimum rating' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(5)
  ratingsAverage?: number;
}

export class DistanceQueryDto {
  @ApiProperty({ description: 'Distance in specified unit' })
  @Type(() => Number)
  @IsNumber()
  distance: number;

  @ApiProperty({ description: 'Latitude and longitude (lat,lng format)' })
  @IsString()
  @Matches(/^-?\d+\.?\d*,-?\d+\.?\d*$/, {
    message: 'latlng must be in format: lat,lng',
  })
  latlng: string;

  @ApiProperty({ description: 'Unit of measurement', enum: ['km', 'mi'] })
  @IsString()
  @IsIn(['km', 'mi'])
  unit: string;
}

export class TourStatsParamsDto {
  @ApiProperty({ description: 'Minimum average rating' })
  @Type(() => Number)
  ratingAvg: number;
}

export class YearlyStatsParamsDto {
  @ApiProperty({ description: 'Year for statistics (YYYY format)' })
  @IsString()
  @Matches(/^\d{4}$/, { message: 'Year must be in YYYY format' })
  year: string;
}
