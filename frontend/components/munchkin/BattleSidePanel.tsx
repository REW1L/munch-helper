import { BonusItem, MonsterItem } from '@/api/battles';
import { Character as RoomCharacter } from '@/api/characters';
import ButtonLabel from '@/components/ButtonLabel';
import { AppTheme } from '@/constants/theme';
import type { ActivePlayerParticipant } from '@/utils/battlePlayerSide';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export interface BattleSidePanelProps {
  side: 'players' | 'monsters';
  title: string;
  total: number;
  toneColor: string;
  activeParticipants?: ActivePlayerParticipant[];
  characters?: RoomCharacter[];
  selectedCharacterIds?: string[];
  removedCharacterIds?: string[];
  monsters?: MonsterItem[];
  bonuses: BonusItem[];
  onAddCharacter?: (characterId: string) => void;
  onRemoveCharacter?: (characterId: string) => void;
  onAddMonster?: (name: string, level: number) => void;
  onRemoveMonster?: (monsterId: string) => void;
  onAddBonus: (value: number) => void;
  onRemoveBonus: (bonusId: string) => void;
}

const BONUS_VALUES = [-10, -5, -2, -1, 1, 2, 5, 10] as const;
const DEFAULT_MONSTER_NAME = 'Fungeater';
const DEFAULT_MONSTER_LEVEL = '25';

const monsterImage = require('../../assets/images/monster.png');

