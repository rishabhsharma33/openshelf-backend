import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { BooksModule } from './books/books.module';
import { LendingRequestsModule } from './lending-requests/lending-requests.module';
import { validateEnv } from './config/env.validation';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    UsersModule,
    PrismaModule,
    AuthModule,
    BooksModule,
    LendingRequestsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
