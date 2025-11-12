'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authService, LoginPayload, AcceptInvitePayload } from '@/lib/services/auth';
import { useAuthStore } from '@/lib/stores/auth-store';
import { User } from '@/types/api';

export function useAuthActions() {
  const queryClient = useQueryClient();
  const setUser = useAuthStore((state) => state.setUser);
  const clearUser = useAuthStore((state) => state.clearUser);

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => authService.login(payload),
    onSuccess: (user: User) => {
      setUser(user);
      queryClient.setQueryData(['current-user'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => authService.logout(),
    onSuccess: () => {
      clearUser();
      queryClient.setQueryData(['current-user'], null);
      queryClient.invalidateQueries();
    },
  });

  const acceptInviteMutation = useMutation({
    mutationFn: (payload: AcceptInvitePayload) =>
      authService.acceptInvite(payload),
  });

  return {
    loginMutation,
    logoutMutation,
    acceptInviteMutation,
  };
}

