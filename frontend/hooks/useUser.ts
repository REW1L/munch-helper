
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';

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

function generateDefaultUserProfile(): UserProfileInterface {
  const randomPostfix = generateRandomNicknamePostfix();
  return {
    id: `user-${Date.now()}-${randomPostfix}`,
    nickname: `Player ${randomPostfix}`,
    avatar: Math.floor(Math.random() * avatars.length),
  };
}

async function updateUserProfile(newUserProfile: UserProfileInterface) {
  // Not implemented yet
  console.log('UPDATE USER PROFILE NOT IMPLEMENTED YET FOR USER ID:', newUserProfile.id);
}

export function useUserProfile(): UseUserResult {
  const [userProfile, setUserProfileState] = useState<UserProfileInterface | null>(null);

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
          const storedUserProfile = JSON.parse(storedUserProfileString) as UserProfileInterface;
          if (storedUserProfile && mounted) {
            setUserProfileState(storedUserProfile);
            return;
          }
        }

        const defaultUserProfile = generateDefaultUserProfile();
        if (mounted) {
          setUserProfileState(defaultUserProfile);
        }
        await persistAndSyncProfile(defaultUserProfile);
      } catch (error) {
        console.error('Failed to load user profile from storage:', error);
      }
    };

    loadUserProfile();

    return () => {
      mounted = false;
    };
  }, [persistAndSyncProfile]);

  return useMemo(
    () => ({
      userProfile: userProfile || generateDefaultUserProfile(),
      setUserProfile,
    }),
    [userProfile, setUserProfile]
  );
}