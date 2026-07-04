import { AppTheme } from '@/constants/theme';
import '@/i18n';
import { Stack } from 'expo-router';
import { t } from 'i18next';
import React from 'react';
import 'react-native-reanimated';

export const unstable_settings = {
  // Ensure any route can link back to `/`
  initialRouteName: 'index',
};

export default function RootLayout() {
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
