'use client';

import { useState, useEffect } from 'react';
import { usersService } from '@/lib/services/users';

export function useAvatar(avatarKey: string | undefined | null) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAvatar = async () => {
      if (!avatarKey) {
        setAvatarUrl(null);
        return;
      }

      // If it's already a full URL, use it
      if (avatarKey.startsWith('http://') || avatarKey.startsWith('https://')) {
        setAvatarUrl(avatarKey);
        return;
      }

      // Get avatar URL from backend - use direct endpoint with timestamp to avoid cache
      setIsLoading(true);
      try {
        const directUrl = usersService.getAvatarDirectUrl();
        // Add timestamp to avoid caching issues
        const urlWithTimestamp = `${directUrl}?t=${Date.now()}`;
        setAvatarUrl(urlWithTimestamp);
      } catch (error) {
        console.error('Failed to load avatar URL:', error);
        setAvatarUrl(null);
      } finally {
        setIsLoading(false);
      }
    };

    loadAvatar();
  }, [avatarKey]);

  return { avatarUrl, isLoading };
}

