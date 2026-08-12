import { Injectable } from '@nestjs/common';
import type { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

const safeUserSelect = {
  id: true,
  name: true,
  email: true,
  phone: true,
  city: true,
  state: true,
  profileImage: true,
  bio: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  getProfile(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      city: user.city,
      state: user.state,
      profileImage: user.profileImage,
      bio: user.bio,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  updateProfile(userId: string, dto: UpdateProfileDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
      select: safeUserSelect,
    });
  }
}
