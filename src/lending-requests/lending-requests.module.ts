import { Module } from '@nestjs/common';
import { LendingRequestsController } from './lending-requests.controller';
import { LendingRequestsService } from './lending-requests.service';

@Module({
  controllers: [LendingRequestsController],
  providers: [LendingRequestsService],
})
export class LendingRequestsModule {}
