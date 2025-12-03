import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { User } from '../../entities/user.entity';
import { Invite } from '../../entities/invite.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UserStatus } from '../../common/enums/user-status.enum';

export interface ListUsersOptions {
  page?: number;
  limit?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
}

export interface UpdateUserProfileInput {
  profileMetadata?: Record<string, unknown>;
  email?: string | null;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Invite)
    private readonly inviteRepository: Repository<Invite>,
    private readonly configService: ConfigService,
  ) {}

  async createUser(params: {
    email: string;
    username: string;
    passwordHash: string;
    role: UserRole;
    phone?: string;
    createdBy?: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      email: params.email,
      username: params.username,
      passwordHash: params.passwordHash,
      role: params.role,
      phone: params.phone,
      status: UserStatus.ACTIVE,
      bucketPrefix: 'pending',
    });
    const saved = await this.userRepository.save(user);
    const bucketPrefix = this.generateBucketPrefix(saved.id);
    await this.userRepository.update(saved.id, { bucketPrefix });
    saved.bucketPrefix = bucketPrefix;
    return saved;
  }

  async ensureDefaultAdmin(): Promise<{ created: boolean; username: string }> {
    const adminConfig = this.configService.get<{
      defaultUsername: string;
      defaultPassword: string;
      defaultEmail?: string;
    }>('admin');

    // Check if admin user already exists by username or email
    const existingAdmin = await this.userRepository.findOne({
      where: [
        { username: adminConfig!.defaultUsername },
        ...(adminConfig?.defaultEmail ? [{ email: adminConfig.defaultEmail }] : []),
      ],
    });

    if (existingAdmin) {
      return { created: false, username: existingAdmin.username };
    }

    const passwordHash = await argon2.hash(adminConfig!.defaultPassword);

    const adminUser = this.userRepository.create({
      username: adminConfig!.defaultUsername,
      passwordHash,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      email: adminConfig?.defaultEmail ?? undefined,
      bucketPrefix: 'pending',
    });

    const savedAdmin = await this.userRepository.save(adminUser);
    const bucketPrefix = this.generateBucketPrefix(savedAdmin.id);

    await this.userRepository.update(savedAdmin.id, { bucketPrefix });
    savedAdmin.bucketPrefix = bucketPrefix;

    return { created: true, username: savedAdmin.username };
  }

  async findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async findByUsername(username: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { username } });
  }

  async findActiveById(id: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { id, status: UserStatus.ACTIVE },
    });
  }

  async listUsers(options: ListUsersOptions): Promise<[User[], number]> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 20;

    const qb = this.userRepository.createQueryBuilder('user');

    if (options.role) {
      qb.andWhere('user.role = :role', { role: options.role });
    }

    if (options.status) {
      qb.andWhere('user.status = :status', { status: options.status });
    }

    if (options.search) {
      qb.andWhere(
        '(LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${options.search.toLowerCase()}%` },
      );
    }

    qb.orderBy('user.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    return qb.getManyAndCount();
  }

  async createUserFromInvite(params: {
    invite: Invite;
    username: string;
    passwordHash: string;
    email?: string;
  }): Promise<User> {
    const user = this.userRepository.create({
      username: params.username,
      passwordHash: params.passwordHash,
      role: params.invite.role,
      status: UserStatus.ACTIVE,
      email: params.email ?? params.invite.email,
      bucketPrefix: 'pending',
    });

    const saved = await this.userRepository.save(user);
    const bucketPrefix = this.generateBucketPrefix(saved.id);

    await this.userRepository.update(saved.id, { bucketPrefix });
    saved.bucketPrefix = bucketPrefix;

    params.invite.createdForUserId = saved.id;
    await this.inviteRepository.save(params.invite);

    return saved;
  }

  async updateLastLogin(userId: string): Promise<void> {
    await this.userRepository.update(userId, { lastLoginAt: new Date() });
  }

  async updateUserRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = role;
    return this.userRepository.save(user);
  }

  async updateUserStatus(userId: string, status: UserStatus): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = status;
    return this.userRepository.save(user);
  }

  async updateUserProfile(
    userId: string,
    input: UpdateUserProfileInput,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (input.email !== undefined) {
      user.email = input.email;
    }

    if (input.profileMetadata !== undefined) {
      user.profileMetadata = input.profileMetadata;
    }

    return this.userRepository.save(user);
  }

  async setRefreshTokenHash(
    userId: string,
    hash: string | null,
  ): Promise<void> {
    await this.userRepository.update(userId, { refreshTokenHash: hash });
  }

  async findByRefreshToken(
    userId: string,
    refreshToken: string,
  ): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user || !user.refreshTokenHash) {
      return null;
    }

    const isValid = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!isValid) {
      return null;
    }

    return user;
  }

  private generateBucketPrefix(userId: string): string {
    return `users/${userId}`;
  }
}

