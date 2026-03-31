import { Character as RoomCharacter } from '@/api/characters';
import { AppTheme } from '@/constants/theme';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Animated, Dimensions, Modal, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type QuickEditStats = {
  level: number;
  power: number;
};

interface QuickEditSheetProps {
  visible: boolean;
  character: RoomCharacter | null;
  onClose: () => void;
  onSave: (stats: QuickEditStats) => Promise<void>;
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
  onSave,
  onOpenFullEdit,
  hasErrorFlash,
}: QuickEditSheetProps) {
  const [isRendered, setIsRendered] = useState(visible);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const [draftStats, setDraftStats] = useState<QuickEditStats>({ level: 0, power: 0 });
  const translateY = useMemo(() => new Animated.Value(0), []);
  const backdropOpacity = useMemo(() => new Animated.Value(1), []);
  const dismissOffset = useMemo(() => Dimensions.get('window').height, []);
  const shouldSetDragResponder = useCallback(
    (dx: number, dy: number) => Math.abs(dy) > Math.abs(dx) && dy > 4,
    []
  );

  useEffect(() => {
    const nextStats = {
      level: character?.level ?? 0,
      power: character?.power ?? 0,
    };

    if (!visible) {
      setIsSaving(false);
      return;
    }

    setIsClosing(false);
    setDraftStats(nextStats);
  }, [character?.level, character?.power, visible]);

  const animateSheetTo = useCallback(
    (toValue: number, onFinished?: () => void) => {
      Animated.parallel([
        Animated.timing(translateY, {
          toValue,
          duration: 180,
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: toValue === 0 ? 1 : 0,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start(({ finished }) => {
        if (finished) {
          onFinished?.();
        }
      });
    },
    [backdropOpacity, translateY]
  );

  useEffect(() => {
    if (!visible) {
      if (!isRendered) {
        setIsSaving(false);
        return;
      }

      setIsClosing(true);
      animateSheetTo(dismissOffset, () => {
        setIsClosing(false);
        setIsSaving(false);
        setIsRendered(false);
      });
      return;
    }

    setIsRendered(true);
    setIsClosing(false);
    translateY.setValue(dismissOffset);
    backdropOpacity.setValue(0);
    animateSheetTo(0);
  }, [animateSheetTo, backdropOpacity, dismissOffset, isRendered, translateY, visible]);

  const dismissWithSlide = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleOpenFullEdit = useCallback(() => {
    setIsClosing(true);
    animateSheetTo(dismissOffset, () => {
      setIsClosing(false);
      setIsRendered(false);
      onOpenFullEdit();
    });
  }, [animateSheetTo, dismissOffset, onOpenFullEdit]);

  const applyStep = useCallback(
    (field: keyof QuickEditStats, delta: number) => {
      if (!character) {
        return;
      }

      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
      setDraftStats((current) => ({
        ...current,
        [field]: clampToFloorZero(current[field] + delta),
      }));
    },
    [character]
  );

  const handleSave = useCallback(async () => {
    if (!character || isSaving) {
      return;
    }

    setIsSaving(true);
    await onSave(draftStats);
  }, [character, draftStats, isSaving, onSave]);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onStartShouldSetPanResponderCapture: () => true,
        onMoveShouldSetPanResponder: (_event, gestureState) => shouldSetDragResponder(gestureState.dx, gestureState.dy),
        onMoveShouldSetPanResponderCapture: (_event, gestureState) => shouldSetDragResponder(gestureState.dx, gestureState.dy),
        onPanResponderMove: (_event, gestureState) => {
          const nextTranslateY = Math.max(0, gestureState.dy);
          translateY.setValue(nextTranslateY);
          backdropOpacity.setValue(Math.max(0, 1 - nextTranslateY / dismissOffset));
        },
        onPanResponderRelease: (_event, gestureState) => {
          if (gestureState.dy > 120 || gestureState.vy > 1) {
            dismissWithSlide();
            return;
          }

          animateSheetTo(0);
        },
        onPanResponderTerminate: () => {
          animateSheetTo(0);
        },
      }),
    [animateSheetTo, backdropOpacity, dismissOffset, dismissWithSlide, shouldSetDragResponder, translateY]
  );

  return (
    <Modal transparent visible={isRendered} animationType="none" onRequestClose={dismissWithSlide}>
      <View style={styles.root}>
        <Animated.View
          testID="quick-edit-overlay-backdrop"
          style={[styles.overlayBackdrop, { opacity: isClosing ? backdropOpacity : 1 }]}
        >
          <Pressable testID="quick-edit-overlay" style={styles.overlayPressable} onPress={dismissWithSlide} />
        </Animated.View>

        <Animated.View
          testID="quick-edit-sheet"
          style={[styles.sheet, hasErrorFlash && styles.sheetErrorFlash, { transform: [{ translateY }] }]}
        >
          <View testID="quick-edit-drag-area" style={styles.dragArea} {...panResponder.panHandlers}>
            <View style={styles.dragHandle} />
            <Text style={styles.title}>Quick Edit</Text>
          </View>

          <View style={styles.stepperRow}>
            <Text style={styles.label}>Level</Text>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepperButton} onPress={() => applyStep('level', -1)}>
                <Text style={styles.stepperButtonText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.value}>{draftStats.level}</Text>
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
              <Text style={styles.value}>{draftStats.power}</Text>
              <TouchableOpacity style={styles.stepperButton} onPress={() => applyStep('power', 1)}>
                <Text style={styles.stepperButtonText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity onPress={handleOpenFullEdit} style={styles.secondaryAction}>
              <Text style={styles.secondaryActionText}>Edit more…</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} style={styles.primaryAction} disabled={isSaving}>
              <Text style={styles.primaryActionText}>{isSaving ? 'Saving…' : 'Save'}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  overlayBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayPressable: {
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
    overflow: 'hidden',
  },
  dragArea: {
    gap: AppTheme.spacing.md,
    paddingBottom: AppTheme.spacing.xs,
  },
  dragHandle: {
    alignSelf: 'center',
    width: 52,
    height: 5,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.textMuted,
    opacity: 0.5,
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
    marginTop: AppTheme.spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppTheme.spacing.md,
  },
  secondaryAction: {
    width: '100%',
    maxWidth: 280,
    minHeight: 52,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.md,
    borderRadius: AppTheme.radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: AppTheme.colors.surfaceSubtle,
  },
  secondaryActionText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
  primaryAction: {
    width: '100%',
    maxWidth: 280,
    minHeight: 56,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.md,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.actionSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
});
