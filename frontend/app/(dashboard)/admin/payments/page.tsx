'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function AdminPaymentsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'pending-payments'],
    queryFn: async () => {
      const res = await api.get<{ data: any[] }>('/payments/pending');
      return res.data;
    },
    refetchInterval: 30000,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.post(`/payments/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-payments'] });
      // Invalidate user query để refresh subscription info
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
      alert('✅ Đã kích hoạt subscription tự động!');
    },
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(`/payments/${id}/reject`, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'pending-payments'] });
    },
  });

  const payments = data || [];

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-white">Xác nhận thanh toán</h1>
        {payments.length > 0 && (
          <Badge variant="danger" className="animate-pulse">
            ⚠️ {payments.length} thanh toán mới
          </Badge>
        )}
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr className="border-b border-zinc-700">
              <th className="px-6 py-3 text-left text-sm font-medium text-zinc-300">User</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-zinc-300">Gói</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-zinc-300">Số tiền</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-zinc-300">Phương thức</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-zinc-300">Thời gian</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-zinc-300">Hành động</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment: any) => (
              <tr key={payment.id} className="border-b border-zinc-800 hover:bg-zinc-800/50">
                <td className="px-6 py-4 text-sm text-zinc-200">
                  {payment.user?.username || payment.userId}
                </td>
                <td className="px-6 py-4">
                  <Badge>{payment.plan}</Badge>
                </td>
                <td className="px-6 py-4 text-sm text-zinc-200">
                  {payment.amount.toLocaleString('vi-VN')}đ
                </td>
                <td className="px-6 py-4 text-sm text-zinc-300">{payment.paymentMethod}</td>
                <td className="px-6 py-4 text-sm text-zinc-300">
                  {new Date(payment.createdAt).toLocaleString('vi-VN')}
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Button
                    onClick={() => approveMutation.mutate(payment.id)}
                    disabled={approveMutation.isPending}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    ✅ Xác nhận
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      const reason = prompt('Lý do từ chối:');
                      if (reason) {
                        rejectMutation.mutate({ id: payment.id, reason });
                      }
                    }}
                    disabled={rejectMutation.isPending}
                    className="border-red-500 text-red-400 hover:bg-red-500/10"
                  >
                    ❌ Từ chối
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {payments.length === 0 && !isLoading && (
          <p className="px-6 py-8 text-center text-sm text-zinc-500">
            Không có thanh toán nào đang chờ xác nhận.
          </p>
        )}
      </Card>
    </div>
  );
}

