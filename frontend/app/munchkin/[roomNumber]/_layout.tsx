import React from 'react';
import { RoomHeaderTitle } from '@/components/munchkin/RoomHeaderTitle';
import { AppTheme } from '@/constants/theme';
import { useRoomCodeClipboard } from '@/hooks/useRoomCodeClipboard';
import { useRoomBattle } from '@/hooks/useRoomBattle';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter, useSegments } from 'expo-router';
import { StyleSheet, TouchableOpacity } from 'react-native';

export default function RoomLayout() {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const router = useRouter();
  const segments = useSegments();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const roomCode = roomId ?? '';
  const { buttonLabel, accessibilityLabel, copyRoomCode } = useRoomCodeClipboard(roomCode);
  const { battle } = useRoomBattle(roomId);
  const isBattleRoute = segments.some((segment) => String(segment) === '(battle)');

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerBackButtonDisplayMode: 'minimal',
          headerBackVisible: isBattleRoute ? false : undefined,
          headerLeft: isBattleRoute
            ? () => (
                <TouchableOpacity
                  accessibilityLabel="Back to room"
                  accessibilityRole="button"
                  onPress={() => {
                    if (router.canGoBack()) {
                      router.back();
                      return;
                    }

                    router.replace({
                      pathname: '/munchkin/[roomNumber]',
                      params: { roomNumber: roomId ?? roomCode },
                    });
                  }}
                  style={styles.battleBackButton}
                >
                  <Ionicons name="chevron-back" size={28} color={AppTheme.colors.textPrimary} />
                </TouchableOpacity>
              )
            : undefined,
          headerTitle: isBattleRoute
            ? undefined
            : () => (
                <RoomHeaderTitle
                  roomCode={roomCode}
                  buttonLabel={buttonLabel}
                  accessibilityLabel={accessibilityLabel}
                  onCopyPress={() => {
                    void copyRoomCode();
                  }}
                />
              ),
          title: isBattleRoute ? battle?.name ?? 'Battle' : undefined,
        }}
      />
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: AppTheme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(battle)" options={{ presentation: 'modal', headerShown: false }} />
      </Stack>
    </>
  );
}

const styles = StyleSheet.create({
  battleBackButton: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
    marginLeft: -12,
  },
});
