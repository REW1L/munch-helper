import { Picker } from '@react-native-picker/picker';
import React from 'react';
import { Platform, StyleSheet } from 'react-native';

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
  if (Platform.OS === 'ios') {
    const { Host, Picker: SwiftUIPicker, Text: SwiftUIText } = require('@expo/ui/swift-ui');
    const {
      aspectRatio,
      font,
      foregroundStyle,
      pickerStyle,
      tag,
    } = require('@expo/ui/swift-ui/modifiers');

    return (
      <Host
        matchContents={{ vertical: true, horizontal: false }}
        style={styles.swiftUIHost}
      >
        <SwiftUIPicker
          modifiers={[pickerStyle('menu')]}
          selection={selectedValue}
          onSelectionChange={onValueChange}
        >
          <SwiftUIText
            modifiers={[
              tag('<Select>'),
              aspectRatio({ contentMode: 'fit', ratio: 1 }),
              foregroundStyle('#000000'),
              font({ size: 20 }),
            ]}
          >
            {'<Select>'}
          </SwiftUIText>
          {options.map((option) => (
            <SwiftUIText
              key={`${pickerKey}-${option}`}
              modifiers={[
                tag(option),
                aspectRatio({ contentMode: 'fit', ratio: 1 }),
                foregroundStyle('#000000'),
                font({ size: 20 }),
              ]}
            >
              {option}
            </SwiftUIText>
          ))}
        </SwiftUIPicker>
      </Host>
    );
  }

  return (
    <Picker selectedValue={selectedValue} onValueChange={onValueChange}>
      <Picker.Item label="<Select>" value="<Select>" />
      {options.map((option) => (
        <Picker.Item key={`${pickerKey}-${option}`} label={option} value={option} />
      ))}
    </Picker>
  );
}

const styles = StyleSheet.create({
  swiftUIHost: {
    width: '100%',
    maxHeight: 40,
    backgroundColor: '#DFDFDF',
  },
});
