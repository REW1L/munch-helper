import ButtonLabel from '@/components/ButtonLabel';
import { AppTheme } from '@/constants/theme';
import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/**
 * Cross-platform confirmation dialog.
 * Native: delegates to Alert.alert (system sheet).
 * Web: renders an inline modal overlay (Alert.alert is a no-op on web).
 */
export default function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const resolvedCancelLabel = cancelLabel ?? t('common.cancel');
  useEffect(() => {
    if (Platform.OS === 'web' || !visible) {
      return;
    }

    Alert.alert(
      title,
      message,
      [
        { text: resolvedCancelLabel, style: 'cancel', onPress: onCancel },
        { text: confirmLabel, style: 'destructive', onPress: onConfirm },
      ],
      { cancelable: true, onDismiss: onCancel }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  if (Platform.OS !== 'web') {
    return null;
  }

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      {visible && (
        <Pressable style={styles.overlay} onPress={onCancel}>
          <Pressable style={styles.dialog} onPress={() => { }}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.message}>{message}</Text>
            <View style={styles.buttons}>
              <TouchableOpacity
                accessibilityLabel={resolvedCancelLabel}
                accessibilityRole="button"
                style={[styles.button, styles.cancelButton]}
                onPress={onCancel}
              >
                <ButtonLabel style={styles.cancelText}>{resolvedCancelLabel}</ButtonLabel>
              </TouchableOpacity>
              <TouchableOpacity
                accessibilityLabel={confirmLabel}
                accessibilityRole="button"
                style={[styles.button, styles.confirmButton]}
                onPress={onConfirm}
                testID="confirm-dialog-confirm"
              >
                <ButtonLabel style={styles.confirmText}>{confirmLabel}</ButtonLabel>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    backgroundColor: AppTheme.colors.elevated,
    borderRadius: AppTheme.radius.lg,
    padding: AppTheme.spacing.xl,
    width: 300,
    gap: AppTheme.spacing.md,
  },
  title: {
    color: AppTheme.colors.textPrimary,
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
  },
  message: {
    color: AppTheme.colors.textMuted,
    fontSize: 14,
    textAlign: 'center',
  },
  buttons: {
    flexDirection: 'row',
    gap: AppTheme.spacing.sm,
    marginTop: AppTheme.spacing.sm,
  },
  button: {
    flex: 1,
    paddingVertical: AppTheme.spacing.sm,
    borderRadius: AppTheme.radius.md,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
  },
  confirmButton: {
    backgroundColor: AppTheme.colors.danger,
  },
  cancelText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '500',
  },
  confirmText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
});
