import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Subscription } from '../../entities/subscription.entity';
import { User } from '../../entities/user.entity';
import { SubscriptionPlan } from '../../common/enums/subscription-plan.enum';
import { PaymentStatus } from '../../common/enums/payment-status.enum';
import { StorageQuotaService } from '../storage/storage-quota.service';
import { NotificationsService } from '../notifications/notifications.service';
import { QrCodeService } from './qr-code.service';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepository: Repository<Subscription>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private storageQuotaService: StorageQuotaService,
    private notificationsService: NotificationsService,
    private qrCodeService: QrCodeService,
    private configService: ConfigService,
  ) {}

  private readonly PLAN_PRICES: Record<SubscriptionPlan, number> = {
    [SubscriptionPlan.FREE]: 0,
    [SubscriptionPlan.PLUS]: 10000, // 10k VND/tháng
    [SubscriptionPlan.PRO]: 15000, // 15k VND/tháng
  };

  private get BANK_INFO() {
    const paymentConfig = this.configService.get('payment');
    
    // Fallback trực tiếp từ process.env nếu config chưa load
    return {
      bankName: paymentConfig?.bankName || process.env.PAYMENT_BANK_NAME || 'Techcombank',
      accountNumber: paymentConfig?.accountNumber || process.env.PAYMENT_BANK_ACCOUNT || '',
      accountName: paymentConfig?.accountName || process.env.PAYMENT_BANK_ACCOUNT_NAME || '',
      branchName: paymentConfig?.branchName || process.env.PAYMENT_BANK_BRANCH || '',
    };
  }

  async createSubscriptionRequest(
    userId: string,
    plan: SubscriptionPlan,
    paymentMethod: string,
    transactionId?: string,
    paymentProof?: string,
    notes?: string,
  ): Promise<{
    subscription: Subscription;
    qrCode?: string;
    paymentInfo?: any;
  }> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (plan === SubscriptionPlan.FREE) {
      throw new BadRequestException('Cannot create subscription for FREE plan');
    }

    const amount = this.PLAN_PRICES[plan];
    const now = new Date();
    const expiresAt = new Date();
    expiresAt.setMonth(expiresAt.getMonth() + 1);

    const subscription = this.subscriptionRepository.create({
      userId,
      plan,
      amount,
      status: PaymentStatus.PENDING,
      paymentMethod,
      transactionId,
      paymentProof,
      notes,
      startsAt: now,
      expiresAt,
    });

    const saved = await this.subscriptionRepository.save(subscription);

    let qrCode: string | undefined;
    let paymentInfo: any;

    if (paymentMethod === 'bank_transfer' || paymentMethod === 'qr_code') {
      const qrData = await this.qrCodeService.generateBankTransferQr(
        saved.id,
        amount,
        this.BANK_INFO,
      );
      qrCode = qrData.qrCode;
      paymentInfo = qrData.paymentInfo;
    }

    await this.notifyAdminsAboutPendingPayment(saved, user);

    return {
      subscription: saved,
      qrCode,
      paymentInfo,
    };
  }

  private async notifyAdminsAboutPendingPayment(
    subscription: Subscription,
    user: User,
  ): Promise<void> {
    const admins = await this.userRepository.find({
      where: { role: UserRole.ADMIN },
    });

    for (const admin of admins) {
      await this.notificationsService.createAndDispatch({
        userId: admin.id,
        type: 'payment.pending',
        message: `User ${user.username} đã tạo yêu cầu thanh toán gói ${this.getPlanName(subscription.plan)} - ${subscription.amount.toLocaleString()}đ`,
        payload: {
          subscriptionId: subscription.id,
          userId: user.id,
          username: user.username,
          plan: subscription.plan,
          amount: subscription.amount,
          paymentMethod: subscription.paymentMethod,
          createdAt: subscription.createdAt.toISOString(),
        },
      });
    }
  }

  async approvePayment(
    subscriptionId: string,
    adminId: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
      relations: ['user'],
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('Payment already approved');
    }

    await this.storageQuotaService.upgradeSubscription(
      subscription.userId,
      subscription.plan,
      subscription.expiresAt,
    );

    subscription.status = PaymentStatus.COMPLETED;
    subscription.approvedById = adminId;
    subscription.approvedAt = new Date();
    const saved = await this.subscriptionRepository.save(subscription);

    await this.notificationsService.createAndDispatch({
      userId: subscription.userId,
      type: 'subscription.activated',
      message: `Gói ${this.getPlanName(subscription.plan)} đã được kích hoạt! Dung lượng của bạn đã được nâng cấp.`,
      payload: {
        subscriptionId: saved.id,
        plan: subscription.plan,
        expiresAt: subscription.expiresAt.toISOString(),
      },
    });

    return saved;
  }

  async rejectPayment(
    subscriptionId: string,
    adminId: string,
    reason?: string,
  ): Promise<Subscription> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    subscription.status = PaymentStatus.FAILED;
    subscription.approvedById = adminId;
    subscription.approvedAt = new Date();
    if (reason) {
      subscription.notes = (subscription.notes || '') + `\n[Rejected: ${reason}]`;
    }

    return await this.subscriptionRepository.save(subscription);
  }

  async getUserSubscriptions(userId: string): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  async getPendingPayments(): Promise<Subscription[]> {
    return this.subscriptionRepository.find({
      where: { status: PaymentStatus.PENDING },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }

  async getPaymentQrCode(subscriptionId: string): Promise<{
    qrCode: string;
    paymentInfo: any;
  }> {
    const subscription = await this.subscriptionRepository.findOne({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    if (subscription.status !== PaymentStatus.PENDING) {
      throw new BadRequestException('Subscription is not pending');
    }

    const qrData = await this.qrCodeService.generateBankTransferQr(
      subscription.id,
      subscription.amount,
      this.BANK_INFO,
    );

    return qrData;
  }

  async getAvailablePlans(): Promise<Array<{
    plan: SubscriptionPlan;
    name: string;
    price: number;
    quota: number;
    quotaFormatted: string;
    features: string[];
  }>> {
    return [
      {
        plan: SubscriptionPlan.FREE,
        name: 'Free',
        price: 0,
        quota: this.storageQuotaService.getQuotaForPlan(SubscriptionPlan.FREE),
        quotaFormatted: '100 MB',
        features: ['100MB dung lượng', 'Upload file cơ bản', 'Phù hợp cho cá nhân'],
      },
      {
        plan: SubscriptionPlan.PLUS,
        name: 'Plus',
        price: this.PLAN_PRICES[SubscriptionPlan.PLUS],
        quota: this.storageQuotaService.getQuotaForPlan(SubscriptionPlan.PLUS),
        quotaFormatted: '5 GB',
        features: ['5GB dung lượng', 'Upload không giới hạn số lượng file', 'Hỗ trợ tốt hơn'],
      },
      {
        plan: SubscriptionPlan.PRO,
        name: 'Pro',
        price: this.PLAN_PRICES[SubscriptionPlan.PRO],
        quota: this.storageQuotaService.getQuotaForPlan(SubscriptionPlan.PRO),
        quotaFormatted: 'Không giới hạn',
        features: ['Dung lượng không giới hạn', 'Upload không giới hạn', 'Tất cả tính năng', 'Ưu tiên xử lý'],
      },
    ];
  }

  private getPlanName(plan: SubscriptionPlan): string {
    const names: Record<SubscriptionPlan, string> = {
      [SubscriptionPlan.FREE]: 'Free',
      [SubscriptionPlan.PLUS]: 'Plus',
      [SubscriptionPlan.PRO]: 'Pro',
    };
    return names[plan] || plan;
  }
}

