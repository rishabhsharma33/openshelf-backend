import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, type User } from '@prisma/client';
import { CloudinaryService } from 'src/cloudinary/cloudinary.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateBookDto } from './dto/create-book.dto';
import { FindBooksQueryDto } from './dto/find-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';

const bookOwnerSelect = {
  id: true,
  name: true,
  city: true,
  state: true,
} as const;

@Injectable()
export class BooksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  private async findOwnedBook(id: string, userId: string) {
    const book = await this.prisma.book.findUnique({ where: { id } });

    if (!book) {
      throw new NotFoundException('Book not found');
    }

    if (book.ownerId !== userId) {
      throw new ForbiddenException('You do not own this book');
    }

    return book;
  }

  create(ownerId: string, createBookDto: CreateBookDto) {
    return this.prisma.book.create({
      data: {
        ...createBookDto,
        ownerId,
      },
      include: { owner: { select: bookOwnerSelect } },
    });
  }

  findAll(query: FindBooksQueryDto, currentUser: User) {
    const { search, genre, language, condition, status, sortBy, nearMe } =
      query;
    let { city, state } = query;

    if (nearMe) {
      if (city || state) {
        throw new BadRequestException(
          'Cannot combine nearMe with explicit city or state filters',
        );
      }

      if (currentUser.city) {
        city = currentUser.city;
      } else if (currentUser.state) {
        state = currentUser.state;
      } else {
        throw new BadRequestException(
          'Set your city or state in your profile to use nearMe',
        );
      }
    }

    const ownerFilter: Prisma.UserWhereInput = {
      ...(city && { city: { equals: city, mode: 'insensitive' } }),
      ...(state && { state: { equals: state, mode: 'insensitive' } }),
    };

    return this.prisma.book.findMany({
      where: {
        ...(search && {
          OR: [
            { title: { contains: search, mode: 'insensitive' } },
            { author: { contains: search, mode: 'insensitive' } },
          ],
        }),
        ...(genre && { genre: { equals: genre, mode: 'insensitive' } }),
        ...(language && {
          language: { equals: language, mode: 'insensitive' },
        }),
        ...(condition && { condition }),
        ...(status && { status }),
        ...(Object.keys(ownerFilter).length > 0 && { owner: ownerFilter }),
      },
      include: { owner: { select: bookOwnerSelect } },
      orderBy: { createdAt: sortBy === 'oldest' ? 'asc' : 'desc' },
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
    await this.findOwnedBook(id, userId);

    return this.prisma.book.update({
      where: { id },
      data: updateBookDto,
      include: { owner: { select: bookOwnerSelect } },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOwnedBook(id, userId);

    try {
      await this.prisma.book.delete({ where: { id } });
    } catch (error) {
      const isForeignKeyViolation =
        (error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2003') ||
        (error instanceof Prisma.PrismaClientUnknownRequestError &&
          error.message.includes('foreign key'));

      if (isForeignKeyViolation) {
        throw new ConflictException(
          'This book has lending history and cannot be deleted. Mark it as unavailable instead.',
        );
      }

      throw error;
    }

    return { message: 'Book deleted successfully' };
  }

  async uploadImage(id: string, userId: string, file: Express.Multer.File) {
    await this.findOwnedBook(id, userId);

    const result = await this.cloudinaryService.uploadImage(
      file.buffer,
      `book-${id}`,
    );

    return this.prisma.book.update({
      where: { id },
      data: { coverImage: result.secure_url },
      include: { owner: { select: bookOwnerSelect } },
    });
  }

  async removeImage(id: string, userId: string) {
    const book = await this.findOwnedBook(id, userId);

    if (!book.coverImage) {
      throw new BadRequestException('This book has no cover image to remove');
    }

    await this.cloudinaryService.destroyImage(`book-${id}`);

    return this.prisma.book.update({
      where: { id },
      data: { coverImage: null },
      include: { owner: { select: bookOwnerSelect } },
    });
  }
}
