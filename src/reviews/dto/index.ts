import {
  IsString,
  IsNumber,
  IsOptional,
  Min,
  Max,
  IsIn,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';

export enum Difficulty {
  easy = 'easy',
  medium = 'medium',
  difficult = 'difficult',
}

export class CreateReviewDto {
  @ApiProperty({
    description: 'Tour Review',
    example: 'This tour was amazing!',
  })
  @IsString()
  review: string;

  @ApiProperty({
    description: 'Tour rating',
    minimum: 0,
    maximum: 5,
    example: 3,
  })
  @IsNumber()
  @Min(0)
  @Max(5)
  rating: number;

  @ApiProperty({
    description: 'Tour Review User ID',
    example: 'user123',
  })
  @IsString()
  userId: string;

  @ApiProperty({
    description: 'Tour Review Tour Id',
    example: 'tour123',
  })
  @IsString()
  tourId: string;
}

export class UpdateReviewDto extends PartialType(CreateReviewDto) {}

export class QueryReviewDto {
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
  @IsIn(['-rating', 'rating', '-createdAt', 'createdAt'])
  sort?: string;
}
