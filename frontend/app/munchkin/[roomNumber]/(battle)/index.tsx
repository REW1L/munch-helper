import { AppTheme } from '@/constants/theme';
import { useRoomBattle } from '@/hooks/useRoomBattle';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BattleView() {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const { battle, isLoading, errorMessage } = useRoomBattle(roomId);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading && (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={AppTheme.colors.accent} />
            <Text style={styles.stateText}>Loading battle</Text>
          </View>
        )}

        {!isLoading && errorMessage && (
          <View style={styles.stateBlock}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {!isLoading && !errorMessage && battle && (
          <View style={styles.body}>
            <View style={styles.header}>
              <Text style={styles.title}>{battle.name}</Text>
              <Text style={styles.status}>{battle.status}</Text>
            </View>

            <View style={styles.sideSection}>
              <Text style={styles.sideTitle}>Player Side</Text>
              <Text style={styles.sideMeta}>{battle.playerSide.characterIds.length} characters</Text>
            </View>

            <View style={styles.sideSection}>
              <Text style={styles.sideTitle}>Monster Side</Text>
              <Text style={styles.sideMeta}>{battle.monsterSide.monsters.length} monsters</Text>
            </View>
          </View>
        )}

        {!isLoading && !errorMessage && !battle && (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>No active battle</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: AppTheme.spacing.lg,
    gap: AppTheme.spacing.lg,
  },
  body: {
    gap: AppTheme.spacing.lg,
  },
  header: {
    gap: AppTheme.spacing.sm,
  },
  title: {
    color: AppTheme.colors.textPrimary,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700',
  },
  status: {
    alignSelf: 'flex-start',
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.labelMd,
    textTransform: 'capitalize',
  },
  sideSection: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    padding: AppTheme.spacing.lg,
    gap: AppTheme.spacing.sm,
  },
  sideTitle: {
    color: AppTheme.colors.textPrimary,
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600',
  },
  sideMeta: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  stateBlock: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppTheme.spacing.md,
  },
  stateText: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  errorText: {
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.labelMd,
    textAlign: 'center',
  },
});
