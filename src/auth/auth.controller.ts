import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  AuthRequest,
  ChangePwdDTO,
  LoginDTO,
  RefreshTokenDTO,
  RegisterDTO,
} from './dto';
import { minutes, Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { GetUser } from 'src/shared/decorators';
import { ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @ApiOperation({ summary: 'Register a new user' })
  @Throttle({ default: { limit: 3, ttl: minutes(60) } })
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: 201,
    description: 'User registered successfully',
  })
  async register(@Body() dto: RegisterDTO) {
    return await this.authService.register(dto);
  }

  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  @ApiOperation({ summary: 'User login' })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'User logged in successfully',
  })
  async login(@Body() dto: LoginDTO) {
    return await this.authService.signin(dto);
  }

  @ApiOperation({ summary: 'Verify user email' })
  @Throttle({ default: { limit: 5, ttl: minutes(15) } })
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'User verified successfully',
  })
  async verify(@Req() req: Request) {
    return await this.authService.verify(req.query.token as string);
  }

  @ApiOperation({ summary: 'Logout user' })
  @Throttle({ default: { limit: 20, ttl: minutes(5) } })
  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: 204,
    description: 'User logged out successfully',
  })
  async logout(@Req() req: Request) {
    return await this.authService.logout(req);
  }

  @ApiOperation({ summary: 'Logout user from all devices' })
  @Throttle({ default: { limit: 5, ttl: minutes(60) } })
  @Post('logout-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiResponse({
    status: 204,
    description: 'User logged out successfully',
  })
  async logoutAll(@Req() req: AuthRequest) {
    return await this.authService.logoutAll(req);
  }

  @ApiOperation({ summary: 'Refresh user token' })
  @Throttle({ default: { limit: 30, ttl: minutes(5) } })
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'User refreshed successfully',
  })
  async refresh(@Body() dto: RefreshTokenDTO) {
    return await this.authService.refreshToken(dto.refreshToken);
  }

  @ApiOperation({ summary: 'Forgot password' })
  @Throttle({ default: { limit: 3, ttl: minutes(60) } })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent successfully',
  })
  async forgotPassword(@Req() req: Request) {
    return await this.authService.forgotPassword(req);
  }

  @ApiOperation({ summary: 'Reset Password' })
  @Throttle({ default: { limit: 3, ttl: minutes(15) } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
  })
  @Post('reset-password')
  async resetPassword(@Req() req: Request) {
    return await this.authService.resetPassword(req);
  }

  @ApiOperation({ summary: 'Change Password' })
  @Throttle({ default: { limit: 5, ttl: minutes(60) } })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: 'Password changedsuccessfully',
  })
  @Patch('change-password')
  async changePwd(@Body() dto: ChangePwdDTO, @GetUser('id') id: string) {
    return await this.authService.changePassword({ dto, id });
  }
}
