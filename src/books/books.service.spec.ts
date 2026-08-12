import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookStatus, Prisma, type User } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { BooksService } from './books.service';

describe('BooksService', () => {
  let service: BooksService;
  let prisma: {
    book: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let cloudinaryService: { uploadImage: jest.Mock; destroyImage: jest.Mock };

  const ownerId = 'owner-1';
  const otherUserId = 'user-2';

  const mockBook = {
    id: 'book-1',
    title: 'Clean Code',
    author: 'Robert Martin',
    ownerId,
    status: BookStatus.AVAILABLE,
    coverImage: null as string | null,
  };

  const mockCurrentUser = {
    id: ownerId,
    city: 'Mumbai',
    state: 'Maharashtra',
  } as User;

  beforeEach(async () => {
    prisma = {
      book: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    cloudinaryService = { uploadImage: jest.fn(), destroyImage: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BooksService,
        { provide: PrismaService, useValue: prisma },
        { provide: CloudinaryService, useValue: cloudinaryService },
      ],
    }).compile();

    service = module.get<BooksService>(BooksService);
  });

  describe('findAll', () => {
    it('throws BadRequestException when nearMe is combined with an explicit city', () => {
      expect(() =>
        service.findAll({ nearMe: true, city: 'Delhi' }, mockCurrentUser),
      ).toThrow(BadRequestException);
    });

    it('throws BadRequestException when nearMe is used with no location on the profile', () => {
      const userWithNoLocation = {
        id: ownerId,
        city: null,
        state: null,
      } as User;

      expect(() =>
        service.findAll({ nearMe: true }, userWithNoLocation),
      ).toThrow(BadRequestException);
    });

    it('derives the city filter from the current user when nearMe is set', () => {
      prisma.book.findMany.mockReturnValue([]);

      service.findAll({ nearMe: true }, mockCurrentUser);

      expect(prisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            owner: { city: { equals: 'Mumbai', mode: 'insensitive' } },
          }),
        }),
      );
    });

    it('falls back to state when the user has no city set', () => {
      const stateOnlyUser = {
        id: ownerId,
        city: null,
        state: 'Maharashtra',
      } as User;
      prisma.book.findMany.mockReturnValue([]);

      service.findAll({ nearMe: true }, stateOnlyUser);

      expect(prisma.book.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            owner: { state: { equals: 'Maharashtra', mode: 'insensitive' } },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the book does not exist', async () => {
      prisma.book.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns the book when found', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);

      await expect(service.findOne(mockBook.id)).resolves.toBe(mockBook);
    });
  });

  describe('update', () => {
    it('throws ForbiddenException when the requester is not the owner', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);

      await expect(
        service.update(mockBook.id, otherUserId, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(prisma.book.update).not.toHaveBeenCalled();
    });

    it('updates the book when the requester is the owner', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);
      prisma.book.update.mockResolvedValue({ ...mockBook, title: 'New Title' });

      const result = await service.update(mockBook.id, ownerId, {
        title: 'New Title',
      });

      expect(result.title).toBe('New Title');
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException when the requester is not the owner', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);

      await expect(service.remove(mockBook.id, otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('converts a P2003 foreign key violation into a ConflictException', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);
      prisma.book.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('FK violation', {
          code: 'P2003',
          clientVersion: '6.19.3',
        }),
      );

      await expect(service.remove(mockBook.id, ownerId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('converts an unknown RESTRICT violation mentioning a foreign key into a ConflictException', async () => {
      // This is the actual shape Postgres/Prisma produced for the real bug we
      // found and fixed: Neon's RESTRICT constraint surfaces as SQLSTATE
      // 23001, which Prisma doesn't map to a known P-code.
      prisma.book.findUnique.mockResolvedValue(mockBook);
      prisma.book.delete.mockRejectedValue(
        new Prisma.PrismaClientUnknownRequestError(
          'update or delete on table "Book" violates RESTRICT setting of foreign key constraint',
          { clientVersion: '6.19.3' },
        ),
      );

      await expect(service.remove(mockBook.id, ownerId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('re-throws unrelated errors unchanged', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);
      const unrelatedError = new Error('something else broke');
      prisma.book.delete.mockRejectedValue(unrelatedError);

      await expect(service.remove(mockBook.id, ownerId)).rejects.toBe(
        unrelatedError,
      );
    });

    it('deletes the book and returns a confirmation message', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);
      prisma.book.delete.mockResolvedValue(mockBook);

      const result = await service.remove(mockBook.id, ownerId);

      expect(result).toEqual({ message: 'Book deleted successfully' });
    });
  });

  describe('removeImage', () => {
    it('throws BadRequestException when the book has no cover image', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);

      await expect(service.removeImage(mockBook.id, ownerId)).rejects.toThrow(
        BadRequestException,
      );
      expect(cloudinaryService.destroyImage).not.toHaveBeenCalled();
    });

    it('destroys the Cloudinary asset and clears coverImage', async () => {
      const bookWithImage = {
        ...mockBook,
        coverImage: 'https://res.cloudinary.com/x.png',
      };
      prisma.book.findUnique.mockResolvedValue(bookWithImage);
      prisma.book.update.mockResolvedValue({
        ...bookWithImage,
        coverImage: null,
      });

      await service.removeImage(mockBook.id, ownerId);

      expect(cloudinaryService.destroyImage).toHaveBeenCalledWith(
        `book-${mockBook.id}`,
      );
      expect(prisma.book.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { coverImage: null } }),
      );
    });
  });
});
