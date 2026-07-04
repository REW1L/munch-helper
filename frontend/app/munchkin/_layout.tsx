import { getRuntimeConfig } from '@/config/runtime';
import { AppTheme } from '@/constants/theme';
import { useUserProfile } from '@/hooks/useUser';
import '@/i18n';
import { QueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { t } from 'i18next';
import React, { useMemo, useState } from 'react';
import 'react-native-reanimated';

export const unstable_settings = {
  // Ensure any route can link back to `/`
  initialRouteName: 'index',
};

export default function RootLayout() {
  // Fail fast on invalid runtime configuration instead of silently using wrong endpoints.
  getRuntimeConfig();

  const { userProfile, setUserProfile } = useUserProfile();
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            retry: 1,
          },
        },
      })
  );

  const providerValue = useMemo(
    () => ({ userProfile, setUserProfile }),
    [setUserProfile, userProfile]
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          title: `Munch ⚔️ ${t('rooms.classic')}`,
        }}
      />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: AppTheme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
      </Stack>
    </>
  );
}
