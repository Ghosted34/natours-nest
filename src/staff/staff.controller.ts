import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Param,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { StaffService } from './staff.service';
import {
  CreateAdminDTO,
  CreateStaffDTO,
  GenOTPDTO,
  UpdateStaffDTO,
} from './dto';
import { JwtGuard, RolesGuard } from 'src/shared/guards';
import { GetUser, Roles } from 'src/shared/decorators';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('staff')
@UseGuards(JwtGuard, RolesGuard)
export class StaffController {
  constructor(private readonly staffService: StaffService) {}

  @Post('otp')
  @Roles('admin')
  @ApiOperation({ summary: 'Generate OTP for admin' })
  @ApiResponse({ status: 201, description: 'OTP generated successfully' })
  @HttpCode(HttpStatus.CREATED)
  async generateAdminOTP(@Body() dto: GenOTPDTO) {
    return await this.staffService.generateOTP(dto);
  }

  @Post('admin')
  @Roles('admin')
  @ApiOperation({ summary: 'Create new admin' })
  @ApiResponse({ status: 201, description: 'Admin created successfully' })
  @HttpCode(HttpStatus.CREATED)
  async createAdmin(@Body() dto: CreateAdminDTO) {
    return await this.staffService.createAdmin(dto);
  }

  @Post('create')
  @Roles('admin')
  @ApiOperation({ summary: 'Create new staff member' })
  @ApiResponse({
    status: 201,
    description: 'Staff member created successfully',
  })
  @HttpCode(HttpStatus.CREATED)
  async createStaff(@Body() dto: CreateStaffDTO, @GetUser('id') id: string) {
    return await this.staffService.createStaff({ dto, id });
  }

  @Get('')
  @Roles('admin')
  @ApiOperation({ summary: 'Get all staff members' })
  @ApiResponse({ status: 200, description: 'Return all staff members' })
  @HttpCode(HttpStatus.OK)
  async getAllStaff() {
    return await this.staffService.getAllStaff();
  }

  @Get(':id')
  @Roles('admin')
  @ApiOperation({ summary: 'Get staff member by ID' })
  @ApiResponse({ status: 200, description: 'Return staff member' })
  @HttpCode(HttpStatus.OK)
  async getStaff(@Param('id') id: string) {
    return await this.staffService.getStaff(id);
  }

  @Patch(':id')
  @Roles('admin', 'lead_guide', 'guide')
  @ApiOperation({ summary: 'Update staff member' })
  @ApiResponse({
    status: 200,
    description: 'Staff member updated successfully',
  })
  @HttpCode(HttpStatus.OK)
  async updateStaff(@Param('id') id: string, @Body() dto: UpdateStaffDTO) {
    return await this.staffService.updateStaff({ id, dto });
  }

  @Patch('deactivate/:id')
  @Roles('admin', 'lead_guide', 'guide')
  @ApiOperation({ summary: 'Deactivate staff member' })
  @ApiResponse({
    status: 200,
    description: 'Staff member deactivated successfully',
  })
  @HttpCode(HttpStatus.OK)
  async deactivateStaff(@Param('id') id: string) {
    return await this.staffService.deactivateStaff(id);
  }

  @Delete(':id')
  @Roles('admin', 'lead_guide', 'guide')
  @ApiOperation({ summary: 'Delete staff member' })
  @ApiResponse({
    status: 200,
    description: 'Staff member deleted successfully',
  })
  @HttpCode(HttpStatus.OK)
  async deleteStaff(@Param('id') id: string) {
    return await this.staffService.deleteStaff(id);
  }
}
