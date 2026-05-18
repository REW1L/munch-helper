import { AppTheme } from '@/constants/theme';
import React, { memo, useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface ActiveBattleBannerProps {
  battleName?: string | null;
  onViewBattle: () => void;
}

const ActiveBattleBanner = memo(function ActiveBattleBanner({
  battleName,
  onViewBattle,
}: ActiveBattleBannerProps) {
  const label = useMemo(() => battleName?.trim() || 'Battle in progress', [battleName]);

  return (
    <Pressable
      accessible
      accessibilityRole="button"
      accessibilityLabel="Battle in progress. Tap to view."
      onPress={onViewBattle}
      style={({ pressed }) => [styles.banner, pressed && styles.bannerPressed]}
      testID="active-battle-banner"
    >
      <View style={styles.leadingContent}>
        <Text style={styles.icon}>⚔️</Text>
        <Text style={styles.label} numberOfLines={1}>{label}</Text>
      </View>
      <Text style={styles.actionText}>View Battle →</Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  banner: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.danger,
    borderRadius: AppTheme.radius.md,
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
    justifyContent: 'space-between',
    marginHorizontal: AppTheme.spacing.md,
    marginTop: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.sm,
  },
  bannerPressed: {
    opacity: 0.72,
  },
  leadingContent: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: AppTheme.spacing.sm,
  },
  icon: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
  label: {
    color: AppTheme.colors.textPrimary,
    flex: 1,
    ...AppTheme.typography.labelMd,
  },
  actionText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelSm,
  },
});

export default ActiveBattleBanner;
