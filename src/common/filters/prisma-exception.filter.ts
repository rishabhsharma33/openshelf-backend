import {
  ArgumentsHost,
  Catch,
  ConflictException,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';

type CatchablePrismaError =
  | Prisma.PrismaClientKnownRequestError
  | Prisma.PrismaClientUnknownRequestError
  | Prisma.PrismaClientValidationError;

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientUnknownRequestError,
  Prisma.PrismaClientValidationError,
)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(exception: CatchablePrismaError, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.mapToHttpException(exception);

    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private mapToHttpException(exception: CatchablePrismaError): HttpException {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          const target = (exception.meta?.target as string[] | undefined)?.join(
            ', ',
          );
          return new ConflictException(
            target
              ? `A record with this ${target} already exists`
              : 'A record with these values already exists',
          );
        }
        case 'P2025':
          return new NotFoundException('Record not found');
        case 'P2003':
          return new ConflictException(
            'This action would violate a related record and was blocked',
          );
        default:
          break;
      }
    }

    if (
      exception instanceof Prisma.PrismaClientUnknownRequestError &&
      exception.message.includes('foreign key')
    ) {
      return new ConflictException(
        'This action would violate a related record and was blocked',
      );
    }

    if (exception instanceof Prisma.PrismaClientValidationError) {
      return new HttpException('Invalid request data', HttpStatus.BAD_REQUEST);
    }

    return new HttpException(
      'Something went wrong',
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
}
