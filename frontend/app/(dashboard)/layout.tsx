'use client';

import { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';
import { ErrorBoundary } from '@/components/error-boundary';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AppShell>{children}</AppShell>
    </ErrorBoundary>
  );
}

