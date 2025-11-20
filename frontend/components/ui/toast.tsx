'use client';

import React, { useState, useCallback } from 'react';

export type ToastVariant = 'default' | 'success' | 'error' | 'warning';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

let toastId = 0;
const listeners: ((toast: Toast) => void)[] = [];

export const toast = {
  success: (message: string) => {
    const id = String(++toastId);
    const newToast = { id, message, variant: 'success' as ToastVariant };
    listeners.forEach(listener => listener(newToast));
    setTimeout(() => {
      listeners.forEach(listener => listener({ ...newToast, variant: 'default' }));
    }, 3000);
  },
  error: (message: string) => {
    const id = String(++toastId);
    const newToast = { id, message, variant: 'error' as ToastVariant };
    listeners.forEach(listener => listener(newToast));
    setTimeout(() => {
      listeners.forEach(listener => listener({ ...newToast, variant: 'default' }));
    }, 3000);
  },
  warning: (message: string) => {
    const id = String(++toastId);
    const newToast = { id, message, variant: 'warning' as ToastVariant };
    listeners.forEach(listener => listener(newToast));
    setTimeout(() => {
      listeners.forEach(listener => listener({ ...newToast, variant: 'default' }));
    }, 3000);
  },
};

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  React.useEffect(() => {
    const listener = (newToast: Toast) => {
      setToasts(prev => {
        if (newToast.variant === 'default') {
          return prev.filter(t => t.id !== newToast.id);
        }
        return [...prev, newToast];
      });
    };

    listeners.push(listener);
    return () => {
      listeners.splice(listeners.indexOf(listener), 1);
    };
  }, []);

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-4 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

function ToastItem({ toast: t }: { toast: Toast }) {
  const bgColor = {
    success: 'bg-green-900/90 border-green-700',
    error: 'bg-red-900/90 border-red-700',
    warning: 'bg-yellow-900/90 border-yellow-700',
    default: 'bg-zinc-900/90 border-zinc-700',
  }[t.variant];

  const textColor = {
    success: 'text-green-200',
    error: 'text-red-200',
    warning: 'text-yellow-200',
    default: 'text-zinc-200',
  }[t.variant];

  const icon = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    default: 'ℹ',
  }[t.variant];

  return (
    <div className={`${bgColor} border rounded-lg p-3 text-sm ${textColor} flex items-center gap-3 pointer-events-auto max-w-sm`}>
      <span className="text-lg">{icon}</span>
      <span>{t.message}</span>
    </div>
  );
}