function BattleSidePanel({
  side,
  title,
  total,
  toneColor,
  activeParticipants,
  characters = [],
  selectedCharacterIds = [],
  removedCharacterIds = [],
  monsters = [],
  bonuses,
  onAddCharacter,
  onRemoveCharacter,
  onAddMonster,
  onRemoveMonster,
  onAddBonus,
  onRemoveBonus,
}: BattleSidePanelProps) {
  const { t } = useTranslation();
  const [selectedCharacterId, setSelectedCharacterId] = useState('');
  const [monsterName, setMonsterName] = useState(DEFAULT_MONSTER_NAME);
  const [monsterLevelText, setMonsterLevelText] = useState(DEFAULT_MONSTER_LEVEL);
  const [isMonsterModalVisible, setIsMonsterModalVisible] = useState(false);
  const selectedParticipants = activeParticipants ?? [];
  const availableCharacters = useMemo(
    () => characters.filter((character) => !selectedCharacterIds.includes(character.id)),
    [characters, selectedCharacterIds]
  );

  const handleAddCharacter = useCallback(() => {
    if (!selectedCharacterId || !onAddCharacter) {
      return;
    }
    onAddCharacter(selectedCharacterId);
    setSelectedCharacterId('');
  }, [onAddCharacter, selectedCharacterId]);

  const handleAddMonster = useCallback(() => {
    const trimmedName = monsterName.trim();
    const parsedLevel = Number.parseInt(monsterLevelText, 10);
    const monsterLevel = Number.isInteger(parsedLevel) ? Math.max(0, parsedLevel) : Number.NaN;
    if (!trimmedName || !onAddMonster) {
      return;
    }
    if (!Number.isInteger(monsterLevel)) {
      return;
    }
    onAddMonster(trimmedName, monsterLevel);
    setMonsterName(DEFAULT_MONSTER_NAME);
    setMonsterLevelText(DEFAULT_MONSTER_LEVEL);
    setIsMonsterModalVisible(false);
  }, [monsterName, monsterLevelText, onAddMonster]);

  const closeMonsterModal = useCallback(() => {
    setIsMonsterModalVisible(false);
    setMonsterName(DEFAULT_MONSTER_NAME);
    setMonsterLevelText(DEFAULT_MONSTER_LEVEL);
  }, []);

  return (
    <View style={[styles.panel, { borderColor: toneColor }]} testID={`battle-${side}-panel`}>
      <View style={styles.panelHeader}>
        <Text style={styles.title}>{title}</Text>
        <Text style={[styles.total, { color: toneColor }]} testID={`battle-${side}-total`}>
          {total}
        </Text>
      </View>

      {side === 'players' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Characters</Text>
          {selectedParticipants.map(({ id, character }) => (
            <View key={id} style={styles.row} testID="battle-participant-active">
              <Text style={styles.rowText}>{character.nickname} · Power {character.level + character.power}</Text>
              <TouchableOpacity
                accessibilityLabel={`Remove ${character.nickname}`}
                accessibilityRole="button"
                style={styles.removeButton}
                testID={`remove-character-${id}`}
                onPress={() => onRemoveCharacter?.(id)}
              >
                <Text style={styles.removeButtonText}>-</Text>
              </TouchableOpacity>
            </View>
          ))}
          {removedCharacterIds.map((id) => (
            <View key={id} style={styles.removedRow} testID="battle-participant-removed">
              <Text accessibilityLabel={`${id} - removed from room`} style={styles.removedText}>
                Removed character
              </Text>
              <TouchableOpacity
                accessibilityLabel={t('battle.dropRemovedCharacterA11y')}
                accessibilityRole="button"
                style={styles.removeButton}
                testID={`discard-removed-character-${id}`}
                onPress={() => onRemoveCharacter?.(id)}
              >
                <Text style={styles.removeButtonText}>-</Text>
              </TouchableOpacity>
            </View>
          ))}
          <View style={styles.addRow}>
            <View style={styles.selectWrap}>
              {availableCharacters.map((character) => (
                <TouchableOpacity
                  accessibilityLabel={`Select ${character.nickname}`}
                  accessibilityRole="button"
                  key={character.id}
                  style={[styles.choice, selectedCharacterId === character.id && styles.choiceSelected]}
                  testID={`select-character-${character.id}`}
                  onPress={() => setSelectedCharacterId(character.id)}
                >
                  <Text style={styles.choiceText}>{character.nickname}</Text>
                </TouchableOpacity>
              ))}
              {availableCharacters.length === 0 && <Text style={styles.mutedText}>No characters available</Text>}
            </View>
            <TouchableOpacity
              accessibilityLabel={t('battle.addCharacterA11y')}
              accessibilityRole="button"
              disabled={!selectedCharacterId}
              style={[styles.addButton, !selectedCharacterId && styles.disabledButton]}
              testID="add-character"
              onPress={handleAddCharacter}
            >
              <Text style={styles.addButtonText}>+</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {side === 'monsters' && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Monsters</Text>
          {monsters.map((monster, index) => (
            <View key={monster.id} style={styles.row}>
              <Text style={styles.rowText}>{monster.name} · Level {monster.level}{index === 0 ? ' · Main' : ''}</Text>
              <TouchableOpacity
                accessibilityLabel={`Remove ${monster.name}`}
                accessibilityRole="button"
                style={styles.removeButton}
                testID={`remove-monster-${monster.id}`}
                onPress={() => onRemoveMonster?.(monster.id)}
              >
                <Text style={styles.removeButtonText}>-</Text>
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            accessibilityLabel={t('battle.openAddMonsterA11y')}
            accessibilityRole="button"
            style={styles.openDialogButton}
            testID="open-add-monster"
            onPress={() => {
              setMonsterName(DEFAULT_MONSTER_NAME);
              setMonsterLevelText(DEFAULT_MONSTER_LEVEL);
              setIsMonsterModalVisible(true);
            }}
          >
            <ButtonLabel style={styles.openDialogButtonText}>Add monster</ButtonLabel>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bonuses</Text>
        {bonuses.map((bonus) => (
          <View key={bonus.id} style={styles.row}>
            <Text style={styles.rowText}>{bonus.value >= 0 ? `+${bonus.value}` : bonus.value}</Text>
            <TouchableOpacity
              accessibilityLabel={`Remove bonus ${bonus.value}`}
              accessibilityRole="button"
              style={styles.removeButton}
              testID={`remove-bonus-${side}-${bonus.id}`}
              onPress={() => onRemoveBonus(bonus.id)}
            >
              <Text style={styles.removeButtonText}>-</Text>
            </TouchableOpacity>
          </View>
        ))}
        <View style={styles.bonusGrid}>
          {BONUS_VALUES.map((value) => (
            <TouchableOpacity
              accessibilityLabel={`Add bonus ${value}`}
              accessibilityRole="button"
              key={value}
              style={styles.bonusButton}
              testID={`add-bonus-${side}-${value}`}
              onPress={() => onAddBonus(value)}
            >
              <Text style={styles.bonusButtonText}>{value > 0 ? `+${value}` : value}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {side === 'monsters' && (
        <Modal transparent visible={isMonsterModalVisible} animationType="fade" onRequestClose={closeMonsterModal}>
          <View style={styles.modalRoot}>
            <Pressable
              accessibilityLabel={t('battle.cancelAddMonsterA11y')}
              style={styles.modalBackdrop}
              testID="add-monster-backdrop"
              onPress={closeMonsterModal}
            />
            <View style={styles.monsterDialog} testID="add-monster-dialog">
              <View style={styles.monsterDialogForm}>
                <View style={styles.monsterDialogHeadline}>
                  <Text style={styles.monsterDialogHeadlineText}>Add monster</Text>
                </View>
                <Image accessibilityIgnoresInvertColors source={monsterImage} style={styles.monsterDialogImage} />
                <View style={styles.monsterDialogField}>
                  <Text style={styles.monsterDialogLabel}>Name:</Text>
                  <TextInput
                    accessibilityLabel={t('battle.monsterNameA11y')}
                    placeholder={DEFAULT_MONSTER_NAME}
                    placeholderTextColor={AppTheme.colors.surfaceWarm}
                    style={styles.monsterDialogInput}
                    testID="monster-name-input"
                    value={monsterName}
                    onChangeText={setMonsterName}
                  />
                </View>
                <View style={styles.monsterDialogField}>
                  <Text style={styles.monsterDialogLabel}>Level:</Text>
                  <TextInput
                    accessibilityLabel={t('battle.monsterLevelA11y')}
                    inputMode="numeric"
                    keyboardType="number-pad"
                    placeholder={DEFAULT_MONSTER_LEVEL}
                    placeholderTextColor={AppTheme.colors.surfaceWarm}
                    style={styles.monsterDialogInput}
                    testID="monster-level-input"
                    value={monsterLevelText}
                    onChangeText={setMonsterLevelText}
                  />
                </View>
              </View>
              <View style={styles.monsterDialogActions}>
                <TouchableOpacity
                  accessibilityLabel={t('battle.saveMonsterA11y')}
                  accessibilityRole="button"
                  disabled={!monsterName.trim()}
                  style={[styles.monsterDialogButton, !monsterName.trim() && styles.monsterDialogButtonDisabled]}
                  testID="save-monster"
                  onPress={handleAddMonster}
                >
                  <ButtonLabel style={styles.monsterDialogButtonText}>Save</ButtonLabel>
                </TouchableOpacity>
                <TouchableOpacity
                  accessibilityLabel={t('battle.cancelAddMonsterA11y')}
                  accessibilityRole="button"
                  style={styles.monsterDialogButton}
                  testID="cancel-add-monster"
                  onPress={closeMonsterModal}
                >
                  <ButtonLabel style={styles.monsterDialogButtonText}>Cancel</ButtonLabel>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.md,
    borderWidth: 1,
    gap: AppTheme.spacing.lg,
    padding: AppTheme.spacing.lg,
  },
  panelHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: AppTheme.spacing.md,
  },
  title: {
    color: AppTheme.colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  total: {
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 34,
  },
  section: {
    gap: AppTheme.spacing.sm,
  },
  sectionTitle: {
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.labelMd,
  },
  row: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.elevated,
    borderRadius: AppTheme.radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.sm,
    gap: AppTheme.spacing.md,
  },
  rowText: {
    color: AppTheme.colors.textPrimary,
    flex: 1,
    ...AppTheme.typography.labelMd,
  },
  mutedText: {
    color: AppTheme.colors.textMuted,
    flex: 1,
    ...AppTheme.typography.labelSm,
  },
  removedRow: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.sm,
    gap: AppTheme.spacing.md,
  },
  removedText: {
    color: AppTheme.colors.textMuted,
    flex: 1,
    textDecorationLine: 'line-through',
    ...AppTheme.typography.labelSm,
  },
  removeButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  removeButtonText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 24,
    lineHeight: 28,
  },
  addRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppTheme.spacing.sm,
  },
  selectWrap: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppTheme.spacing.sm,
  },
  choice: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.sm,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.sm,
  },
  choiceSelected: {
    backgroundColor: AppTheme.colors.actionSecondary,
  },
  choiceText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelSm,
  },
  addButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.sm,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  disabledButton: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
  },
  addButtonText: {
    color: AppTheme.colors.surfaceSubtle,
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  openDialogButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.danger,
    borderRadius: AppTheme.radius.sm,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.sm,
  },
  openDialogButtonText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
    fontWeight: '700',
  },
  bonusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: AppTheme.spacing.sm,
  },
  bonusButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderColor: AppTheme.colors.elevated,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 1,
    minHeight: 44,
    minWidth: 56,
    justifyContent: 'center',
    paddingHorizontal: AppTheme.spacing.md,
  },
  bonusButtonText: {
    color: AppTheme.colors.textAccentSoft,
    textAlign: 'center',
    ...AppTheme.typography.labelMd,
  },
  modalRoot: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    padding: AppTheme.spacing.xl,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: AppTheme.colors.surfaceSubtle,
    opacity: 0.75,
  },
  monsterDialog: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderColor: AppTheme.colors.elevated,
    borderRadius: AppTheme.radius.lg,
    borderWidth: 2,
    gap: AppTheme.spacing.md,
    maxWidth: 320,
    paddingHorizontal: AppTheme.spacing.sm,
    paddingVertical: AppTheme.spacing.md,
    width: '100%',
  },
  monsterDialogForm: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.background,
    borderRadius: AppTheme.radius.sm,
    gap: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.sm,
    paddingVertical: AppTheme.spacing.md,
  },
  monsterDialogHeadline: {
    alignItems: 'center',
    alignSelf: 'stretch',
    backgroundColor: AppTheme.colors.danger,
    borderRadius: AppTheme.radius.lg,
    justifyContent: 'center',
    minHeight: 39,
  },
  monsterDialogHeadlineText: {
    color: AppTheme.colors.textPrimary,
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 40,
    textAlign: 'center',
  },
  monsterDialogImage: {
    height: 75,
    width: 75,
    borderRadius: AppTheme.radius.md,
  },
  monsterDialogField: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: AppTheme.spacing.md,
    paddingHorizontal: AppTheme.spacing.xs,
  },
  monsterDialogLabel: {
    color: AppTheme.colors.textPrimary,
    minWidth: 58,
    ...AppTheme.typography.labelMd,
  },
  monsterDialogInput: {
    backgroundColor: AppTheme.colors.textMuted,
    borderColor: AppTheme.colors.elevated,
    borderRadius: AppTheme.radius.sm,
    borderWidth: 2,
    color: AppTheme.colors.surfaceSubtle,
    flex: 1,
    height: 34,
    maxWidth: 180,
    paddingHorizontal: AppTheme.spacing.sm,
    paddingVertical: AppTheme.spacing.xs,
    ...AppTheme.typography.labelMd,
  },
  monsterDialogActions: {
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
    justifyContent: 'center',
  },
  monsterDialogButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.parchmentSurface,
    borderRadius: AppTheme.radius.lg,
    flex: 1,
    justifyContent: 'center',
    minHeight: 60,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.md,
  },
  monsterDialogButtonDisabled: {
    opacity: 0.6,
  },
  monsterDialogButtonText: {
    color: AppTheme.colors.parchmentText,
    fontFamily: 'Roboto',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 28,
    textAlign: 'center',
    textShadowColor: AppTheme.colors.parchmentTextShadow,
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});

export default memo(BattleSidePanel);
