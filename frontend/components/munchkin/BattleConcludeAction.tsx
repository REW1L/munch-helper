import { BattleResult } from '@/api/battles';
import { AppTheme } from '@/constants/theme';
import { useLocalization } from '@/i18n';
import React, { memo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export interface BattleConcludeActionProps {
  selectedResult: BattleResult | null;
  onSelectResult: (result: BattleResult) => void;
  onConclude: () => void;
  disabled: boolean;
  isConcluding: boolean;
  dirtyHint: boolean;
}

function BattleConcludeAction({
  selectedResult,
  onSelectResult,
  onConclude,
  disabled,
  isConcluding,
  dirtyHint,
}: BattleConcludeActionProps) {
  const { t } = useLocalization();

  return (
    <View style={styles.root} testID="battle-conclude-action">
      <View accessibilityRole="radiogroup" style={styles.resultRow}>
        <TouchableOpacity
          accessibilityLabel={t('battle.playersWin')}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedResult === 'players_win' }}
          style={[
            styles.resultOption,
            selectedResult === 'players_win' ? styles.playersSelected : styles.resultOptionUnselected
          ]}
          testID="battle-conclude-result-players"
          onPress={() => onSelectResult('players_win')}
        >
          <Text style={[styles.resultText, selectedResult === 'players_win' ? styles.resultTextSelected : styles.resultTextUnselected]}>
            {t('battle.playersWin')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          accessibilityLabel={t('battle.monstersWin')}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedResult === 'monster_wins' }}
          style={[
            styles.resultOption,
            selectedResult === 'monster_wins' ? styles.monsterSelected : styles.resultOptionUnselected
          ]}
          testID="battle-conclude-result-monster"
          onPress={() => onSelectResult('monster_wins')}
        >
          <Text style={[styles.resultText, selectedResult === 'monster_wins' ? styles.resultTextSelected : styles.resultTextUnselected]}>
            {t('battle.monstersWin')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        accessibilityLabel={t('battle.concludeAccessibility')}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        style={[styles.concludeButton, disabled && styles.concludeButtonDisabled]}
        testID="battle-conclude-button"
        onPress={onConclude}
      >
        <Text style={[styles.concludeButtonText, disabled && styles.concludeButtonTextDisabled]}>
          {isConcluding ? t('battle.concluding') : t('battle.conclude')}
        </Text>
      </TouchableOpacity>

      {dirtyHint && (
        <Text style={styles.hintText} testID="battle-conclude-dirty-hint">
          {t('battle.concludeDirtyHint')}
        </Text>
      )}
    </View>
  );
}

export default memo(BattleConcludeAction);

const styles = StyleSheet.create({
  root: {
    gap: AppTheme.spacing.sm,
  },
  resultRow: {
    flexDirection: 'row',
    gap: AppTheme.spacing.sm,
  },
  resultOption: {
    alignItems: 'center',
    borderRadius: AppTheme.radius.md,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.sm,
  },
  resultOptionUnselected: {
    backgroundColor: AppTheme.colors.surface,
  },
  playersSelected: {
    backgroundColor: AppTheme.colors.accent,
  },
  monsterSelected: {
    backgroundColor: AppTheme.colors.danger,
  },
  resultText: {
    ...AppTheme.typography.labelMd,
  },
  resultTextSelected: {
    color: AppTheme.colors.textPrimary,
  },
  resultTextUnselected: {
    color: AppTheme.colors.textMuted,
  },
  concludeButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.actionSecondary,
    borderRadius: AppTheme.radius.md,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.md,
  },
  concludeButtonDisabled: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
  },
  concludeButtonText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
  concludeButtonTextDisabled: {
    color: AppTheme.colors.textMuted,
  },
  hintText: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.caption,
    textAlign: 'center',
  },
});
