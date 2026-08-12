import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BookCondition } from '@prisma/client';

export class UpdateBookDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  author?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  isbn?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;

  @IsOptional()
  @IsString()
  coverImage?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  genre?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  language?: string;

  @IsOptional()
  @IsEnum(BookCondition)
  condition?: BookCondition;

  // BORROWED is set by the lending workflow, not editable directly by the owner.
  @IsOptional()
  @IsIn(['AVAILABLE', 'UNAVAILABLE'])
  status?: 'AVAILABLE' | 'UNAVAILABLE';
}
