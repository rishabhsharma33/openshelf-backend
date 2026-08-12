import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { BookStatus, LendingRequestStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { LendingRequestsService } from './lending-requests.service';

describe('LendingRequestsService', () => {
  let service: LendingRequestsService;
  let prisma: {
    book: { findUnique: jest.Mock; update: jest.Mock };
    lendingRequest: {
      findFirst: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      updateMany: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const ownerId = 'owner-1';
  const requesterId = 'requester-1';
  const otherUserId = 'stranger-1';

  const mockBook = {
    id: 'book-1',
    ownerId,
    status: BookStatus.AVAILABLE,
  };

  const mockRequest = {
    id: 'request-1',
    bookId: mockBook.id,
    requesterId,
    ownerId,
    status: LendingRequestStatus.PENDING,
  };

  beforeEach(async () => {
    prisma = {
      book: { findUnique: jest.fn(), update: jest.fn() },
      lendingRequest: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        updateMany: jest.fn(),
      },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LendingRequestsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<LendingRequestsService>(LendingRequestsService);
  });

  describe('create', () => {
    it('throws NotFoundException when the book does not exist', async () => {
      prisma.book.findUnique.mockResolvedValue(null);

      await expect(
        service.create(requesterId, { bookId: 'missing' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when requesting your own book', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);

      await expect(
        service.create(ownerId, { bookId: mockBook.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException when the book is not available', async () => {
      prisma.book.findUnique.mockResolvedValue({
        ...mockBook,
        status: BookStatus.BORROWED,
      });

      await expect(
        service.create(requesterId, { bookId: mockBook.id }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ConflictException when a pending request already exists', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);
      prisma.lendingRequest.findFirst.mockResolvedValue(mockRequest);

      await expect(
        service.create(requesterId, { bookId: mockBook.id }),
      ).rejects.toThrow(ConflictException);
    });

    it('creates the request when everything checks out', async () => {
      prisma.book.findUnique.mockResolvedValue(mockBook);
      prisma.lendingRequest.findFirst.mockResolvedValue(null);
      prisma.lendingRequest.create.mockResolvedValue(mockRequest);

      const result = await service.create(requesterId, {
        bookId: mockBook.id,
        message: 'hi',
      });

      expect(prisma.lendingRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { bookId: mockBook.id, message: 'hi', requesterId, ownerId },
        }),
      );
      expect(result).toBe(mockRequest);
    });
  });

  describe('findOne', () => {
    it('throws ForbiddenException when the user is neither requester nor owner', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(
        service.findOne(mockRequest.id, otherUserId),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows the requester to view it', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.findOne(mockRequest.id, requesterId)).resolves.toBe(
        mockRequest,
      );
    });

    it('allows the owner to view it', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.findOne(mockRequest.id, ownerId)).resolves.toBe(
        mockRequest,
      );
    });
  });

  describe('accept', () => {
    it('throws ForbiddenException when the requester is not the book owner', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.accept(mockRequest.id, otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException when the request is not pending', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: LendingRequestStatus.REJECTED,
      });

      await expect(service.accept(mockRequest.id, ownerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('accepts the request, borrows the book, and rejects sibling pending requests', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      const acceptedRequest = {
        ...mockRequest,
        status: LendingRequestStatus.ACCEPTED,
      };
      prisma.lendingRequest.update.mockReturnValue(
        Promise.resolve(acceptedRequest),
      );
      prisma.book.update.mockReturnValue(
        Promise.resolve({ ...mockBook, status: BookStatus.BORROWED }),
      );
      prisma.lendingRequest.updateMany.mockReturnValue(
        Promise.resolve({ count: 1 }),
      );

      const result = await service.accept(mockRequest.id, ownerId);

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: mockBook.id },
        data: { status: BookStatus.BORROWED },
      });
      expect(prisma.lendingRequest.updateMany).toHaveBeenCalledWith({
        where: {
          bookId: mockBook.id,
          status: LendingRequestStatus.PENDING,
          id: { not: mockRequest.id },
        },
        data: expect.objectContaining({
          status: LendingRequestStatus.REJECTED,
        }),
      });
      expect(result).toBe(acceptedRequest);
    });
  });

  describe('reject', () => {
    it('throws ForbiddenException when the requester is not the book owner', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.reject(mockRequest.id, otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects a pending request', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.lendingRequest.update.mockResolvedValue({
        ...mockRequest,
        status: LendingRequestStatus.REJECTED,
      });

      const result = await service.reject(mockRequest.id, ownerId);

      expect(result.status).toBe(LendingRequestStatus.REJECTED);
    });
  });

  describe('cancel', () => {
    it('throws ForbiddenException when the requester did not make the request', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.cancel(mockRequest.id, otherUserId)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('cancels a pending request', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);
      prisma.lendingRequest.update.mockResolvedValue({
        ...mockRequest,
        status: LendingRequestStatus.CANCELLED,
      });

      const result = await service.cancel(mockRequest.id, requesterId);

      expect(result.status).toBe(LendingRequestStatus.CANCELLED);
    });
  });

  describe('returnBook', () => {
    it('throws BadRequestException when the request is not accepted', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue(mockRequest);

      await expect(service.returnBook(mockRequest.id, ownerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('marks the request returned and the book available again', async () => {
      prisma.lendingRequest.findUnique.mockResolvedValue({
        ...mockRequest,
        status: LendingRequestStatus.ACCEPTED,
      });
      const returnedRequest = {
        ...mockRequest,
        status: LendingRequestStatus.RETURNED,
      };
      prisma.lendingRequest.update.mockReturnValue(
        Promise.resolve(returnedRequest),
      );
      prisma.book.update.mockReturnValue(
        Promise.resolve({ ...mockBook, status: BookStatus.AVAILABLE }),
      );

      const result = await service.returnBook(mockRequest.id, ownerId);

      expect(prisma.book.update).toHaveBeenCalledWith({
        where: { id: mockBook.id },
        data: { status: BookStatus.AVAILABLE },
      });
      expect(result).toBe(returnedRequest);
    });
  });
});
