import { Test, TestingModule } from '@nestjs/testing';
import type { User } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: { user: { update: jest.Mock } };

  const mockUser: User = {
    id: 'user-1',
    name: 'Jane Doe',
    email: 'jane@example.com',
    password: 'hashed-password',
    phone: null,
    city: 'Mumbai',
    state: 'Maharashtra',
    profileImage: null,
    bio: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    prisma = { user: { update: jest.fn() } };

    const module: TestingModule = await Test.createTestingModule({
      providers: [UsersService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getProfile', () => {
    it('strips the password field from the returned profile', () => {
      const profile = service.getProfile(mockUser);

      expect(profile).not.toHaveProperty('password');
      expect(profile).toEqual({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        phone: mockUser.phone,
        city: mockUser.city,
        state: mockUser.state,
        profileImage: mockUser.profileImage,
        bio: mockUser.bio,
        createdAt: mockUser.createdAt,
        updatedAt: mockUser.updatedAt,
      });
    });
  });

  describe('updateProfile', () => {
    it('updates the given user and never selects the password field', async () => {
      const dto = { city: 'Delhi' };
      prisma.user.update.mockResolvedValue({ ...mockUser, city: 'Delhi' });

      const result = await service.updateProfile(mockUser.id, dto);

      expect(prisma.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: mockUser.id }, data: dto }),
      );
      const { select } = prisma.user.update.mock.calls[0][0] as {
        select: Record<string, unknown>;
      };
      expect(select).not.toHaveProperty('password');
      expect(result.city).toBe('Delhi');
    });
  });
});
