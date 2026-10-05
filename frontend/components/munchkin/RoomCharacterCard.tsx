import { Character as RoomCharacter } from '@/api/characters';
import VioletButton from '@/components/VioletButton';
import avatars from '@/constants/avatars';
import { AppTheme } from '@/constants/theme';
import React, { memo, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import AttributeList from './AttributeList';

interface RoomCharacterCardProps {
  character: RoomCharacter;
  onChangePress: (character: RoomCharacter) => void;
  realtimeFlashSignal?: number;
  isSecondEdition?: boolean;
  onGoldPiecesChange?: (character: RoomCharacter, delta: number) => void;
}

const REALTIME_FLASH_DURATION_MS = 700;
const REALTIME_FLASH_BORDER_WIDTH = 3;

const RoomCharacterCard = memo(function RoomCharacterCard({
  character,
  onChangePress,
  realtimeFlashSignal = 0,
  isSecondEdition = false,
  onGoldPiecesChange,
}: RoomCharacterCardProps) {
  const { t } = useTranslation();
  const [coinAdjustment, setCoinAdjustment] = useState('100');
  const accessibilityLabel = t('room.characterCardA11y', {
    name: character.nickname,
    level: character.level,
    power: character.power,
  });
  const animatedBorderProgress = useRef(new Animated.Value(0)).current;
  const reducedMotionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState<boolean | null>(null);
  const [reducedMotionBorderColor, setReducedMotionBorderColor] = useState(AppTheme.colors.surfaceWarm.toString());

  useEffect(() => {
    let isMounted = true;

    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (isMounted) {
        setIsReducedMotionEnabled(enabled);
      }
    });

    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', (enabled) => {
      setIsReducedMotionEnabled(enabled);
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (realtimeFlashSignal < 1 || isReducedMotionEnabled === null) {
      return;
    }

    if (reducedMotionTimeoutRef.current) {
      clearTimeout(reducedMotionTimeoutRef.current);
      reducedMotionTimeoutRef.current = null;
    }

    if (isReducedMotionEnabled) {
      setReducedMotionBorderColor(character.color);
      reducedMotionTimeoutRef.current = setTimeout(() => {
        setReducedMotionBorderColor(AppTheme.colors.surfaceWarm);
      }, REALTIME_FLASH_DURATION_MS);
      return;
    }

    animatedBorderProgress.stopAnimation();
    animatedBorderProgress.setValue(0);
    Animated.sequence([
      Animated.timing(animatedBorderProgress, {
        toValue: 1,
        duration: REALTIME_FLASH_DURATION_MS / 2,
        easing: Easing.sin,
        useNativeDriver: false,
      }),
      Animated.timing(animatedBorderProgress, {
        toValue: 0,
        duration: REALTIME_FLASH_DURATION_MS / 2,
        easing: Easing.sin,
        useNativeDriver: false,
      }),
    ]).start();
  }, [animatedBorderProgress, character.color, isReducedMotionEnabled, realtimeFlashSignal]);

  useEffect(() => {
    return () => {
      if (reducedMotionTimeoutRef.current) {
        clearTimeout(reducedMotionTimeoutRef.current);
      }
    };
  }, []);

  const animatedBorderColor = useMemo(
    () =>
      animatedBorderProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [AppTheme.colors.surfaceWarm, character.color],
      }),
    [animatedBorderProgress, character.color]
  );

  const flashStyle = isReducedMotionEnabled
    ? { borderColor: reducedMotionBorderColor, borderWidth: REALTIME_FLASH_BORDER_WIDTH }
    : { borderColor: animatedBorderColor, borderWidth: REALTIME_FLASH_BORDER_WIDTH };

  return (
    <Animated.View style={[styles.characterCard, isSecondEdition && styles.secondEditionCard, flashStyle]} testID="character-card">
      <View style={isSecondEdition ? styles.secondEditionHeaderRow : styles.classicHeaderRow}>
        <Pressable
          style={({ pressed }) => [styles.cardBodyPressable, pressed && styles.cardBodyPressablePressed]}
          onPress={() => onChangePress(character)}
          accessible
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          accessibilityHint={t('room.tapToEditStats')}
        >
          <View style={styles.characterContent}>
            <View style={[styles.avatarWrapper, { backgroundColor: character.color }]}>
              <Image source={avatars[character.avatar]} style={styles.characterAvatar} />
            </View>

            <View style={styles.characterInfo}>
              <Text style={styles.characterNickname} numberOfLines={1} ellipsizeMode="tail" testID="character-nickname">{character.nickname}</Text>
              <View style={styles.statsRow}>
                <Text style={styles.characterStats}>{character.level} lvl</Text>
                <Text style={styles.characterStats}>{character.power} str</Text>
              </View>
            </View>
          </View>
        </Pressable>
        {isSecondEdition && <VioletButton title={t('common.change')} onPress={() => onChangePress(character)} testID="change-character-button" />}
      </View>

      {isSecondEdition ? (
        <View style={styles.secondEditionDetailsRow}>
          <View style={[styles.attributesBox, styles.secondEditionAttributesBox]}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.attributesScrollContent}>
              <AttributeList character={character} showGender={false} />
            </ScrollView>
          </View>
          <View style={styles.coinControls}>
            <Text accessibilityLabel={t('room.coinBalanceA11y', { amount: character.goldPieces ?? 500 })} style={styles.coinBalance} testID={`gold-pieces-${character.id}`}>{character.goldPieces ?? 500} GP</Text>
            <View style={styles.coinButtons}>
              <VioletButton title="−" onPress={() => {
                const adjustment = Number(coinAdjustment);
                if (Number.isInteger(adjustment) && adjustment > 0) onGoldPiecesChange?.(character, -adjustment);
              }} testID={`gold-pieces-minus-${character.id}`} />
              <TextInput accessibilityLabel={t('room.coinAdjustmentA11y')} keyboardType="number-pad" value={coinAdjustment} onChangeText={setCoinAdjustment} style={styles.coinInput} testID={`gold-pieces-adjustment-${character.id}`} />
              <VioletButton title="+" onPress={() => {
                const adjustment = Number(coinAdjustment);
                if (Number.isInteger(adjustment) && adjustment > 0) onGoldPiecesChange?.(character, adjustment);
              }} testID={`gold-pieces-plus-${character.id}`} />
            </View>
          </View>
        </View>
      ) : (
        <>
          <View style={styles.attributesBox}>
            <ScrollView nestedScrollEnabled showsVerticalScrollIndicator contentContainerStyle={styles.attributesScrollContent}>
              <AttributeList character={character} showGender />
            </ScrollView>
          </View>
          <VioletButton title={t('common.change')} onPress={() => onChangePress(character)} testID="change-character-button" />
        </>
      )}
    </Animated.View>
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
  secondEditionCard: { height: 142, flexDirection: 'column', justifyContent: 'space-between', gap: 4 },
  classicHeaderRow: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  secondEditionHeaderRow: { flexDirection: 'row', alignItems: 'center', height: 75, width: '100%', gap: 8 },
  secondEditionDetailsRow: { flexDirection: 'row', alignItems: 'center', flex: 1, width: '100%', gap: 8 },
  secondEditionAttributesBox: { width: 88, height: 44, paddingVertical: 2, paddingHorizontal: 6 },
  coinControls: { alignItems: 'center', gap: 3, flex: 1 },
  coinBalance: { color: AppTheme.colors.textPrimary, fontSize: 13, fontWeight: '700' },
  coinButtons: { flexDirection: 'row', gap: 3 },
  coinInput: { width: 40, height: 34, paddingHorizontal: 2, textAlign: 'center', color: AppTheme.colors.textPrimary, backgroundColor: AppTheme.colors.elevated, borderRadius: 5 },
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
    minWidth: 0,
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
