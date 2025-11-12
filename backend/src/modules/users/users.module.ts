import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { Invite } from '../../entities/invite.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersInitializer } from './users.initializer';

@Module({
  imports: [TypeOrmModule.forFeature([User, Invite])],
  providers: [UsersService, UsersInitializer],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}

