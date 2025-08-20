import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateDTO } from './dto';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async getProfile(id: string) {
    // Logic to get user profile
    // This could involve fetching user data from the database
    // and returning it in a structured format.

    const cached = await this.prisma.user.findUnique({ where: { id: id } });

    delete cached.password; // Ensure password is not returned

    return { profile: cached };
  }

  async updateProfile({ dto, id }: { dto: UpdateDTO; id: string }) {
    // Fetch current user
    const user = await this.prisma.user.findUnique({
      where: { id: id },
    });
    if (!user) throw new NotFoundException('User not found');

    // Check username uniqueness if provided
    if (dto.username) {
      const hasUser = await this.prisma.user.findUnique({
        where: { username: dto.username },
      });

      if (hasUser && hasUser.email !== user.email) {
        throw new BadRequestException('Username is taken');
      }
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: id },
      data: dto,
    });

    delete updatedUser.password;

    return { profile: updatedUser };
  }
}
