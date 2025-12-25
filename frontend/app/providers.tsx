'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { Toaster } from '@/components/ui/toast';
import { UploadProvider } from '@/lib/contexts/upload-context';
import { UploadPanel } from '@/components/upload-panel';
import { I18nProvider } from '@/lib/i18n/use-i18n';

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 30,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <I18nProvider>
        <UploadProvider>
          <Toaster />
          {children}
          <UploadPanel />
          <ReactQueryDevtools initialIsOpen={false} />
        </UploadProvider>
      </I18nProvider>
    </QueryClientProvider>
  );
}

