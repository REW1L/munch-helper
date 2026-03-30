import { Character as RoomCharacter } from '@/api/characters';
import { AppTheme } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type QuickEditStats = {
  level: number;
  power: number;
};

interface QuickEditSheetProps {
  visible: boolean;
  character: RoomCharacter | null;
  onClose: () => void;
  onStatsChange: (stats: QuickEditStats) => void;
  onSave: () => Promise<void>;
  onOpenFullEdit: () => void;
  hasErrorFlash: boolean;
}

function clampToFloorZero(value: number): number {
  return Math.max(0, value);
}

export default function QuickEditSheet({
  visible,
  character,
  onClose,
  onStatsChange,
  onSave,
  onOpenFullEdit,
  hasErrorFlash,
}: QuickEditSheetProps) {
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!visible) {
      setIsSaving(false);
    }
  }, [visible]);

  const stats = useMemo(
    () => ({
      level: character?.level ?? 0,
      power: character?.power ?? 0,
    }),
    [character?.level, character?.power]
  );

  const applyStep = useCallback(
    (field: keyof QuickEditStats, delta: number) => {
      if (!character) {
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);

      const nextStats: QuickEditStats = {
        level: stats.level,
        power: stats.power,
      };
      nextStats[field] = clampToFloorZero(nextStats[field] + delta);
      onStatsChange(nextStats);
    },
    [character, onStatsChange, stats.level, stats.power]
  );

  const handleSave = useCallback(async () => {
    if (!character || isSaving) {
      return;
    }

    setIsSaving(true);
    await onSave();
  }, [character, isSaving, onSave]);

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.root}>
        <Pressable testID="quick-edit-overlay" style={styles.overlay} onPress={onClose} />

        <View testID="quick-edit-sheet" style={[styles.sheet, hasErrorFlash && styles.sheetErrorFlash]}>
          <Text style={styles.title}>Quick Edit</Text>

          <View style={styles.stepperRow}>
            <Text style={styles.label}>Level</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperButton} onPress={() => applyStep('level', -1)}>
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.value}>{stats.level}</Text>
              <TouchableOpacity style={styles.stepperButton} onPress={() => applyStep('level', 1)}>
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.label}>Power</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperButton} onPress={() => applyStep('power', -1)}>
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.value}>{stats.power}</Text>
              <TouchableOpacity style={styles.stepperButton} onPress={() => applyStep('power', 1)}>
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={onOpenFullEdit} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Edit more…</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.primaryAction} disabled={isSaving}>
              <Text style={styles.primaryActionText}>{isSaving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  sheet: {
    height: '60%',
    borderTopLeftRadius: AppTheme.radius.lg,
    borderTopRightRadius: AppTheme.radius.lg,
    backgroundColor: AppTheme.colors.elevated,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingTop: AppTheme.spacing.lg,
    paddingBottom: AppTheme.spacing.xl,
    gap: AppTheme.spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  sheetErrorFlash: {
    borderColor: AppTheme.colors.danger,
  },
  title: {
    color: AppTheme.colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  stepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: AppTheme.spacing.md,
  },
  stepperButton: {
    width: 44,
    height: 44,
    borderRadius: AppTheme.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surfaceSubtle,
  },
  stepperButtonText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 24,
  },
  value: {
    width: 48,
    textAlign: 'center',
    color: AppTheme.colors.accent,
    fontSize: 26,
    fontWeight: '700',
  },
  actions: {
    marginTop: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: AppTheme.spacing.md,
  },
  secondaryAction: {
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.sm,
  },
  secondaryActionText: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  primaryAction: {
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.sm,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.actionSecondary,
  },
  primaryActionText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
});
