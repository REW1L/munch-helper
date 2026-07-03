import { AppTheme } from '@/constants/theme';
import { useLocalization } from '@/i18n';
import React, { useEffect } from 'react';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

interface ReconnectingBannerProps {
  visible: boolean;
}

export default function ReconnectingBanner({ visible }: ReconnectingBannerProps) {
  if (!visible) {
    return null;
  }

  return <MountedReconnectingBanner />;
}

function MountedReconnectingBanner() {
  const { t } = useLocalization();
  const label = t('network.reconnecting');

  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(label);
  }, [label]);

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={label}
      style={styles.banner}
    >
      <Text style={styles.label}>{label}</Text>
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
