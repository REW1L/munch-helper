import ConfirmDialog from '@/components/ConfirmDialog';
import { AppTheme } from '@/constants/theme';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface BattleDiscardActionProps {
  onConfirmDiscard: () => void;
  confirmVisible: boolean;
  onRequestConfirm: () => void;
  onCancelConfirm: () => void;
  isDiscarding: boolean;
}

function BattleDiscardAction({
  onConfirmDiscard,
  confirmVisible,
  onRequestConfirm,
  onCancelConfirm,
  isDiscarding,
}: BattleDiscardActionProps) {
  return (
    <View style={styles.root} testID="battle-discard-action">
      <TouchableOpacity
        accessibilityLabel="Discard battle"
        accessibilityRole="button"
        accessibilityState={{ disabled: isDiscarding }}
        disabled={isDiscarding}
        style={[styles.discardButton, isDiscarding && styles.discardButtonDisabled]}
        testID="battle-discard-button"
        onPress={onRequestConfirm}
      >
        <Text style={[styles.discardButtonText, isDiscarding && styles.discardButtonTextDisabled]}>
          {isDiscarding ? 'Discarding...' : 'Discard'}
        </Text>
      </TouchableOpacity>

      <ConfirmDialog
        cancelLabel="Keep battle"
        confirmLabel="Discard"
        message="This battle will be discarded and removed from the room. This can't be undone."
        title="Discard battle?"
        visible={confirmVisible}
        onCancel={onCancelConfirm}
        onConfirm={onConfirmDiscard}
      />
    </View>
  );
}

export default memo(BattleDiscardAction);

const styles = StyleSheet.create({
  root: {
    borderTopColor: AppTheme.colors.surfaceSubtle,
    borderTopWidth: 1,
    gap: AppTheme.spacing.sm,
    paddingTop: AppTheme.spacing.lg,
  },
  discardButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.danger,
    borderRadius: AppTheme.radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.md,
  },
  discardButtonDisabled: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
  },
  discardButtonText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
  discardButtonTextDisabled: {
    color: AppTheme.colors.textMuted,
  },
});
