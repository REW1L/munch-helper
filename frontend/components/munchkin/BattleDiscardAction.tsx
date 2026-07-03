import ButtonLabel from '@/components/ButtonLabel';
import ConfirmDialog from '@/components/ConfirmDialog';
import { AppTheme } from '@/constants/theme';
import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

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
  const { t } = useTranslation();
  return (
    <View style={styles.root} testID="battle-discard-action">
      <TouchableOpacity
        accessibilityLabel={t('battle.discardBattleA11y')}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDiscarding }}
        disabled={isDiscarding}
        style={[styles.discardButton, isDiscarding && styles.discardButtonDisabled]}
        testID="battle-discard-button"
        onPress={onRequestConfirm}
      >
        <ButtonLabel style={[styles.discardButtonText, isDiscarding && styles.discardButtonTextDisabled]}>
          {isDiscarding ? t('battle.discarding') : t('battle.discard')}
        </ButtonLabel>
      </TouchableOpacity>

      <ConfirmDialog
        cancelLabel={t('battle.keepBattle')}
        confirmLabel={t('battle.discard')}
        message={t('battle.discardConfirmMessage')}
        title={t('battle.discardConfirmTitle')}
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
