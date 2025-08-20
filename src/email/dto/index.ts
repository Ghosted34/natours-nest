// src/email/dto/send-email.dto.ts
import { IsEmail, IsString, IsOptional } from 'class-validator';

export class SendEmailDto {
  @IsEmail({}, { each: true })
  to: string | string[];

  @IsString()
  subject: string;

  @IsOptional()
  @IsString()
  html?: string;

  @IsOptional()
  @IsString()
  text?: string;

  @IsOptional()
  @IsString()
  from?: string;
}

export class SendVerificationEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  verificationToken: string;
}

export class SendPasswordResetDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;

  @IsString()
  resetToken: string;
}

export class SendWelcomeEmailDto {
  @IsEmail()
  email: string;

  @IsString()
  firstName: string;
}
