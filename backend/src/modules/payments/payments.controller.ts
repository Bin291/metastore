import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { JwtAccessGuard } from '../../common/guards/jwt-access.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { SubscriptionPlan } from '../../common/enums/subscription-plan.enum';

@Controller('payments')
@UseGuards(JwtAccessGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get('plans')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getPlans() {
    return { data: await this.paymentsService.getAvailablePlans() };
  }

  @Post('subscribe')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async subscribe(
    @CurrentUser('id') userId: string,
    @Body() body: {
      plan: SubscriptionPlan;
      paymentMethod: string;
      transactionId?: string;
      paymentProof?: string;
      notes?: string;
    },
  ) {
    const result = await this.paymentsService.createSubscriptionRequest(
      userId,
      body.plan,
      body.paymentMethod,
      body.transactionId,
      body.paymentProof,
      body.notes,
    );

    return {
      success: true,
      message: 'Yêu cầu đăng ký đã được gửi. Admin sẽ xác nhận trong thời gian sớm nhất.',
      data: {
        subscription: result.subscription,
        qrCode: result.qrCode,
        paymentInfo: result.paymentInfo,
      },
    };
  }

  @Get('subscription/:id/qr-code')
  @Roles(UserRole.USER)
  async getQrCode(
    @Param('id') subscriptionId: string,
    @CurrentUser('id') userId: string,
  ) {
    const subscriptions = await this.paymentsService.getUserSubscriptions(userId);
    const subscription = subscriptions.find((s) => s.id === subscriptionId);
    
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }

    return await this.paymentsService.getPaymentQrCode(subscriptionId);
  }

  @Get('my-subscriptions')
  @Roles(UserRole.ADMIN, UserRole.USER)
  async getMySubscriptions(@CurrentUser('id') userId: string) {
    const subscriptions = await this.paymentsService.getUserSubscriptions(userId);
    return { data: subscriptions };
  }

  @Get('pending')
  @Roles(UserRole.ADMIN)
  async getPendingPayments() {
    const payments = await this.paymentsService.getPendingPayments();
    return { data: payments };
  }

  @Post(':id/approve')
  @Roles(UserRole.ADMIN)
  async approvePayment(
    @Param('id') subscriptionId: string,
    @CurrentUser('id') adminId: string,
  ) {
    const subscription = await this.paymentsService.approvePayment(
      subscriptionId,
      adminId,
    );
    return {
      success: true,
      message: 'Payment approved. Subscription đã được kích hoạt tự động.',
      data: subscription,
    };
  }

  @Post(':id/reject')
  @Roles(UserRole.ADMIN)
  async rejectPayment(
    @Param('id') subscriptionId: string,
    @CurrentUser('id') adminId: string,
    @Body() body: { reason?: string },
  ) {
    const subscription = await this.paymentsService.rejectPayment(
      subscriptionId,
      adminId,
      body.reason,
    );
    return {
      success: true,
      message: 'Payment rejected.',
      data: subscription,
    };
  }
}

