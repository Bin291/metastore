import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { FileObject } from '../../entities/file-object.entity';
import { SubscriptionPlan } from '../../common/enums/subscription-plan.enum';
import { FileStatus } from '../../common/enums/file-status.enum';

@Injectable()
export class StorageQuotaService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(FileObject)
    private fileRepository: Repository<FileObject>,
  ) {}

  private readonly PLAN_QUOTAS: Record<SubscriptionPlan, number> = {
    [SubscriptionPlan.FREE]: 100 * 1024 * 1024, // 100MB
    [SubscriptionPlan.PLUS]: 5 * 1024 * 1024 * 1024, // 5GB
    [SubscriptionPlan.PRO]: Number.MAX_SAFE_INTEGER, // Unlimited (sử dụng số lớn nhất)
  };

  getQuotaForPlan(plan: SubscriptionPlan): number {
    const quota = this.PLAN_QUOTAS[plan] || this.PLAN_QUOTAS[SubscriptionPlan.FREE];
    // Return -1 for unlimited plans
    return quota === Number.MAX_SAFE_INTEGER ? -1 : quota;
  }

  async calculateUsedStorage(userId: string): Promise<number> {
    const result = await this.fileRepository
      .createQueryBuilder('file')
      .select('COALESCE(SUM(CAST(file.size AS INTEGER)), 0)', 'total')
      .where('file.ownerId = :userId', { userId })
      .andWhere('file.isFolder = :isFolder', { isFolder: false })
      .andWhere('file.status = :status', { status: FileStatus.APPROVED })
      .getRawOne();

    return parseInt(result?.total || '0', 10);
  }

  async updateStorageUsed(userId: string): Promise<void> {
    const usedBytes = await this.calculateUsedStorage(userId);
    await this.userRepository.update(userId, {
      storageUsedBytes: String(usedBytes),
    });
  }

  async checkQuota(userId: string, fileSize: number): Promise<{
    allowed: boolean;
    used: number;
    quota: number;
    available: number;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    const now = new Date();
    if (user.subscriptionExpiresAt && user.subscriptionExpiresAt < now) {
      user.subscriptionPlan = SubscriptionPlan.FREE;
      user.storageQuotaBytes = String(this.getQuotaForPlan(SubscriptionPlan.FREE));
      await this.userRepository.save(user);
    }

    const quota = parseInt(user.storageQuotaBytes || '0', 10);
    const used = parseInt(user.storageUsedBytes || '0', 10);
    
    // PRO plan is unlimited
    const isUnlimited = user.subscriptionPlan === SubscriptionPlan.PRO;
    const available = isUnlimited ? Number.MAX_SAFE_INTEGER : quota - used;

    return {
      allowed: isUnlimited || available >= fileSize,
      used,
      quota: isUnlimited ? -1 : quota, // -1 means unlimited
      available: isUnlimited ? -1 : available,
    };
  }

  async validateQuota(userId: string, fileSize: number): Promise<void> {
    const check = await this.checkQuota(userId, fileSize);
    if (!check.allowed) {
      const quotaText = check.quota === -1 ? 'Unlimited' : this.formatBytes(check.quota);
      const availableText = check.available === -1 ? 'Unlimited' : this.formatBytes(check.available);
      throw new BadRequestException(
        `Storage quota exceeded. Used: ${this.formatBytes(check.used)}, ` +
        `Quota: ${quotaText}, ` +
        `Available: ${availableText}, ` +
        `Required: ${this.formatBytes(fileSize)}`
      );
    }
  }

  async upgradeSubscription(
    userId: string,
    plan: SubscriptionPlan,
    expiresAt: Date,
  ): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new BadRequestException('User not found');
    }

    user.subscriptionPlan = plan;
    const quota = this.PLAN_QUOTAS[plan] || this.PLAN_QUOTAS[SubscriptionPlan.FREE];
    user.storageQuotaBytes = String(quota);
    user.subscriptionExpiresAt = expiresAt;

    return await this.userRepository.save(user);
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  }
}

