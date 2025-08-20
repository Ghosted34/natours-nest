import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
  Param,
  Post,
  Body,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  UploadedFiles,
  Patch,
  Delete,
  Req,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiResponse,
} from '@nestjs/swagger';
import {
  AliasPremiumToursInterceptor,
  AliasTopToursInterceptor,
  CleanupS3Interceptor,
} from 'src/shared/interceptors';
import {
  CreateTourDto,
  DistanceQueryDto,
  QueryTourDto,
  TourStatsParamsDto,
  UpdateTourDto,
  YearlyStatsParamsDto,
} from './dto';
import { TourService } from './tour.service';
import { Roles } from 'src/shared/decorators';
import { JwtGuard, RolesGuard } from 'src/shared/guards';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { uploadImageToS3, uploadMultipleImagesToS3 } from 'src/utils/s3';
import { IMGRequest } from 'src/shared/types';

@Controller('tours')
export class TourController {
  constructor(private readonly tourService: TourService) {}

  @Get('top-5-cheap')
  @ApiOperation({ summary: 'Get top 5 cheapest tours' })
  @UseInterceptors(AliasTopToursInterceptor)
  async getTop5Tours(@Query() query: QueryTourDto) {
    return await this.tourService.list(query);
  }

  @Get('all-premium')
  @ApiOperation({ summary: 'Get all premium tours' })
  @UseInterceptors(AliasPremiumToursInterceptor)
  async getAllPremium(@Query() query: QueryTourDto) {
    return await this.tourService.list(query);
  }

  @Get('tour-stats/:ratingAvg')
  @ApiOperation({ summary: 'Get tour statistics by minimum rating' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'lead-guide')
  @ApiParam({ name: 'ratingAvg', description: 'Minimum average rating' })
  async getTourStats(@Param() params: TourStatsParamsDto) {
    return await this.tourService.getTourStats(params.ratingAvg);
  }
  @Get('year-plan/:year')
  @ApiOperation({ summary: 'Get yearly tour statistics' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'lead-guide')
  @ApiParam({ name: 'year', description: 'Year in YYYY format' })
  async getYearlyStats(@Param() params: YearlyStatsParamsDto) {
    return await this.tourService.getYearlyStats(params.year);
  }

  @Get('distances/:center/unit/:unit')
  @ApiOperation({ summary: 'Get distances to tours from a center point' })
  @ApiParam({ name: 'center', description: 'Center point in lat,lng format' })
  @ApiParam({ name: 'unit', description: 'Unit of measurement (km or mi)' })
  getDistances(@Param('center') center: string, @Param('unit') unit: string) {
    return this.tourService.getDistances(center, unit);
  }

  @Get('tours-within/:distance/center/:latlng/unit/:unit')
  @ApiOperation({ summary: 'Get tours within specified distance' })
  @ApiParam({ name: 'distance', description: 'Distance from center' })
  @ApiParam({ name: 'latlng', description: 'Center point in lat,lng format' })
  @ApiParam({ name: 'unit', description: 'Unit of measurement (km or mi)' })
  getToursWithin(@Param() params: DistanceQueryDto) {
    return this.tourService.getToursWithin(params);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new tour' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'lead-guide')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imageCover', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
    CleanupS3Interceptor,
  )
  async create(
    @Body() dto: CreateTourDto,
    @Req() request: IMGRequest,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB each
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: {
      imageCover?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    // Here you would upload files to S3 and get URLs
    // Handle image cover upload
    const imageCover = files?.imageCover?.[0]
      ? await uploadImageToS3(files.imageCover[0], 'tours/cover')
      : undefined;

    // Handle multiple images upload
    const images = files?.images
      ? await uploadMultipleImagesToS3(files.images, 'tours/images')
      : undefined;

    request.uploadedImageUrl = imageCover;
    request.uploadedImageUrls = images || [];

    return await this.tourService.create({
      dto,
      imageCover,
      images,
    });
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Updates a tour' })
  @ApiConsumes('multipart/form-data')
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'lead-guide')
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'imageCover', maxCount: 1 },
      { name: 'images', maxCount: 5 },
    ]),
    CleanupS3Interceptor,
  )
  @ApiParam({ name: 'id', description: 'Tour ID' })
  async update(
    @Param('id') id: string,
    @Req() request: IMGRequest,
    @Body() dto: UpdateTourDto,
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB each
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
        fileIsRequired: false,
      }),
    )
    files?: {
      imageCover?: Express.Multer.File[];
      images?: Express.Multer.File[];
    },
  ) {
    // Here you would upload files to S3 and get URLs
    // Handle image cover upload
    const imageCover = files?.imageCover?.[0]
      ? await uploadImageToS3(files.imageCover[0], 'tours')
      : undefined;

    // Handle multiple images upload
    const images = files?.images
      ? await uploadMultipleImagesToS3(files.images, 'tours')
      : undefined;

    request.uploadedImageUrl = imageCover;
    request.uploadedImageUrls = images || [];

    return await this.tourService.update({
      id,
      dto,
      imageCover,
      images,
    });
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a tour' })
  @ApiBearerAuth()
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('admin', 'lead-guide')
  @ApiParam({ name: 'id', description: 'Tour ID' })
  async delete(@Param('id') id: string) {
    return await this.tourService.delete(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a tour by ID' })
  @ApiParam({ name: 'id', description: 'Tour ID' })
  async findOne(@Param('id') id: string) {
    return await this.tourService.get(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tours' })
  @ApiResponse({ status: 200, description: 'Tours retrieved successfully' })
  async findAll(@Query() query: QueryTourDto) {
    return await this.tourService.list(query);
  }
}
