import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { UsersService } from './users.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';
import { UpdateUserStatusDto } from './dto/update-user-status.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { CreateUserDto } from './dto/create-user.dto';
import * as argon2 from 'argon2';

@Controller('users')
@UseGuards(JwtAccessGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('invite')
  @Roles(UserRole.ADMIN)
  async inviteUser(
    @Body() dto: CreateUserDto,
    @CurrentUser('id') adminId: string,
  ) {
    // Hash password
    const passwordHash = await argon2.hash(dto.password);
    // Tạo user mới
    const user = await this.usersService.createUser({
      email: dto.email,
      username: dto.username,
      passwordHash,
      role: dto.role,
      phone: dto.phone,
      createdBy: adminId,
    });
    return this.toResponse(user);
  }
  @Get('me')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getCurrentUser(@CurrentUser('id') userId: string) {
    const user = await this.usersService.findById(userId);
    return this.toResponse(user);
  }

  @Patch('me')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async updateCurrentUser(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    const user = await this.usersService.updateUserProfile(userId, dto);
    return this.toResponse(user);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  async listUsers(@Query() query: ListUsersQueryDto) {
    const [users, total] = await this.usersService.listUsers(query);
    const data = users.map((user) => this.toResponse(user));

    return {
      data,
      meta: {
        total,
        page: query.page ?? 1,
        limit: query.limit ?? 20,
      },
    };
  }

  @Patch(':id/role')
  @Roles(UserRole.ADMIN)
  async updateRole(
    @Param('id') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    const user = await this.usersService.updateUserRole(userId, dto.role);
    return this.toResponse(user);
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN)
  async updateStatus(
    @Param('id') userId: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    const user = await this.usersService.updateUserStatus(userId, dto.status);
    return this.toResponse(user);
  }

  private toResponse(user: any) {
    if (!user) {
      return null;
    }

    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }
}

