import { api } from '../api-client';

export interface SubscriptionPlan {
  plan: 'free' | 'plus' | 'pro';
  name: string;
  price: number;
  quota: number;
  quotaFormatted: string;
  features: string[];
}

export interface Subscription {
  id: string;
  userId: string;
  plan: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: string;
  transactionId?: string;
  startsAt: string;
  expiresAt: string;
  createdAt: string;
}

export const paymentsService = {
  async getPlans(): Promise<SubscriptionPlan[]> {
    const response = await api.get<{ data: SubscriptionPlan[] }>('/payments/plans');
    return response.data;
  },

  async subscribe(data: {
    plan: 'plus' | 'pro';
    paymentMethod: string;
    transactionId?: string;
    paymentProof?: string;
    notes?: string;
  }): Promise<{
    success: boolean;
    message: string;
    data: {
      subscription: Subscription;
      qrCode?: string;
      paymentInfo?: {
        amount: number;
        bankName: string;
        accountNumber: string;
        accountName: string;
        branchName?: string;
        content: string;
      };
    };
  }> {
    return api.post('/payments/subscribe', data);
  },

  async getMySubscriptions(): Promise<Subscription[]> {
    const response = await api.get<{ data: Subscription[] }>('/payments/my-subscriptions');
    return response.data;
  },

  async getQrCode(subscriptionId: string): Promise<{
    qrCode: string;
    paymentInfo: any;
  }> {
    return api.get(`/payments/subscription/${subscriptionId}/qr-code`);
  },
};

