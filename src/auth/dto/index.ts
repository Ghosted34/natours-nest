import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';

export enum Role {
  admin = 'admin',
  lead_guide = 'lead_guide',
  guide = 'guide',
  user = 'user',
}

export interface JwtPayload {
  sub: string; // user ID
  email: string;
  role: Role;
  verified: boolean;
  type?: 'reset' | 'verify';
  sessionId?: string;
  iat?: number;
  exp?: number;
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    email: string;
    isVerified: boolean;
  };
}

export class RegisterDTO {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({
    example: 'https://example.avatar.com/avatar',
    required: false,
  })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ example: 'user123' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'google-id-123', required: false })
  @IsString()
  @IsOptional()
  googleId?: string;

  @ApiProperty({ example: 'user' })
  @IsString()
  @IsOptional()
  role?: Role;
}

export class LoginDTO {
  @ApiProperty({ examples: ['user@example.com', 'user123'] })
  @IsString()
  @IsNotEmpty()
  emailOrUsername: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;

  @ApiProperty({ example: 'user' })
  @IsString()
  @IsOptional()
  role?: Role;
}

export class RefreshTokenDTO {
  @ApiProperty({ example: 'refresh-token' })
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ChangePwdDTO {
  @ApiProperty({ example: 'user123' })
  @IsString()
  @IsNotEmpty()
  oldPwd: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  newPwd: string;
}

export class ResetPwdDTO {
  @ApiProperty({ example: 'token.123' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'password123' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
