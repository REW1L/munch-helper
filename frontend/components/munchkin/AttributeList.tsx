import { Character as RoomCharacter } from '@/api/characters';
import React, { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

const ATTRIBUTES: Array<'race' | 'gender' | 'class'> = ['race', 'gender', 'class'];

interface AttributeListProps {
  character: RoomCharacter;
  variant?: 'card' | 'footer';
}

const AttributeList = memo(function AttributeList({
  character,
  variant = 'card',
}: AttributeListProps) {
  const textStyle = variant === 'footer' ? styles.footerAttributeText : styles.attributeText;

  return (
    <View>
      {ATTRIBUTES.map((attribute) =>
        character[attribute].map((value) => (
          <Text key={`attribute-${character.id}-${attribute}-${value}`} style={textStyle}>
            {value}
          </Text>
        ))
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  attributeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  footerAttributeText: {
    fontSize: 11,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.5,
    lineHeight: 16,
  },
});

export default AttributeList;
