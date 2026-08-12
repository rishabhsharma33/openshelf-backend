import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BookStatus, LendingRequestStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateLendingRequestDto } from './dto/create-lending-request.dto';

const userSummarySelect = {
  id: true,
  name: true,
  city: true,
  state: true,
} as const;

const bookSummarySelect = {
  id: true,
  title: true,
  author: true,
  coverImage: true,
  status: true,
} as const;

const lendingRequestInclude = {
  book: { select: bookSummarySelect },
  requester: { select: userSummarySelect },
  owner: { select: userSummarySelect },
} as const;

@Injectable()
export class LendingRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(requesterId: string, dto: CreateLendingRequestDto) {
    const book = await this.prisma.book.findUnique({
      where: { id: dto.bookId },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.ownerId === requesterId) {
      throw new BadRequestException(
        'You cannot request to borrow your own book',
      );
    }

    if (book.status !== BookStatus.AVAILABLE) {
      throw new BadRequestException('This book is not available for borrowing');
    }

    const existingPendingRequest = await this.prisma.lendingRequest.findFirst({
      where: {
        bookId: dto.bookId,
        requesterId,
        status: LendingRequestStatus.PENDING,
      },
    });

    if (existingPendingRequest) {
      throw new ConflictException(
        'You already have a pending request for this book',
      );
    }

    return this.prisma.lendingRequest.create({
      data: {
        bookId: dto.bookId,
        message: dto.message,
        requesterId,
        ownerId: book.ownerId,
      },
      include: lendingRequestInclude,
    });
  }

  findSent(requesterId: string) {
    return this.prisma.lendingRequest.findMany({
      where: { requesterId },
      include: lendingRequestInclude,
      orderBy: { requestedAt: 'desc' },
    });
  }

  findReceived(ownerId: string) {
    return this.prisma.lendingRequest.findMany({
      where: { ownerId },
      include: lendingRequestInclude,
      orderBy: { requestedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const request = await this.prisma.lendingRequest.findUnique({
      where: { id },
      include: lendingRequestInclude,
    });

    if (!request) {
      throw new NotFoundException('Lending request not found');
    }

    if (request.requesterId !== userId && request.ownerId !== userId) {
      throw new ForbiddenException(
        'You do not have access to this lending request',
      );
    }

    return request;
  }

  async accept(id: string, ownerId: string) {
    const request = await this.prisma.lendingRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Lending request not found');
    }

    if (request.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this book');
    }

    if (request.status !== LendingRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be accepted');
    }

    const respondedAt = new Date();

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.lendingRequest.update({
        where: { id },
        data: { status: LendingRequestStatus.ACCEPTED, respondedAt },
        include: lendingRequestInclude,
      }),
      this.prisma.book.update({
        where: { id: request.bookId },
        data: { status: BookStatus.BORROWED },
      }),
      this.prisma.lendingRequest.updateMany({
        where: {
          bookId: request.bookId,
          status: LendingRequestStatus.PENDING,
          id: { not: id },
        },
        data: { status: LendingRequestStatus.REJECTED, respondedAt },
      }),
    ]);

    return updatedRequest;
  }

  async reject(id: string, ownerId: string) {
    const request = await this.prisma.lendingRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Lending request not found');
    }

    if (request.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this book');
    }

    if (request.status !== LendingRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be rejected');
    }

    return this.prisma.lendingRequest.update({
      where: { id },
      data: { status: LendingRequestStatus.REJECTED, respondedAt: new Date() },
      include: lendingRequestInclude,
    });
  }

  async cancel(id: string, requesterId: string) {
    const request = await this.prisma.lendingRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Lending request not found');
    }

    if (request.requesterId !== requesterId) {
      throw new ForbiddenException('You did not make this request');
    }

    if (request.status !== LendingRequestStatus.PENDING) {
      throw new BadRequestException('Only pending requests can be cancelled');
    }

    return this.prisma.lendingRequest.update({
      where: { id },
      data: { status: LendingRequestStatus.CANCELLED, respondedAt: new Date() },
      include: lendingRequestInclude,
    });
  }

  async returnBook(id: string, ownerId: string) {
    const request = await this.prisma.lendingRequest.findUnique({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException('Lending request not found');
    }

    if (request.ownerId !== ownerId) {
      throw new ForbiddenException('You do not own this book');
    }

    if (request.status !== LendingRequestStatus.ACCEPTED) {
      throw new BadRequestException(
        'Only accepted requests can be marked as returned',
      );
    }

    const returnedAt = new Date();

    const [updatedRequest] = await this.prisma.$transaction([
      this.prisma.lendingRequest.update({
        where: { id },
        data: { status: LendingRequestStatus.RETURNED, returnedAt },
        include: lendingRequestInclude,
      }),
      this.prisma.book.update({
        where: { id: request.bookId },
        data: { status: BookStatus.AVAILABLE },
      }),
    ]);

    return updatedRequest;
  }
}
