import { RootErrorBoundary } from '@/components/RootErrorBoundary';
import { getRuntimeConfig } from '@/config/runtime';
import { AppTheme } from '@/constants/theme';
import { userProfileContext } from '@/context/UserContext';
import { useUserProfile } from '@/hooks/useUser';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
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
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <userProfileContext.Provider value={providerValue}>
          <Stack screenOptions={{
            headerShown: true,
            headerStyle: { backgroundColor: AppTheme.colors.surface },
            headerTintColor: AppTheme.colors.textPrimary,
            contentStyle: { backgroundColor: AppTheme.colors.background },
            headerShadowVisible: false,
          }} />
        </userProfileContext.Provider>
      </QueryClientProvider>
    </RootErrorBoundary>
  );
}
