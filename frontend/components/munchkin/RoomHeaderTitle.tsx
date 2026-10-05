import ButtonLabel from '@/components/ButtonLabel';
import { AppTheme } from '@/constants/theme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type RoomHeaderTitleProps = {
  roomCode: string;
  buttonLabel: string;
  accessibilityLabel: string;
  onCopyPress: () => void;
  editionLabel?: string;
};

export function RoomHeaderTitle({
  roomCode,
  buttonLabel,
  accessibilityLabel,
  onCopyPress,
  editionLabel,
}: RoomHeaderTitleProps) {
  return (
    <View style={styles.headerTitleRow}>
      <View style={styles.headerLabels}>
        <Text style={styles.headerRoomLabel}>Room</Text>
        {editionLabel ? <Text style={styles.headerEdition} numberOfLines={1}>{editionLabel}</Text> : null}
      </View>
      <Text style={styles.headerRoomCode} numberOfLines={1} ellipsizeMode="middle">
        {roomCode}
      </Text>
      <TouchableOpacity
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onCopyPress}
        style={styles.headerCopyButton}
        disabled={roomCode.length === 0}
      >
        <ButtonLabel style={styles.headerCopyButtonLabel}>{buttonLabel}</ButtonLabel>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: AppTheme.spacing.sm,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  headerRoomCode: {
    color: AppTheme.colors.accent,
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  headerRoomLabel: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  headerLabels: { maxWidth: 96 },
  headerEdition: { color: AppTheme.colors.textPrimary, fontSize: 10, fontWeight: '700' },
  headerCopyButton: {
    backgroundColor: AppTheme.colors.elevated,
    borderColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.xs,
  },
  headerCopyButtonLabel: {
    color: AppTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
});
