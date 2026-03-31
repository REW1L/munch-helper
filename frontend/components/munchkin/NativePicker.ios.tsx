import { Host, Picker as SwiftUIPicker, Text as SwiftUIText } from '@expo/ui/swift-ui';
import { aspectRatio, font, foregroundStyle, pickerStyle, tag } from '@expo/ui/swift-ui/modifiers';
import React from 'react';
import { StyleSheet } from 'react-native';

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
  return (
    <Host matchContents={{ vertical: true, horizontal: false }} style={styles.swiftUIHost}>
      <SwiftUIPicker modifiers={[pickerStyle('menu')]} selection={selectedValue} onSelectionChange={onValueChange}>
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

const styles = StyleSheet.create({
  swiftUIHost: {
    width: '100%',
    maxHeight: 40,
    backgroundColor: '#DFDFDF',
  },
});
