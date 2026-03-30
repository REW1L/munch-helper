import { Character as RoomCharacter } from '@/api/characters';
import VioletButton from '@/components/VioletButton';
import avatars from '@/constants/avatars';
import { AppTheme } from '@/constants/theme';
import React, { memo } from 'react';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AttributeList from './AttributeList';

interface RoomCharacterCardProps {
  character: RoomCharacter;
  onChangePress: (character: RoomCharacter) => void;
}

const RoomCharacterCard = memo(function RoomCharacterCard({
  character,
  onChangePress,
}: RoomCharacterCardProps) {
  const accessibilityLabel = `${character.nickname}, Level ${character.level}, Power ${character.power}`;

  return (
    <View style={styles.characterCard}>
      <Pressable
        style={({ pressed }) => [styles.cardBodyPressable, pressed && styles.cardBodyPressablePressed]}
        onPress={() => onChangePress(character)}
        accessible
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityHint="Tap to edit stats"
      >
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
      </Pressable>

      <View style={styles.attributesBox}>
        <ScrollView
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.attributesScrollContent}
        >
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
  cardBodyPressable: {
    flex: 1,
  },
  cardBodyPressablePressed: {
    opacity: 0.72,
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
    fontWeight: '700',
    color: AppTheme.colors.textAccentSoft,
    letterSpacing: 0.15,
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  characterStats: {
    fontSize: 16,
    fontWeight: '700',
    color: AppTheme.colors.accent,
    letterSpacing: 0.15,
  },
  attributesBox: {
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

export default RoomCharacterCard;
