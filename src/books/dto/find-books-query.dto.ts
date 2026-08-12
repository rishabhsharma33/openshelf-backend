import { IsEnum, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { BookCondition, BookStatus } from '@prisma/client';

export class FindBooksQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  search?: string;

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

  @IsOptional()
  @IsEnum(BookStatus)
  status?: BookStatus;

  @IsOptional()
  @IsIn(['newest', 'oldest'])
  sortBy?: 'newest' | 'oldest';
}
