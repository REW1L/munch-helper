import { Battle, MonsterSide, PlayerSide } from '@/api/battles';
import { ApiError } from '@/api/http';
import BattleSidePanel from '@/components/munchkin/BattleSidePanel';
import { AppTheme } from '@/constants/theme';
import { useBattleActions } from '@/hooks/useBattleActions';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { useRoomBattle } from '@/hooks/useRoomBattle';
import { useUserProfile } from '@/hooks/useUser';
import { createUuidV4 } from '@/utils/uuid';
import { useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

type BattleDraft = Pick<Battle, 'name' | 'playerSide' | 'monsterSide'>;

function cloneDraft(battle: Battle): BattleDraft {
  return {
    name: battle.name,
    playerSide: {
      characterIds: [...battle.playerSide.characterIds],
      bonuses: battle.playerSide.bonuses.map((bonus) => ({ ...bonus })),
    },
    monsterSide: {
      monsters: battle.monsterSide.monsters.map((monster) => ({ ...monster })),
      bonuses: battle.monsterSide.bonuses.map((bonus) => ({ ...bonus })),
    },
  };
}

function areDraftsEqual(left: BattleDraft | null, right: BattleDraft | null): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export default function BattleView() {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const { userProfile } = useUserProfile();
  const { battle, isLoading, errorMessage } = useRoomBattle(roomId);
  const { characters, isLoading: charactersLoading, errorMessage: charactersErrorMessage } = useRoomCharacters(roomId, userProfile);
  const battleActions = useBattleActions(roomId);
  const [draft, setDraft] = useState<BattleDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<BattleDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const initializedBattleIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!battle) {
      initializedBattleIdRef.current = null;
      setDraft(null);
      setSavedDraft(null);
      return;
    }

    // First load or switching to a different battle — reset draft to the
    // server-side state. This is the only path that may overwrite local edits.
    if (initializedBattleIdRef.current !== battle.id) {
      initializedBattleIdRef.current = battle.id;
      const nextDraft = cloneDraft(battle);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setSaveError(null);
      return;
    }

    // Same battle, refreshed object reference (background refetch / post-save
    // invalidation). Re-sync `savedDraft` to the latest server state so the
    // dirty comparison stays accurate, but preserve the user's draft so unsaved
    // edits survive the refetch.
    setSavedDraft((current) => {
      const next = cloneDraft(battle);
      return current && areDraftsEqual(current, next) ? current : next;
    });
  }, [battle]);

  const playerTotal = useMemo(() => {
    if (!draft) {
      return 0;
    }

    const characterLevelTotal = draft.playerSide.characterIds.reduce((total, id) => {
      const character = characters.find((item) => item.id === id);
      return total + (character?.level ?? 0);
    }, 0);
    const bonusTotal = draft.playerSide.bonuses.reduce((total, bonus) => total + bonus.value, 0);
    return characterLevelTotal + bonusTotal;
  }, [characters, draft]);

  const monsterTotal = useMemo(() => {
    if (!draft) {
      return 0;
    }

    const monsterLevelTotal = draft.monsterSide.monsters.reduce((total, monster) => total + monster.level, 0);
    const bonusTotal = draft.monsterSide.bonuses.reduce((total, bonus) => total + bonus.value, 0);
    return monsterLevelTotal + bonusTotal;
  }, [draft]);

  const comparisonLabel = playerTotal === monsterTotal ? 'Even' : playerTotal > monsterTotal ? 'Players ahead' : 'Monsters ahead';
  const comparisonBorderColor = playerTotal === monsterTotal
    ? AppTheme.colors.surfaceSubtle
    : playerTotal > monsterTotal
      ? AppTheme.colors.accent
      : AppTheme.colors.danger;
  const unavailableCharacterIds = useMemo(() => {
    if (!draft) {
      return [];
    }

    return draft.playerSide.characterIds.filter((id) => !characters.some((character) => character.id === id));
  }, [characters, draft]);
  const isDirty = !areDraftsEqual(draft, savedDraft);
  const isNameValid = !!draft && draft.name.trim().length > 0;
  const canSave = isDirty && isNameValid && !battleActions.isLoading;

  const updatePlayerSide = useCallback((updater: (side: PlayerSide) => PlayerSide) => {
    setDraft((current) => current ? { ...current, playerSide: updater(current.playerSide) } : current);
  }, []);

  const updateMonsterSide = useCallback((updater: (side: MonsterSide) => MonsterSide) => {
    setDraft((current) => current ? { ...current, monsterSide: updater(current.monsterSide) } : current);
  }, []);

  const handleSave = useCallback(async () => {
    if (!battle || !draft || !isDirty || !isNameValid || battleActions.isLoading) {
      return;
    }

    try {
      setSaveError(null);
      const updatedBattle = await battleActions.patch(battle.id, draft);
      const nextDraft = cloneDraft(updatedBattle);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setSaveError('Battle is not active');
        return;
      }
      setSaveError(error instanceof Error ? error.message : 'Failed to save battle');
    }
  }, [battle, battleActions, draft, isDirty, isNameValid]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.content}>
        {(isLoading || charactersLoading) && (
          <View style={styles.stateBlock}>
            <ActivityIndicator color={AppTheme.colors.accent} />
            <Text style={styles.stateText}>Loading battle</Text>
          </View>
        )}

        {!isLoading && (errorMessage || charactersErrorMessage) && (
          <View style={styles.stateBlock}>
            <Text style={styles.errorText}>{errorMessage || charactersErrorMessage}</Text>
          </View>
        )}

        {!isLoading && !charactersLoading && !errorMessage && !charactersErrorMessage && battle && draft && (
          <View style={styles.body}>
            <View style={styles.header}>
              <View style={styles.headerText}>
                <TextInput
                  accessibilityLabel="Battle name"
                  style={styles.titleInput}
                  testID="battle-name-input"
                  value={draft.name}
                  onChangeText={(name) => setDraft((current) => current ? { ...current, name } : current)}
                />
                <Text style={styles.status}>{battle.status}</Text>
              </View>
              <TouchableOpacity
                accessibilityLabel="Save battle"
                accessibilityRole="button"
                accessibilityState={{ disabled: !canSave }}
                disabled={!canSave}
                style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
                testID="save-battle"
                onPress={handleSave}
              >
                <Text style={[styles.saveButtonText, !canSave && styles.saveButtonTextDisabled]}>
                  {battleActions.isLoading ? 'Saving' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <View style={[styles.comparison, { borderColor: comparisonBorderColor }]} testID="battle-comparison-container">
              <Text style={styles.comparisonText} testID="battle-comparison-label">{comparisonLabel}</Text>
            </View>

            {(saveError || battleActions.errorMessage) && (
              <Text style={styles.errorText} testID="battle-save-error">{saveError || battleActions.errorMessage}</Text>
            )}

            <BattleSidePanel
              bonuses={draft.playerSide.bonuses}
              characters={characters}
              selectedCharacterIds={draft.playerSide.characterIds}
              side="players"
              title="Player Side"
              toneColor={AppTheme.colors.accent}
              total={playerTotal}
              unavailableCharacterIds={unavailableCharacterIds}
              onAddBonus={(value) => updatePlayerSide((side) => ({
                ...side,
                bonuses: [...side.bonuses, { id: createUuidV4(), value }],
              }))}
              onAddCharacter={(characterId) => updatePlayerSide((side) => ({
                ...side,
                characterIds: side.characterIds.includes(characterId) ? side.characterIds : [...side.characterIds, characterId],
              }))}
              onRemoveBonus={(bonusId) => updatePlayerSide((side) => ({
                ...side,
                bonuses: side.bonuses.filter((bonus) => bonus.id !== bonusId),
              }))}
              onRemoveCharacter={(characterId) => updatePlayerSide((side) => ({
                ...side,
                characterIds: side.characterIds.filter((id) => id !== characterId),
              }))}
            />

            <BattleSidePanel
              bonuses={draft.monsterSide.bonuses}
              monsters={draft.monsterSide.monsters}
              side="monsters"
              title="Monster Side"
              toneColor={AppTheme.colors.danger}
              total={monsterTotal}
              onAddBonus={(value) => updateMonsterSide((side) => ({
                ...side,
                bonuses: [...side.bonuses, { id: createUuidV4(), value }],
              }))}
              onAddMonster={(name, level) => updateMonsterSide((side) => ({
                ...side,
                monsters: [...side.monsters, { id: createUuidV4(), name, level }],
              }))}
              onRemoveBonus={(bonusId) => updateMonsterSide((side) => ({
                ...side,
                bonuses: side.bonuses.filter((bonus) => bonus.id !== bonusId),
              }))}
              onRemoveMonster={(monsterId) => updateMonsterSide((side) => ({
                ...side,
                monsters: side.monsters.filter((monster) => monster.id !== monsterId),
              }))}
            />
          </View>
        )}

        {!isLoading && !errorMessage && !battle && (
          <View style={styles.stateBlock}>
            <Text style={styles.stateText}>No active battle</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  content: {
    flexGrow: 1,
    padding: AppTheme.spacing.lg,
    gap: AppTheme.spacing.lg,
  },
  body: {
    gap: AppTheme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: AppTheme.spacing.md,
  },
  headerText: {
    flex: 1,
    gap: AppTheme.spacing.sm,
  },
  titleInput: {
    color: AppTheme.colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
    padding: 0,
  },
  status: {
    alignSelf: 'flex-start',
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.labelMd,
    textTransform: 'capitalize',
  },
  saveButton: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.sm,
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 86,
    paddingHorizontal: AppTheme.spacing.lg,
  },
  saveButtonDisabled: {
    backgroundColor: AppTheme.colors.surfaceSubtle,
  },
  saveButtonText: {
    color: AppTheme.colors.surfaceSubtle,
    ...AppTheme.typography.labelMd,
  },
  saveButtonTextDisabled: {
    color: AppTheme.colors.textMuted,
  },
  comparison: {
    alignItems: 'center',
    backgroundColor: AppTheme.colors.elevated,
    borderWidth: 1,
    borderRadius: AppTheme.radius.sm,
    padding: AppTheme.spacing.md,
  },
  comparisonText: {
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.labelMd,
  },
  stateBlock: {
    flex: 1,
    minHeight: 240,
    alignItems: 'center',
    justifyContent: 'center',
    gap: AppTheme.spacing.md,
  },
  stateText: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  errorText: {
    color: AppTheme.colors.textAccentSoft,
    ...AppTheme.typography.labelMd,
    textAlign: 'center',
  },
});
