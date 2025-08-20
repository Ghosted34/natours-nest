import { Module } from '@nestjs/common';
import { ReviewsController, UserReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  controllers: [ReviewsController, UserReviewsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
