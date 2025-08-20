import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto, QueryReviewDto, UpdateReviewDto } from './dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  private async updateTourRatings(tourId: string) {
    const result = await this.prisma.review.aggregate({
      where: { tourId },
      _count: { rating: true },
      _avg: { rating: true },
    });

    const ratingsQuantity = result._count.rating;
    const ratingsAverage = result._avg.rating || 0;

    await this.prisma.tour.update({
      where: { id: tourId },
      data: {
        ratingsQuantity,
        ratingsAverage,
      },
    });

    return { ratingsQuantity, ratingsAverage };
  }

  private buildOrderBy(sort?: string) {
    if (!sort) return undefined;

    const sortFields = sort.split(',').map((field) => field.trim());
    const orderBy: Array<Record<string, 'asc' | 'desc'>> = [];

    sortFields.forEach((field) => {
      const isDesc = field.startsWith('-');
      const fieldName = isDesc ? field.slice(1) : field;

      orderBy.push({
        [fieldName]: isDesc ? 'desc' : 'asc',
      });
    });

    return orderBy;
  }

  async create(dto: CreateReviewDto) {
    const cached = await this.prisma.tour.findUnique({
      where: { id: dto.tourId },
    });

    if (!cached) {
      throw new NotFoundException(`Tour does not exist`);
    }

    const review = await this.prisma.$transaction(async (tx) => {
      // Create the review
      const review = await tx.review.create({
        data: {
          ...dto,
        },
        include: {
          tour: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      // Update tour ratings
      await this.updateTourRatings(dto.tourId);

      // Return review with updated tour stats
      return {
        ...review,
      };
    });

    return {
      status: 'success',
      message: 'Review created successfully',
      data: review,
    };
  }

  async get({ id, tourId }: { tourId: string; id: string }) {
    const review = await this.prisma.review.findFirst({
      where: {
        id: id,
        tourId,
      },
      include: {
        tour: {
          select: {
            id: true,
            name: true,
          },
        },
        user: {
          select: {
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!review) {
      throw new NotFoundException(
        `Review with ID ${id} not found for tour ${tourId}`,
      );
    }

    return review;
  }

  async update({
    id,
    tourId,
    dto,
  }: {
    id: string;
    tourId: string;
    dto: UpdateReviewDto;
  }) {
    const cached = await this.prisma.review.findFirst({
      where: {
        id,
        tourId,
      },
    });

    if (!cached) {
      throw new NotFoundException(
        `Review with ID ${id} not found for tour ${tourId}`,
      );
    }

    const updatedReview = this.prisma.$transaction(async (tx) => {
      // Update the review
      const review = await tx.review.update({
        where: { id: id },
        data: dto,
        include: {
          tour: {
            select: {
              name: true,
            },
          },
          user: {
            select: {
              firstName: true,
              lastName: true,
              avatar: true,
            },
          },
        },
      });

      await this.updateTourRatings(tourId);

      return {
        ...review,
      };
    });

    return {
      status: 'success',
      message: 'Review updated successfully',
      data: updatedReview,
    };
  }

  async delete({ id, tourId }: { id: string; tourId: string }) {
    const cached = await this.prisma.review.findFirst({
      where: {
        id,
        tourId,
      },
    });

    if (!cached) {
      throw new NotFoundException(
        `Review with ID ${id} not found for tour ${tourId}`,
      );
    }

    await this.prisma.review.delete({
      where: {
        id,
      },
    });

    await this.updateTourRatings(tourId);

    return {
      status: 'success',
      message: 'Review deleted successfully',
    };
  }

  async listTourReviews({
    tourId,
    query,
  }: {
    tourId: string;
    query: QueryReviewDto;
  }) {
    const cached = await this.prisma.tour.findUnique({
      where: { id: tourId },
    });

    if (!cached) {
      throw new NotFoundException(`Tour does not exist`);
    }

    const { limit = 10, page = 1, sort } = query;
    const skip = (page - 1) * limit;

    // Build where clause from filters
    const where: Record<string, any> = {
      tourId,
    };

    // Build orderBy clause
    const orderBy = this.buildOrderBy(sort);

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          tour: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      status: 'success',
      message: 'Reviews retrieved successfully',
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  async getReviewStats(tourId: string) {
    // Check if tour exists
    const tour = await this.prisma.tour.findUnique({
      where: { id: tourId },
    });

    if (!tour) {
      throw new NotFoundException(`Tour with ID ${tourId} not found`);
    }

    const [stats, ratingDistribution] = await Promise.all([
      this.prisma.review.aggregate({
        where: { tourId },
        _count: { id: true },
        _avg: { rating: true },
        _min: { rating: true },
        _max: { rating: true },
      }),
      this.prisma.review.groupBy({
        by: ['rating'],
        where: { tourId },
        _count: { rating: true },
        orderBy: { rating: 'asc' },
      }),
    ]);

    return {
      total: stats._count.id,
      averageRating: stats._avg.rating || 0,
      minRating: stats._min.rating || 0,
      maxRating: stats._max.rating || 0,
      ratingDistribution: ratingDistribution.map((item) => ({
        rating: item.rating,
        count: item._count.rating,
      })),
    };
  }

  async findReviewsByUser({
    user,
    query,
  }: {
    user: string;
    query: Partial<QueryReviewDto>;
  }) {
    const { page = 1, limit = 10, sort } = query;

    const where = { userId: user };
    const orderBy = this.buildOrderBy(sort);

    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          tour: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.review.count({ where }),
    ]);

    return {
      data: reviews,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }
}
