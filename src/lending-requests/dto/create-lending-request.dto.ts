import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateLendingRequestDto {
  @IsUUID()
  @IsNotEmpty()
  bookId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
