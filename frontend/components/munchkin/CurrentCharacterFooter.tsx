import { Character as RoomCharacter } from '@/api/characters';
import VioletButton from '@/components/VioletButton';
import avatars from '@/constants/avatars';
import { AppTheme } from '@/constants/theme';
import React, { memo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import AttributeList from './AttributeList';

interface CurrentCharacterFooterProps {
  character: RoomCharacter;
  onChangePress: (character: RoomCharacter) => void;
}

const CurrentCharacterFooter = memo(function CurrentCharacterFooter({
  character,
  onChangePress,
}: CurrentCharacterFooterProps) {
  return (
    <View style={styles.currentCharacterFooter}>
      <View style={[styles.avatarWrapper, { backgroundColor: character.color }]}>
        <Image source={avatars[character.avatar]} style={styles.footerAvatar} />
      </View>

      <View style={styles.footerInfo}>
        <Text style={styles.footerNickname}>{character.nickname}</Text>
        <View style={styles.footerStats}>
          <Text style={styles.footerStatText}>{character.level} lvl</Text>
          <Text style={styles.footerStatText}>{character.power} str</Text>
        </View>
      </View>

      <View style={styles.footerAttributes}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.attributesScrollContent}
        >
          <AttributeList character={character} variant="footer" />
        </ScrollView>
      </View>

      <VioletButton title="Change" onPress={() => onChangePress(character)} />
    </View>
  );
});

const styles = StyleSheet.create({
  currentCharacterFooter: {
    height: 85,
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: AppTheme.colors.elevated,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  avatarWrapper: {
    borderRadius: 20,
  },
  footerAvatar: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
  },
  footerInfo: {
    gap: 5,
  },
  footerNickname: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.colors.textAccentSoft,
    letterSpacing: 0.15,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  footerStats: {
    flexDirection: 'row',
    gap: 10,
  },
  footerStatText: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.colors.accent,
    letterSpacing: 0.15,
  },
  footerAttributes: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.6)',
    height: 64,
    justifyContent: 'center',
  },
  attributesScrollContent: {
    flexGrow: 1,
  },
});

export default CurrentCharacterFooter;
