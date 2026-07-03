import { AppTheme } from '@/constants/theme';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  useEffect(() => {
    AccessibilityInfo.announceForAccessibility(t('banner.reconnecting'));
  }, [t]);

  return (
    <View
      accessible
      accessibilityRole="alert"
      accessibilityLabel={t('banner.reconnecting')}
      style={styles.banner}
    >
      <Text style={styles.label}>{t('banner.reconnecting')}</Text>
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
