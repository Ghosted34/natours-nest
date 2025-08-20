import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

enum Role {
  admin = 'admin',
  lead_guide = 'lead_guide',
  guide = 'guide',
}

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: Role;
    email: string;
  };
}

export class GenOTPDTO {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}

export class CreateStaffDTO {
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
  @IsNotEmpty()
  lastName: string;

  @ApiProperty({
    example: 'https://example.avatar.com/avatar',
    required: false,
  })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ examples: ['user', 'guide', 'lead_guide'] })
  @IsString()
  @IsNotEmpty()
  role?: Role;
}

export class UpdateStaffDTO {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsOptional()
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
  department?: string;

  @ApiProperty({ examples: ['user', 'guide', 'lead_guide'] })
  @IsString()
  @IsOptional()
  role?: Role;

  @ApiProperty({ examples: [true, false] })
  @IsString()
  @IsOptional()
  hasPwdChanged?: boolean;
}

export class CreateAdminDTO {
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

  @ApiProperty({ example: 'otp12345' })
  @IsString()
  @IsNotEmpty()
  otp?: string;
}
