import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const bookOwnerSelect = {
  id: true,
  name: true,
  city: true,
  state: true,
} as const;

@Injectable()
export class BooksService {
  constructor(private readonly prisma: PrismaService) {}

  create(ownerId: string, createBookDto: CreateBookDto) {
    return this.prisma.book.create({
      data: {
        ...createBookDto,
        ownerId,
      },
      include: { owner: { select: bookOwnerSelect } },
    });
  }

  findAll() {
    return this.prisma.book.findMany({
      include: { owner: { select: bookOwnerSelect } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const book = await this.prisma.book.findUnique({
      where: { id },
      include: { owner: { select: bookOwnerSelect } },
    });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    return book;
  }

  async update(id: string, userId: string, updateBookDto: UpdateBookDto) {
    const book = await this.prisma.book.findUnique({ where: { id } });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.ownerId !== userId) {
      throw new ForbiddenException('You do not own this book');
    }

    return this.prisma.book.update({
      where: { id },
      data: updateBookDto,
      include: { owner: { select: bookOwnerSelect } },
    });
  }

  async remove(id: string, userId: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.ownerId !== userId) {
      throw new ForbiddenException('You do not own this book');
    }

    await this.prisma.book.delete({ where: { id } });

    return { message: 'Book deleted successfully' };
  }
}
