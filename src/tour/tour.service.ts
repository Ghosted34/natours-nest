import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  CreateTourDto,
  DistanceQueryDto,
  QueryTourDto,
  UpdateTourDto,
} from './dto';
import { Tour } from '@prisma/client';

@Injectable()
export class TourService {
  constructor(private prisma: PrismaService) {}

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

  private buildSelect(fields?: string) {
    if (!fields) return undefined;

    const fieldArray = fields.split(',');
    const select: Record<string, boolean> = {};

    fieldArray.forEach((field: string) => {
      select[field] = true;
    });

    return select;
  }

  async create({
    dto,
    imageCover,
    images,
  }: {
    dto: CreateTourDto;
    imageCover?: string;
    images?: string[];
  }) {
    const cached = await this.prisma.tour.findFirst({
      where: {
        name: dto.name,
      },
    });

    if (cached) throw new Error('Tour with this name already exists');

    const tourData = {
      ...dto,
      imageCover: imageCover || dto.imageCover,
      images: images || dto.images || [],
    };

    return this.prisma.tour.create({
      data: tourData,
      include: {
        reviews: true,
      },
    });
  }

  async list(query: QueryTourDto) {
    const { limit = 10, page = 1, sort, fields, ...filters } = query;
    const skip = (page - 1) * limit;

    // Build where clause from filters
    const where: Record<string, any> = {};
    if (filters.difficulty) where.difficulty = filters.difficulty;
    if (filters.price) where.price = { lte: filters.price };
    if (filters.premium !== undefined) where.premium = filters.premium;
    if (filters.ratingsAverage)
      where.ratingsAverage = { gte: filters.ratingsAverage };

    // Build orderBy from sort string
    const orderBy = this.buildOrderBy(sort);

    // Build select from fields string
    const select = this.buildSelect(fields);

    const [tours, total] = await Promise.all([
      this.prisma.tour.findMany({
        where,
        orderBy,
        select: select && { ...select, guides: true },
        skip,
        take: limit,
        ...(select
          ? { select: { ...select, guides: true } }
          : { include: { reviews: true } }),
      }),
      this.prisma.tour.count({ where }),
    ]);

    const staffIds = Array.from(new Set(tours.flatMap((tour) => tour.guides)));

    const staffInfo = await this.prisma.staff.findMany({
      where: { id: { in: staffIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    const staffMap = Object.fromEntries(staffInfo.map((s) => [s.id, s]));

    const toursWithStaff = tours.map((tour) => ({
      ...tour,
      guidesInfo: tour.guides.map((id) => staffMap[id]).filter(Boolean),
    }));

    return {
      status: 'success',
      results: tours.length,
      total,
      page,
      data: { tours: toursWithStaff },
    };
  }

  async get(id: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id },
      include: {
        reviews: true,
      },
    });

    if (!tour) {
      throw new NotFoundException('No tour found with that ID');
    }

    const guidesInfo = await this.prisma.staff.findMany({
      where: { id: { in: tour.guides } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatar: true,
      },
    });

    return {
      status: 'success',
      data: { ...tour, guidesInfo },
    };
  }

  async update({
    id,
    dto,
    imageCover,
    images,
  }: {
    id: string;
    dto: UpdateTourDto;
    imageCover?: string;
    images?: string[];
  }) {
    const existingTour = await this.prisma.tour.findUnique({
      where: { id },
      select: { imageCover: true, images: true },
    });

    if (!existingTour) {
      throw new NotFoundException('No tour found with that ID');
    }

    //delete images if new ones

    const updateData = {
      ...dto,
      ...(imageCover && { imageCover }),
      ...(images && { images }),
    };

    const updatedTour = await this.prisma.tour.update({
      where: { id },
      data: updateData,
      include: {
        reviews: true,
      },
    });

    return {
      status: 'success',
      data: { tour: updatedTour },
    };
  }

  async delete(id: string) {
    const tour = await this.prisma.tour.findUnique({
      where: { id },
      select: { imageCover: true, images: true },
    });

    if (!tour) {
      throw new NotFoundException('No tour found with that ID');
    }

    await this.prisma.tour.delete({
      where: { id },
    });

    return {
      status: 'success',
      data: null,
    };
  }

  async getTourStats(ratingAvg: number) {
    const stats = await this.prisma.tour.groupBy({
      by: ['difficulty'],
      where: {
        ratingsAverage: { gte: ratingAvg },
      },
      _count: {
        _all: true,
      },
      _sum: {
        ratingsQuantity: true,
      },
      _avg: {
        ratingsAverage: true,
        price: true,
      },
      _min: {
        price: true,
      },
      _max: {
        price: true,
      },
      orderBy: {
        _avg: {
          price: 'asc',
        },
      },
    });

    const formattedStats = stats.map((stat) => ({
      difficulty: stat.difficulty?.toUpperCase(),
      numTours: stat._count._all,
      numRatings: stat._sum.ratingsQuantity || 0,
      avgRating: stat._avg.ratingsAverage || 0,
      avgPrice: stat._avg.price || 0,
      minPrice: stat._min.price || 0,
      maxPrice: stat._max.price || 0,
    }));

    return {
      status: 'success',
      data: { stats: formattedStats },
    };
  }

  async getToursWithin(distanceQuery: DistanceQueryDto) {
    const { distance, latlng, unit } = distanceQuery;
    const [lat, lng] = latlng.split(',').map(Number);

    if (!lat || !lng) {
      throw new BadRequestException(
        'Please provide latitude and longitude in the format lat,lng',
      );
    }

    const radius = unit === 'mi' ? distance / 3963.2 : distance / 6378.1;

    // Note: This is a simplified version. You might need to implement geospatial queries
    // depending on your Prisma schema and database setup
    const tours: Tour[] = await this.prisma.$queryRaw`
  SELECT *
  FROM "Tour"
  WHERE ST_DWithin(
    ST_SetSRID(ST_GeomFromGeoJSON("startLocation"::text), 4326),
    ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326),
    ${radius}
  );
`;

    return {
      status: 'success',
      results: tours.length,
      data: { tours },
    };
  }

  async getYearlyStats(year: string) {
    const startOfYear = new Date(`${year}-01-01`);
    const endOfYear = new Date(`${year}-12-31`);

    try {
      const tours: Tour[] = await this.prisma.$queryRaw`
            SELECT *
            FROM "Tour"
            WHERE EXISTS (
              SELECT 1
              FROM unnest("startDates") AS dt
              WHERE dt >= ${startOfYear} AND dt <= ${endOfYear}
            )
`;

      const monthlyStats = new Map<
        number,
        { numTourStarts: number; tours: string[] }
      >();

      tours.forEach((tour) => {
        tour.startDates.forEach((startDate) => {
          const tourDate = new Date(startDate);
          if (tourDate >= startOfYear && tourDate <= endOfYear) {
            const month = tourDate.getMonth() + 1; // 1-based month

            if (!monthlyStats.has(month)) {
              monthlyStats.set(month, { numTourStarts: 0, tours: [] });
            }

            const stats = monthlyStats.get(month);
            stats.numTourStarts++;
            stats.tours.push(tour.name);
          }
        });
      });

      // Convert to array and sort by numTourStarts
      const result = Array.from(monthlyStats.entries())
        .map(([month, stats]) => ({
          month,
          numTourStarts: stats.numTourStarts,
          tours: stats.tours,
        }))
        .sort((a, b) => b.numTourStarts - a.numTourStarts)
        .slice(0, 12);

      return {
        status: 'success',
        data: { plan: result },
      };
    } catch (error) {
      console.error('Error fetching yearly stats:', error);
      return {
        status: 'error',
        data: { plan: [] },
      };
    }
  }

  async getDistances(center: string, unit: string) {
    const [lat, lng] = center.split(',').map(Number);

    if (!lat || !lng) {
      throw new BadRequestException(
        'Please provide position in the lat,lng format',
      );
    }

    const radius = unit === 'mi' ? 3959 : 6371;

    const distances = await this.prisma.$queryRaw<any[]>`
    SELECT id, name,
      (
        ${radius} * acos(
          cos(radians(${lat}))
          * cos(radians(latitude))
          * cos(radians(longitude) - radians(${lng}))
          + sin(radians(${lat}))
          * sin(radians(latitude))
        )
      ) AS distance
    FROM "Tour"
    ORDER BY distance ASC;
  `;

    return {
      status: 'success',
      distances,
    };
  }
}
