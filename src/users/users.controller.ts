import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';

import { UsersService } from './users.service';
import { UpdateDTO } from './dto';
import { JwtGuard, RolesGuard } from 'src/shared/guards/';
import { GetUser, Roles } from 'src/shared/decorators';

@Controller('users')
export class UsersController {
  constructor(private readonly userService: UsersService) {}
  @Get('profile')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('user')
  async getProfile(@GetUser('id') id: string) {
    console.log('user', id);
    return await this.userService.getProfile(id);
  }

  @Patch('profile')
  @UseGuards(JwtGuard, RolesGuard)
  @Roles('user')
  async updateProfile(@Body() dto: UpdateDTO, @GetUser('id') id: string) {
    return await this.userService.updateProfile({ dto, id });
  }
}
