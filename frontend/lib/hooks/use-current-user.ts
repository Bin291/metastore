'use client';

import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { ApiError } from '@/lib/api-client';
import { useAuthStore } from '@/lib/stores/auth-store';
import { User } from '@/types/api';

export function useCurrentUser() {
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);
  const setLoading = useAuthStore((state) => state.setLoading);

  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const user = await api.get<User>('/users/me');
        return user;
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
  });

  useEffect(() => {
    setLoading(query.isLoading);

    if (query.isLoading) {
      return;
    }

    if (query.isSuccess) {
      if (query.data) {
        setUser(query.data);
      } else {
        clearUser();
      }
    }

    if (query.isError) {
      clearUser();
    }
  }, [query.data, query.isError, query.isLoading, query.isSuccess, clearUser, setLoading, setUser]);

  return query;
}

