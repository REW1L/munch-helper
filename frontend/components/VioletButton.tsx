import React from 'react';
import { StyleSheet, Text, TouchableOpacity } from 'react-native';
import { AppTheme } from '@/constants/theme';

type VioletButtonProps = {
  title: string;
  onPress: () => void;
};

const VioletButton: React.FC<VioletButtonProps> = ({ title, onPress }) => (
  <TouchableOpacity style={styles.violetButton} onPress={onPress}>
    <Text style={styles.violetButtonText}>{title}</Text>
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
  violetButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
});

export default VioletButton;
