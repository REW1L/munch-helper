import { Character as RoomCharacter } from '@/api/characters';
import VioletButton from '@/components/VioletButton';
import avatars from '@/constants/avatars';
import { AppTheme } from '@/constants/theme';
import React, { memo } from 'react';
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native';

import AttributeList from './AttributeList';

interface RoomCharacterCardProps {
  character: RoomCharacter;
  onChangePress: (character: RoomCharacter) => void;
}

const RoomCharacterCard = memo(function RoomCharacterCard({
  character,
  onChangePress,
}: RoomCharacterCardProps) {
  return (
    <View style={styles.characterCard}>
      <View style={styles.characterContent}>
        <View style={[styles.avatarWrapper, { backgroundColor: character.color }]}>
          <Image source={avatars[character.avatar]} style={styles.characterAvatar} />
        </View>

        <View style={styles.characterInfo}>
          <Text style={styles.characterNickname}>{character.nickname}</Text>
          <View style={styles.statsRow}>
            <Text style={styles.characterStats}>{character.level} lvl</Text>
            <Text style={styles.characterStats}>{character.power} str</Text>
          </View>
        </View>
      </View>

      <View style={styles.attributesBox}>
        <ScrollView>
          <AttributeList character={character} />
        </ScrollView>
      </View>

      <VioletButton title="Change" onPress={() => onChangePress(character)} />
    </View>
  );
});

const styles = StyleSheet.create({
  characterCard: {
    height: 85,
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: AppTheme.colors.surfaceWarm,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  characterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  avatarWrapper: {
    borderRadius: 20,
  },
  characterAvatar: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
  },
  characterInfo: {
    flex: 1,
    gap: 5,
  },
  characterNickname: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  characterStats: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FFFFFF',
    letterSpacing: 0.15,
  },
  attributesBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: 'rgba(0, 0, 0, 0.30)',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
    height: 64,
    justifyContent: 'center',
  },
});

export default RoomCharacterCard;
