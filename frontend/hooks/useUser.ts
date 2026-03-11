
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

import { ApiError } from '@/api/http';
import { createUser, getUser, updateUser } from '@/api/users';
import avatars from '@/constants/avatars';

const USER_STORAGE_KEY = 'user';

// Generate a random URL-safe string
const generateRandomNicknamePostfix = (length: number = 6): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export interface UserProfileInterface {
  id: string;
  nickname: string;
  avatar: number;
}

export interface UseUserResult {
  userProfile: UserProfileInterface;
  setUserProfile: (newUserProfile: UserProfileInterface) => Promise<void>;
}

const StoredUserProfileSchema = z.object({
  id: z.string(),
  nickname: z.string(),
  avatar: z.number().int().min(0),
});

function generateDefaultUserProfile(): UserProfileInterface {
  const randomPostfix = generateRandomNicknamePostfix();
  return {
    id: '',
    nickname: `Player ${randomPostfix}`,
    avatar: Math.floor(Math.random() * avatars.length),
  };
}

async function createRemoteUser(defaultProfile: UserProfileInterface): Promise<UserProfileInterface> {
  const createdUser = await createUser({
    name: defaultProfile.nickname,
    avatarId: defaultProfile.avatar,
  });

  return {
    id: createdUser.id,
    nickname: createdUser.name,
    avatar: createdUser.avatarId,
  };
}

async function updateUserProfile(newUserProfile: UserProfileInterface): Promise<void> {
  if (!newUserProfile.id) {
    return;
  }

  await updateUser(newUserProfile.id, {
    name: newUserProfile.nickname,
    avatarId: newUserProfile.avatar,
  });
}

export function useUserProfile(): UseUserResult {
  const [userProfile, setUserProfileState] = useState<UserProfileInterface | null>(null);
  const [fallbackProfile] = useState<UserProfileInterface>(() => generateDefaultUserProfile());

  const persistAndSyncProfile = useCallback(async (nextProfile: UserProfileInterface) => {
    await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(nextProfile));
    await updateUserProfile(nextProfile);
  }, []);

  const setUserProfile = useCallback(
    async (newUserProfile: UserProfileInterface) => {
      setUserProfileState(newUserProfile);
      await persistAndSyncProfile(newUserProfile);
    },
    [persistAndSyncProfile]
  );

  useEffect(() => {
    let mounted = true;

    const loadUserProfile = async () => {
      try {
        const storedUserProfileString = await AsyncStorage.getItem(USER_STORAGE_KEY);
        if (storedUserProfileString) {
          const parsedProfile = StoredUserProfileSchema.safeParse(JSON.parse(storedUserProfileString));
          const storedUserProfile = parsedProfile.success ? parsedProfile.data : null;
          if (storedUserProfile && mounted) {
            try {
              const remoteUser = await getUser(storedUserProfile.id);
              const syncedProfile: UserProfileInterface = {
                id: remoteUser.id,
                nickname: remoteUser.name,
                avatar: remoteUser.avatarId,
              };
              setUserProfileState(syncedProfile);
              await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(syncedProfile));
            } catch (error) {
              if (error instanceof ApiError && error.status === 404) {
                const recreatedProfile = await createRemoteUser(storedUserProfile);
                if (!mounted) {
                  return;
                }
                setUserProfileState(recreatedProfile);
                await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(recreatedProfile));
              } else {
                if (!mounted) {
                  return;
                }
                setUserProfileState(storedUserProfile);
              }
            }
            return;
          }
        }

        const defaultUserProfile = await createRemoteUser(generateDefaultUserProfile());
        if (mounted) {
          setUserProfileState(defaultUserProfile);
        }
        await AsyncStorage.setItem(USER_STORAGE_KEY, JSON.stringify(defaultUserProfile));
      } catch (error) {
        console.error('Failed to load user profile from storage:', error);
        if (mounted) {
          setUserProfileState(fallbackProfile);
        }
      }
    };

    loadUserProfile();

    return () => {
      mounted = false;
    };
  }, [fallbackProfile]);

  return useMemo(
    () => ({
      userProfile: userProfile || fallbackProfile,
      setUserProfile,
    }),
    [fallbackProfile, setUserProfile, userProfile]
  );
}