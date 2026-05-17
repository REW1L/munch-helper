import { AppTheme } from '@/constants/theme';
import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

interface ReconnectingBannerProps {
  visible: boolean;
}

export default function ReconnectingBanner({ visible }: ReconnectingBannerProps) {
  useEffect(() => {
    if (!visible) {
      return;
    }

    AccessibilityInfo.announceForAccessibility('Reconnecting…');
  }, [visible]);

  if (!visible) {
    return null;
  }

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel="Reconnecting…"
      style={styles.banner}
    >
      <Text style={styles.label}>Reconnecting…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
    paddingVertical: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.md,
  },
  label: {
    color: AppTheme.colors.textMuted,
    textAlign: 'center',
    ...AppTheme.typography.labelMd,
  },
});
