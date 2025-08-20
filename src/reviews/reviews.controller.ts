import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { UserTourReviewsInterceptor } from 'src/shared/interceptors';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CreateReviewDto, QueryReviewDto } from './dto';
import { GetUser, Roles } from 'src/shared/decorators';
import { JwtGuard, RolesGuard, UserVerificationGuard } from 'src/shared/guards';

@Controller('tours/:tourId/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new tour review' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard, UserVerificationGuard)
  @Roles('user')
  @UseInterceptors(UserTourReviewsInterceptor)
  async create(@Body() dto: CreateReviewDto) {
    return await this.reviewsService.create(dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a review for a tour' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async get(@Param('tourId') tourId: string, @Param('id') id: string) {
    return await this.reviewsService.get({ tourId, id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a review for a tour' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard, UserVerificationGuard)
  @Roles('user')
  async update(@Param('tourId') tourId: string, @Param('id') id: string) {
    return await this.reviewsService.get({ tourId, id });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Delete a review for a tour' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard, UserVerificationGuard)
  @Roles('user', 'admin')
  async delete(@Param('tourId') tourId: string, @Param('id') id: string) {
    return await this.reviewsService.delete({ tourId, id });
  }

  @Get('')
  @ApiOperation({ summary: 'List reviews for a tour' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async listForTour(
    @Param('tourId') tourId: string,
    @Query() query: QueryReviewDto,
  ) {
    return await this.reviewsService.listTourReviews({ tourId, query });
  }

  @Get('stats')
  @ApiOperation({ summary: 'List reviews Stats for a tour' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async stats(@Param('tourId') tourId: string) {
    return await this.reviewsService.getReviewStats(tourId);
  }
}

@Controller('reviews')
export class UserReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('user')
  @ApiOperation({ summary: 'Get user reviews' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard)
  async get(@GetUser('id') user: string, @Query() query: QueryReviewDto) {
    return await this.reviewsService.findReviewsByUser({ user, query });
  }
}
