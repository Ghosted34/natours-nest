import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { RedisService } from 'src/redis/redis.service';
import {
  CreateAdminDTO,
  CreateStaffDTO,
  GenOTPDTO,
  UpdateStaffDTO,
} from './dto';
import { createOTP } from 'src/utils/otp';
import { ADMIN_OTP_PREFIX } from 'src/shared/constants';
import { EmailService } from 'src/email/email.service';
import { Role } from 'src/auth/dto';
import { generateEmployeeId, setDefaultPermissions } from 'src/utils';
import { hash } from 'argon2';

@Injectable()
export class StaffService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private email: EmailService,
  ) {}

  async generateOTP(dto: GenOTPDTO) {
    const { email } = dto;

    const otp = createOTP();

    console.log(otp);

    const key = ADMIN_OTP_PREFIX + email;
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes from now
    const payload = { otp, email, used: false, expiresAt };

    await this.redis.set(key, payload, expiresAt);

    const html = this.email.otpHTML({ otp });

    await this.email.sendEmail({
      to: email,
      subject: 'Your OTP Code',
      text: `Your OTP code is ${otp}`,
      html,
      from: 'no-reply@natours.io',
    });
  }

  async createAdmin(dto: CreateAdminDTO) {
    // //   find user by email;

    const { email, password, firstName, lastName, otp } = dto;

    const key = ADMIN_OTP_PREFIX + email;

    const data = await this.redis.get<{
      otp: string;
      email: string;
      used: boolean;
    }>(key);

    if (!data) throw new ForbiddenException('Invalid or expired OTP');

    if (data.used) throw new ForbiddenException('OTP already used');

    // //   compare otp
    if (data.otp !== otp) throw new ForbiddenException('Invalid OTP');

    const cached = await this.prisma.staff.findUnique({
      where: { email },
    });

    if (cached) throw new ForbiddenException('Admin already exists');

    const hashed = await hash(password);

    // //   create user
    const user = await this.prisma.staff.create({
      data: {
        email,
        password: hashed,
        firstName,
        lastName,
        role: Role.admin,
        department: 'Administration',
        employeeId: generateEmployeeId({ firstName, lastName }),
        permissions: setDefaultPermissions(Role.admin),
        isActive: true,
      },
    });

    // //   return user
    return {
      data: {
        admin: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
          employeeId: user.employeeId,
        },
        access_token: '',
        // Normally, you would generate a JWT token here
        refresh_token: '',
      },
      status: 'success',
    };
  }

  async createStaff({ dto, id }: { dto: CreateStaffDTO; id: string }) {
    // //   find user by email;

    const { email, password, firstName, lastName, department, role } = dto;

    const cached = await this.prisma.staff.findUnique({
      where: { email },
    });

    if (cached) throw new ForbiddenException('Staff already exists');

    const hashed = await hash(password);

    // //   create user
    const staff = await this.prisma.staff.create({
      data: {
        email,
        password: hashed,
        firstName,
        lastName,
        role,
        department: department || 'General',
        employeeId: generateEmployeeId({ firstName, lastName }),
        permissions: setDefaultPermissions(role),
        createdBy: id,
        isActive: true,
      },
    });

    // //   return user
    return {
      data: {
        admin: {
          id: staff.id,
          email: staff.email,
          firstName: staff.firstName,
          lastName: staff.lastName,
          role: staff.role,
          employeeId: staff.employeeId,
        },
      },
      status: 'success',
    };
  }

  async getAllStaff() {
    const staff = await this.prisma.staff.findMany();
    return {
      data: staff,
      status: 'success',
    };
  }

  async getStaff(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) throw new ForbiddenException('Staff not found');

    return {
      data: staff,
      status: 'success',
    };
  }

  async updateStaff({ id, dto }: { id: string; dto: UpdateStaffDTO }) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) throw new ForbiddenException('Staff not found');

    const updatedStaff = await this.prisma.staff.update({
      where: { id },
      data: {
        ...dto,
      },
    });

    return {
      data: updatedStaff,
      status: 'success',
    };
  }

  async deactivateStaff(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) throw new ForbiddenException('Staff not found');

    await this.prisma.staff.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return {
      data: staff,
      status: 'success',
      message: 'Staff deactivated successfully',
    };
  }

  async deleteStaff(id: string) {
    const staff = await this.prisma.staff.findUnique({
      where: { id },
    });

    if (!staff) throw new ForbiddenException('Staff not found');

    await this.prisma.staff.delete({
      where: { id },
    });

    return {
      data: staff,
      status: 'success',
      message: 'Staff deleted successfully',
    };
  }
}
