import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Request } from 'express';

export class UpdateDTO {
  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsOptional()
  lastName?: string;

  @ApiProperty({ example: 'avatar.png' })
  @IsString()
  @IsOptional()
  avatar?: string;

  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsOptional()
  username?: string;

  @ApiProperty({ example: 'googleId' })
  @IsString()
  @IsOptional()
  googleId?: string;
}

export interface AuthRequest extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}
