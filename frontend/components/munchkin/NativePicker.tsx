import { Picker } from '@react-native-picker/picker';
import { useLocalization } from '@/i18n';
import React from 'react';

type NativePickerProps = {
  selectedValue: string;
  onValueChange: (value: string) => void;
  options: string[];
  pickerKey: string;
};

export default function NativePicker({
  selectedValue,
  onValueChange,
  options,
  pickerKey,
}: NativePickerProps) {
  const { t } = useLocalization();

  return (
    <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
      <Picker.Item label={t('common.select')} value="<Select>" />
      {options.map((option) => (
        <Picker.Item key={`${pickerKey}-${option}`} label={option} value={option} />
      ))}
    </Picker>
  );
}
