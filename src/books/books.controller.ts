import {
  Body,
  Controller,
  Delete,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  ParseFilePipe,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { User } from '@prisma/client';
import { BooksService } from './books.service';
import { CreateBookDto } from './dto/create-book.dto';
import { FindBooksQueryDto } from './dto/find-books-query.dto';
import { UpdateBookDto } from './dto/update-book.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

@UseGuards(JwtAuthGuard)
@Controller('books')
export class BooksController {
  constructor(private readonly booksService: BooksService) {}

  @Post()
  create(@Body() createBookDto: CreateBookDto, @CurrentUser() user: User) {
    return this.booksService.create(user.id, createBookDto);
  }

  @Get()
  findAll(@Query() query: FindBooksQueryDto, @CurrentUser() user: User) {
    return this.booksService.findAll(query, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.booksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookDto: UpdateBookDto,
    @CurrentUser() user: User,
  ) {
    return this.booksService.update(id, user.id, updateBookDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.remove(id, user.id);
  }

  @Post(':id/image')
  @UseInterceptors(
    FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_SIZE_BYTES } }),
  )
  uploadImage(
    @Param('id') id: string,
    @CurrentUser() user: User,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_IMAGE_SIZE_BYTES }),
          new FileTypeValidator({
            fileType: /^image\/(jpeg|png|webp)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.booksService.uploadImage(id, user.id, file);
  }

  @Delete(':id/image')
  removeImage(@Param('id') id: string, @CurrentUser() user: User) {
    return this.booksService.removeImage(id, user.id);
  }
}
