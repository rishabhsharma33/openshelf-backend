import { Module } from '@nestjs/common';
import { CloudinaryModule } from 'src/cloudinary/cloudinary.module';
import { BooksController } from './books.controller';
import { BooksService } from './books.service';

@Module({
  imports: [CloudinaryModule],
  controllers: [BooksController],
  providers: [BooksService],
})
export class BooksModule {}
