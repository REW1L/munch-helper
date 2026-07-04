import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { AppTheme } from '@/constants/theme';
import ButtonLabel from '@/components/ButtonLabel';

type VioletButtonProps = {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  testID?: string;
};

const VioletButton: React.FC<VioletButtonProps> = ({ title, onPress, disabled = false, testID }) => (
  <TouchableOpacity style={[styles.violetButton, disabled && styles.violetButtonDisabled]} onPress={onPress} disabled={disabled} testID={testID}>
    <ButtonLabel style={styles.violetButtonText}>{title}</ButtonLabel>
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  violetButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: AppTheme.colors.actionSecondary,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  violetButtonDisabled: {
    opacity: 0.55,
  },
  violetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
});

export default VioletButton;
