import { AppTheme } from '@/constants/theme';
import React, { useEffect } from 'react';
import { Alert, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel: string;
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
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (Platform.OS === 'web' || !visible) {
      return;
    }

    Alert.alert(
      title,
      message,
      [
        { text: 'Cancel', style: 'cancel', onPress: onCancel },
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
              <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm} testID="confirm-dialog-confirm">
                <Text style={styles.confirmText}>{confirmLabel}</Text>
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
