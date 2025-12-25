'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { paymentsService, SubscriptionPlan } from '@/lib/services/payments';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FiCheck, FiZap, FiStar, FiX, FiCopy, FiCheckCircle } from 'react-icons/fi';

interface PaymentQrDialogProps {
  open: boolean;
  onClose: () => void;
  qrCode?: string;
  paymentInfo?: {
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    branchName?: string;
    content: string;
  };
  planName?: string;
}

function PaymentQrDialog({ open, onClose, qrCode, paymentInfo, planName }: PaymentQrDialogProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!open) return null;

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopied(field);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl p-8 max-w-lg w-full border border-zinc-800 shadow-2xl animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Thanh toán gói {planName}</h2>
            <p className="text-sm text-zinc-400">Quét QR code để thanh toán</p>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white transition p-2 hover:bg-zinc-800 rounded-lg"
          >
            <FiX className="w-5 h-5" />
          </button>
        </div>

        {/* QR Code */}
        {qrCode && (
          <div className="flex justify-center mb-6">
            <div className="bg-white p-6 rounded-xl shadow-lg">
              <img src={qrCode} alt="QR Code" className="w-72 h-72" />
            </div>
          </div>
        )}

        {/* Payment Info */}
        {paymentInfo && (
          <div className="space-y-4 mb-6">
            {/* Amount */}
            <div className="bg-gradient-to-r from-blue-600/20 to-blue-500/20 border border-blue-500/30 rounded-lg p-4">
              <div className="text-sm text-zinc-400 mb-1">Số tiền cần thanh toán</div>
              <div className="text-3xl font-bold text-blue-400">
                {paymentInfo.amount.toLocaleString('vi-VN')}đ
              </div>
            </div>

            {/* Bank Info */}
            <div className="space-y-3 border border-zinc-700 rounded-lg p-4 bg-zinc-800/50">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-zinc-300">Ngân hàng:</span>
                <span className="text-sm font-semibold text-zinc-200">{paymentInfo.bankName}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-zinc-300">Số tài khoản:</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono font-semibold text-zinc-200">
                    {paymentInfo.accountNumber}
                  </span>
                  <button
                    onClick={() => copyToClipboard(paymentInfo.accountNumber, 'account')}
                    className="p-1.5 hover:bg-zinc-700 rounded transition text-zinc-400 hover:text-white"
                    title="Copy số tài khoản"
                  >
                    {copied === 'account' ? (
                      <FiCheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <FiCopy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-zinc-300">Tên tài khoản:</span>
                <span className="text-sm font-semibold text-zinc-200">{paymentInfo.accountName}</span>
              </div>

              {paymentInfo.branchName && (
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-300">Chi nhánh:</span>
                  <span className="text-sm text-zinc-200">{paymentInfo.branchName}</span>
                </div>
              )}

              <div className="pt-2 border-t border-zinc-700">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-zinc-300">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-mono text-xs text-zinc-200 max-w-[200px] truncate">
                      {paymentInfo.content}
                    </span>
                    <button
                      onClick={() => copyToClipboard(paymentInfo.content, 'content')}
                      className="p-1.5 hover:bg-zinc-700 rounded transition text-zinc-400 hover:text-white"
                      title="Copy nội dung"
                    >
                      {copied === 'content' ? (
                        <FiCheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <FiCopy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4 mb-6">
          <div className="space-y-2 text-sm text-zinc-300">
            <p className="flex items-center gap-2">
              <span className="text-lg">📱</span>
              <span>Mở app ngân hàng và quét QR code ở trên</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">💳</span>
              <span>Hoặc chuyển khoản theo thông tin trên</span>
            </p>
            <p className="flex items-center gap-2">
              <span className="text-lg">⏰</span>
              <span>Admin sẽ xác nhận và kích hoạt gói sau khi nhận được thanh toán</span>
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
          >
            Đóng
          </Button>
          <Button
            onClick={onClose}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Đã thanh toán xong
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function SubscriptionPage() {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [showQr, setShowQr] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['subscription-plans'],
    queryFn: () => paymentsService.getPlans(),
  });

  // Get current user's plan
  const currentPlan = user?.subscriptionPlan || 'free';

  const subscribeMutation = useMutation({
    mutationFn: (data: any) => paymentsService.subscribe(data),
    onSuccess: (response) => {
      const { qrCode, paymentInfo, subscription } = response.data;
      
      if (qrCode && paymentInfo) {
        setQrData({ qrCode, paymentInfo, planName: selectedPlan?.name });
        setShowQr(true);
      } else {
        alert('Yêu cầu đã được gửi! Admin sẽ xác nhận trong thời gian sớm nhất.');
      }
      
      queryClient.invalidateQueries({ queryKey: ['my-subscriptions'] });
    },
    onError: (error: any) => {
      alert(error?.message || 'Có lỗi xảy ra khi đăng ký. Vui lòng thử lại.');
    },
  });

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (plan.plan === 'free') return;

    setSelectedPlan(plan);

    // Tự động dùng QR code làm phương thức thanh toán
    const data = {
      plan: plan.plan,
      paymentMethod: 'qr_code',
    };

    subscribeMutation.mutate(data);
  };

  // Refresh user data after subscription request
  useEffect(() => {
    if (subscribeMutation.isSuccess) {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    }
  }, [subscribeMutation.isSuccess, queryClient]);

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case 'free':
        return null;
      case 'plus':
        return <FiZap className="w-6 h-6 text-blue-400" />;
      case 'pro':
        return <FiStar className="w-6 h-6 text-yellow-400" />;
      default:
        return null;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'free':
        return 'border-zinc-700 bg-zinc-900/50';
      case 'plus':
        return 'border-blue-500 bg-zinc-900';
      case 'pro':
        return 'border-yellow-500 bg-zinc-900';
      default:
        return 'border-zinc-700';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="text-center text-zinc-400 py-12">Đang tải...</div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold text-white">Nâng cấp gói</h1>
          <p className="text-zinc-400 text-lg">
            Chọn gói phù hợp với nhu cầu sử dụng của bạn
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans?.map((plan) => (
            <Card
              key={plan.plan}
              className={`p-6 hover:shadow-xl transition-all duration-300 border-2 ${getPlanColor(plan.plan)} ${
                plan.plan === 'free' ? 'opacity-90' : 'hover:scale-105'
              } relative overflow-hidden`}
            >
              {/* Popular badge for Pro */}
              {plan.plan === 'pro' && (
                <div className="absolute top-4 right-4">
                  <Badge className="bg-yellow-500 text-black text-xs font-bold">
                    Phổ biến
                  </Badge>
                </div>
              )}

              {/* Icon and Name */}
              <div className="flex items-center gap-3 mb-4">
                {getPlanIcon(plan.plan)}
                <h3 className="text-2xl font-bold text-white">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-6">
                <div className="text-4xl font-bold text-white mb-2">
                  {plan.price === 0 ? (
                    'Miễn phí'
                  ) : (
                    <>
                      {plan.price.toLocaleString('vi-VN')}
                      <span className="text-lg text-zinc-400">đ</span>
                      <span className="text-base text-zinc-500">/tháng</span>
                    </>
                  )}
                </div>
                <div className="text-sm text-zinc-400 font-medium">
                  {plan.quotaFormatted} dung lượng
                </div>
              </div>

              {/* Features */}
              <ul className="mb-6 space-y-3">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-start text-sm text-zinc-300">
                    <FiCheck className="w-5 h-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA Button */}
              <Button
                onClick={() => handleSubscribe(plan)}
                disabled={plan.plan === 'free' || plan.plan === currentPlan || subscribeMutation.isPending}
                className={`w-full py-6 text-base font-semibold ${
                  plan.plan === 'free' || plan.plan === currentPlan
                    ? 'bg-zinc-700 cursor-not-allowed text-zinc-400'
                    : plan.plan === 'plus'
                    ? 'bg-blue-600 hover:bg-blue-700 text-white'
                    : 'bg-yellow-600 hover:bg-yellow-700 text-black font-bold'
                }`}
              >
                {plan.plan === 'free' ? (
                  'Gói miễn phí'
                ) : plan.plan === currentPlan ? (
                  'Gói hiện tại'
                ) : subscribeMutation.isPending ? (
                  'Đang xử lý...'
                ) : (
                  'Đăng ký ngay'
                )}
              </Button>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="max-w-3xl mx-auto mt-12">
          <Card className="p-6 bg-zinc-800/50 border-zinc-700">
            <h3 className="text-lg font-semibold text-white mb-3">Thông tin thanh toán</h3>
            <ul className="space-y-2 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <span>💳</span>
                <span>Thanh toán qua QR Code - Quét và thanh toán ngay trên app ngân hàng</span>
              </li>
              <li className="flex items-start gap-2">
                <span>⚡</span>
                <span>Kích hoạt ngay sau khi admin xác nhận thanh toán</span>
              </li>
              <li className="flex items-start gap-2">
                <span>🔄</span>
                <span>Gói tự động gia hạn hàng tháng</span>
              </li>
              <li className="flex items-start gap-2">
                <span>❌</span>
                <span>Có thể hủy bất cứ lúc nào</span>
              </li>
            </ul>
          </Card>
        </div>
      </div>

      {/* QR Code Dialog */}
      {showQr && qrData && (
        <PaymentQrDialog
          open={showQr}
          onClose={() => {
            setShowQr(false);
            setQrData(null);
            setSelectedPlan(null);
          }}
          qrCode={qrData.qrCode}
          paymentInfo={qrData.paymentInfo}
          planName={qrData.planName}
        />
      )}
    </>
  );
}
