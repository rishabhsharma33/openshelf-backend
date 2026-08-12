import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import type { User } from '@prisma/client';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CreateLendingRequestDto } from './dto/create-lending-request.dto';
import { LendingRequestsService } from './lending-requests.service';

@UseGuards(JwtAuthGuard)
@Controller('lending-requests')
export class LendingRequestsController {
  constructor(
    private readonly lendingRequestsService: LendingRequestsService,
  ) {}

  @Post()
  create(@Body() dto: CreateLendingRequestDto, @CurrentUser() user: User) {
    return this.lendingRequestsService.create(user.id, dto);
  }

  @Get('sent')
  findSent(@CurrentUser() user: User) {
    return this.lendingRequestsService.findSent(user.id);
  }

  @Get('received')
  findReceived(@CurrentUser() user: User) {
    return this.lendingRequestsService.findReceived(user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: User) {
    return this.lendingRequestsService.findOne(id, user.id);
  }

  @Patch(':id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: User) {
    return this.lendingRequestsService.accept(id, user.id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: User) {
    return this.lendingRequestsService.reject(id, user.id);
  }

  @Patch(':id/cancel')
  cancel(@Param('id') id: string, @CurrentUser() user: User) {
    return this.lendingRequestsService.cancel(id, user.id);
  }

  @Patch(':id/return')
  returnBook(@Param('id') id: string, @CurrentUser() user: User) {
    return this.lendingRequestsService.returnBook(id, user.id);
  }
}
