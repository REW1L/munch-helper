import { userProfileContext } from '@/context/UserContext';
import { useUserProfile } from '@/hooks/useUser';
import { Stack } from 'expo-router';
import React from 'react';
import 'react-native-reanimated';

export const unstable_settings = {
  // Ensure any route can link back to `/`
  initialRouteName: 'index',
};

export default function RootLayout() {
  const { userProfile, setUserProfile } = useUserProfile();
  return (
    <userProfileContext.Provider value={{ userProfile, setUserProfile }}>
      <Stack screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: '#473F3F' },
        headerTintColor: 'white',
        contentStyle: { backgroundColor: '#3C3636' },
        headerShadowVisible: false, // Remove header white line
      }} />
    </userProfileContext.Provider>
  );
}
