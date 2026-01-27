import { Stack } from 'expo-router';
import 'react-native-reanimated';

export const unstable_settings = {
  // Ensure any route can link back to `/`
  initialRouteName: 'index',
};


export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerShown: true,
      headerStyle: { backgroundColor: '#473F3F' },
      headerTintColor: 'white',
      contentStyle: { backgroundColor: '#3C3636' },
    }} />
  );
}
