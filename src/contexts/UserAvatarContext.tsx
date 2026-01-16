'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { getDefaultAvatar } from '@/lib/avatar';

type AvatarCacheEntry = {
  avatarUrl: string | null;
  gender: string | null;
  name: string | null;
};

type UserAvatarContextType = {
  currentUserId: string | null;
  getAvatar: (userId: string, gender?: string | null, fallbackName?: string | null) => string;
  updateAvatar: (userId: string, newAvatarUrl: string | null) => void;
  invalidateAvatar: (userId: string) => void;
  preloadAvatars: (
    users: Array<{
      id: string;
      avatarUrl?: string | null;
      gender?: string | null;
      name?: string | null;
    }>
  ) => void;
  updateCurrentUser: (avatarUrl: string | null, gender?: string | null) => void;
};

const UserAvatarContext = createContext<UserAvatarContextType | undefined>(undefined);

type UserAvatarProviderProps = {
  children: ReactNode;
  currentUserId?: string | null;
  currentUserAvatar?: string | null;
  currentUserGender?: string | null;
  currentUserName?: string | null;
  initialUsers?: Array<{
    id: string;
    avatarUrl?: string | null;
    gender?: string | null;
    name?: string | null;
  }>;
};

export function UserAvatarProvider({
  children,
  currentUserId = null,
  currentUserAvatar = null,
  currentUserGender = null,
  currentUserName = null,
  initialUsers = [],
}: UserAvatarProviderProps) {
  const [avatarCache, setAvatarCache] = useState<Map<string, AvatarCacheEntry>>(() => {
    const cache = new Map<string, AvatarCacheEntry>();

    // Initialize with current user if provided
    if (currentUserId) {
      cache.set(currentUserId, {
        avatarUrl: currentUserAvatar,
        gender: currentUserGender,
        name: currentUserName,
      });
    }

    // Initialize with any provided initial users
    initialUsers.forEach(user => {
      cache.set(user.id, {
        avatarUrl: user.avatarUrl ?? null,
        gender: user.gender ?? null,
        name: user.name ?? null,
      });
    });

    return cache;
  });

  // Get avatar URL for a user, using cache or falling back to default
  const getAvatar = useCallback(
    (userId: string, gender?: string | null, fallbackName?: string | null): string => {
      const cached = avatarCache.get(userId);

      if (cached?.avatarUrl) {
        return cached.avatarUrl;
      }

      // Use cached gender if available, otherwise use provided gender
      const effectiveGender = cached?.gender ?? gender;
      const effectiveName = cached?.name ?? fallbackName;

      // Generate default avatar
      return getDefaultAvatar(effectiveGender, effectiveName || userId);
    },
    [avatarCache]
  );

  // Update a user's avatar in the cache
  const updateAvatar = useCallback((userId: string, newAvatarUrl: string | null) => {
    setAvatarCache(prev => {
      const newCache = new Map(prev);
      const existing = newCache.get(userId);
      newCache.set(userId, {
        avatarUrl: newAvatarUrl,
        gender: existing?.gender ?? null,
        name: existing?.name ?? null,
      });
      return newCache;
    });
  }, []);

  // Invalidate (remove) a user's avatar from cache to force refetch
  const invalidateAvatar = useCallback((userId: string) => {
    setAvatarCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(userId);
      return newCache;
    });
  }, []);

  // Preload multiple users' avatars into cache
  const preloadAvatars = useCallback(
    (
      users: Array<{
        id: string;
        avatarUrl?: string | null;
        gender?: string | null;
        name?: string | null;
      }>
    ) => {
      setAvatarCache(prev => {
        const newCache = new Map(prev);
        users.forEach(user => {
          // Only update if not already in cache or if new data has more info
          const existing = newCache.get(user.id);
          if (!existing || user.avatarUrl) {
            newCache.set(user.id, {
              avatarUrl: user.avatarUrl ?? existing?.avatarUrl ?? null,
              gender: user.gender ?? existing?.gender ?? null,
              name: user.name ?? existing?.name ?? null,
            });
          }
        });
        return newCache;
      });
    },
    []
  );

  // Update current user's avatar and optionally gender
  const updateCurrentUser = useCallback(
    (avatarUrl: string | null, gender?: string | null) => {
      if (!currentUserId) return;

      setAvatarCache(prev => {
        const newCache = new Map(prev);
        const existing = newCache.get(currentUserId);
        newCache.set(currentUserId, {
          avatarUrl: avatarUrl,
          gender: gender ?? existing?.gender ?? null,
          name: existing?.name ?? null,
        });
        return newCache;
      });
    },
    [currentUserId]
  );

  const value = useMemo(
    () => ({
      currentUserId,
      getAvatar,
      updateAvatar,
      invalidateAvatar,
      preloadAvatars,
      updateCurrentUser,
    }),
    [currentUserId, getAvatar, updateAvatar, invalidateAvatar, preloadAvatars, updateCurrentUser]
  );

  return <UserAvatarContext.Provider value={value}>{children}</UserAvatarContext.Provider>;
}

export function useUserAvatarContext() {
  const context = useContext(UserAvatarContext);
  if (!context) {
    throw new Error('useUserAvatarContext must be used within a UserAvatarProvider');
  }
  return context;
}

// Safe version that returns defaults when outside provider (for public pages)
export function useUserAvatarContextSafe() {
  const context = useContext(UserAvatarContext);
  if (!context) {
    return {
      currentUserId: null,
      getAvatar: (userId: string, gender?: string | null, fallbackName?: string | null) =>
        getDefaultAvatar(gender, fallbackName || userId),
      updateAvatar: () => {},
      invalidateAvatar: () => {},
      preloadAvatars: () => {},
      updateCurrentUser: () => {},
    };
  }
  return context;
}
