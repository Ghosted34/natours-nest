import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { EmailOptions, VerificationEmailData } from './types';

@Injectable()
export class EmailService {
  private transporter: Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    this.createTransporter();
  }

  private createTransporter() {
    const emailConfig = {
      host: this.configService.get<string>('SMTP_HOST'),
      port: this.configService.get<number>('SMTP_PORT', 587),
      secure: this.configService.get<boolean>('SMTP_SECURE', false),
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    };

    this.transporter = nodemailer.createTransport(emailConfig);

    this.transporter
      .verify()
      .catch((error) => {
        this.logger.error('❌Email configuration error:', error);
      })
      .finally(() => {
        this.logger.log('✅Email service is ready to send messages');
      });
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      const mailOptions = {
        from: options.from || this.configService.get<string>('SMTP_FROM'),
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
        attachments: options.attachments,
      };

      const result = (await this.transporter.sendMail(mailOptions)) as {
        messageId: string;
      };
      this.logger.log(
        `Email sent successfully to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}. MessageId: ${result.messageId}`,
      );
      return true;
    } catch (error) {
      this.logger.error(
        `Failed to send email to ${Array.isArray(options.to) ? options.to.join(', ') : options.to}:`,
        error,
      );
      throw error;
    }
  }

  async sendVerificationEmail(
    email: string,
    data: VerificationEmailData,
  ): Promise<boolean> {
    const html = this.generateVerificationEmailTemplate(data);

    return this.sendEmail({
      to: email,
      subject: 'Verify Your Email Address',
      html,
      text: `Hello ${data.firstName}, please verify your email by visiting: ${data.verificationLink}`,
    });
  }

  async sendPasswordResetEmail(
    email: string,
    resetLink: string,
    firstName: string,
  ): Promise<boolean> {
    const html = this.generatePasswordResetTemplate(resetLink, firstName);

    return this.sendEmail({
      to: email,
      subject: 'Password Reset Request',
      html,
      text: `Hello ${firstName}, reset your password by visiting: ${resetLink}`,
    });
  }

  otpHTML(data: { otp: string }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background-color: #f1f1f1; border-radius: 0 0 8px 8px; }
          .link { color: #007bff; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello!</h2>
            <p>You have been designated as an admin.</p>
            <p>Here is your OTP:</p>
            <p><strong>${data.otp}</strong></p>
            <p><strong>This OTP will expire in 10 minutes.</strong></p>
            <p>Click the button below to access the admin panel and enter the sent OTP:</p>
            <div style="text-align: center;">
            <a href="https://app.natours.io/admin-create" class="button">Access Admin Panel</a>
            </div>
        
          </div>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<boolean> {
    const html = this.generateWelcomeEmailTemplate(firstName);

    return this.sendEmail({
      to: email,
      subject: 'Welcome to Our Platform!',
      html,
    });
  }

  private generateVerificationEmailTemplate(
    data: VerificationEmailData,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background-color: #f1f1f1; border-radius: 0 0 8px 8px; }
          .link { color: #007bff; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Email Verification</h1>
          </div>
          <div class="content">
            <h2>Hello ${data.firstName}!</h2>
            <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
            <div style="text-align: center;">
              <a href="${data.verificationLink}" class="button">Verify Email Address</a>
            </div>
            <p>If the button doesn't work, you can copy and paste the following link into your browser:</p>
            <p><a href="${data.verificationLink}" class="link">${data.verificationLink}</a></p>
            <p><strong>This link will expire in 24 hours.</strong></p>
          </div>
          <div class="footer">
            <p>If you didn't create an account, you can safely ignore this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generatePasswordResetTemplate(
    resetLink: string,
    firstName: string,
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .button { display: inline-block; padding: 12px 24px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background-color: #f1f1f1; border-radius: 0 0 8px 8px; }
          .link { color: #dc3545; word-break: break-all; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Password Reset</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>You requested a password reset. Click the button below to reset your password:</p>
            <div style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </div>
            <p>If the button doesn't work, copy and paste this link:</p>
            <p><a href="${resetLink}" class="link">${resetLink}</a></p>
            <p><strong>This link will expire in 1 hour.</strong></p>
          </div>
          <div class="footer">
            <p>If you didn't request this reset, please ignore this email and your password will remain unchanged.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateWelcomeEmailTemplate(firstName: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { padding: 30px; background-color: #f9f9f9; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; background-color: #f1f1f1; border-radius: 0 0 8px 8px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Welcome!</h1>
          </div>
          <div class="content">
            <h2>Hello ${firstName}!</h2>
            <p>Welcome to our platform! We're excited to have you on board.</p>
            <p>Your account has been successfully verified and you can now enjoy all our features.</p>
            <p>If you have any questions, feel free to reach out to our support team.</p>
          </div>
          <div class="footer">
            <p>Thank you for choosing our service!</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
