import { Battle, BattleResult, MonsterSide, PlayerSide } from '@/api/battles';
import { ApiError } from '@/api/http';
import BattleConcludeAction from '@/components/munchkin/BattleConcludeAction';
import BattleDiscardAction from '@/components/munchkin/BattleDiscardAction';
import BattleSidePanel from '@/components/munchkin/BattleSidePanel';
import { AppTheme } from '@/constants/theme';
import { useBattleActions } from '@/hooks/useBattleActions';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { useRoomBattle } from '@/hooks/useRoomBattle';
import { useUserProfile } from '@/hooks/useUser';
import { computePlayerTotal, reconcilePlayerParticipants } from '@/utils/battlePlayerSide';
import { createUuidV4 } from '@/utils/uuid';
import { useLocalSearchParams, useRouter } from 'expo-router';
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
  const router = useRouter();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const { userProfile } = useUserProfile();
  const { battle, isLoading, errorMessage } = useRoomBattle(roomId, userProfile);
  const { characters, isLoading: charactersLoading, errorMessage: charactersErrorMessage } = useRoomCharacters(roomId, userProfile);
  const battleActions = useBattleActions(roomId);
  const [draft, setDraft] = useState<BattleDraft | null>(null);
  const [savedDraft, setSavedDraft] = useState<BattleDraft | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [concludeError, setConcludeError] = useState<string | null>(null);
  const [discardError, setDiscardError] = useState<string | null>(null);
  const [discardConfirmVisible, setDiscardConfirmVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<BattleResult | null>(null);
  const [isConcluding, setIsConcluding] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);
  const initializedBattleIdRef = useRef<string | null>(null);
  const hadBattleRef = useRef(false);
  const dismissedAfterNullRef = useRef(false);

  useEffect(() => {
    if (!battle) {
      if (hadBattleRef.current && !dismissedAfterNullRef.current && !isLoading && !errorMessage) {
        dismissedAfterNullRef.current = true;
        router.back();
      }
      initializedBattleIdRef.current = null;
      setDraft(null);
      setSavedDraft(null);
      return;
    }

    hadBattleRef.current = true;
    dismissedAfterNullRef.current = false;

    // First load or switching to a different battle — reset draft to the
    // server-side state. This is the only path that may overwrite local edits.
    if (initializedBattleIdRef.current !== battle.id) {
      initializedBattleIdRef.current = battle.id;
      const nextDraft = cloneDraft(battle);
      setDraft(nextDraft);
      setSavedDraft(nextDraft);
      setSaveError(null);
      setConcludeError(null);
      setDiscardError(null);
      setDiscardConfirmVisible(false);
      setSelectedResult(null);
      return;
    }

    // Same battle, refreshed object reference (background refetch / realtime
    // invalidation). If the user has no local edits, move the visible draft forward
    // with the server state; otherwise keep their unsaved draft and update only the
    // saved baseline so the dirty comparison stays accurate.
    const nextDraft = cloneDraft(battle);
    if (!draft || !savedDraft || areDraftsEqual(draft, savedDraft)) {
      setDraft((current) => current && areDraftsEqual(current, nextDraft) ? current : nextDraft);
    }
    setSavedDraft((current) => current && areDraftsEqual(current, nextDraft) ? current : nextDraft);
  }, [battle, draft, errorMessage, isLoading, router, savedDraft]);

  // Exclude optimistic (temp-) ids from the add picker so users can't add a
  // character that's about to get its id swapped — otherwise the just-added
  // participant would flip to a tombstone the moment the server confirms.
  const confirmedCharacters = useMemo(
    () => characters.filter((character) => !character.id.startsWith('temp-')),
    [characters],
  );

  const playerParticipants = useMemo(() => {
    if (!draft) {
      return { active: [], removed: [] };
    }

    return reconcilePlayerParticipants(draft.playerSide.characterIds, characters);
  }, [characters, draft]);

  const playerTotal = useMemo(() => {
    if (!draft) {
      return 0;
    }

    return computePlayerTotal(playerParticipants.active, draft.playerSide.bonuses);
  }, [draft, playerParticipants]);

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
  const isDirty = !areDraftsEqual(draft, savedDraft);
  const isNameValid = !!draft && draft.name.trim().length > 0;
  const canSave = isDirty && isNameValid && !battleActions.isSaving;
  const concludeDisabled = selectedResult === null || isDirty || isConcluding;

  const updatePlayerSide = useCallback((updater: (side: PlayerSide) => PlayerSide) => {
    setDraft((current) => current ? { ...current, playerSide: updater(current.playerSide) } : current);
  }, []);

  const updateMonsterSide = useCallback((updater: (side: MonsterSide) => MonsterSide) => {
    setDraft((current) => current ? { ...current, monsterSide: updater(current.monsterSide) } : current);
  }, []);

  const handleSave = useCallback(async () => {
    if (!battle || !draft || !isDirty || !isNameValid || battleActions.isSaving) {
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

  const handleSelectConcludeResult = useCallback((result: BattleResult) => {
    setSelectedResult(result);
    setConcludeError(null);
  }, []);

  const handleConclude = useCallback(async () => {
    if (!battle || !selectedResult || concludeDisabled) {
      return;
    }

    try {
      setConcludeError(null);
      setIsConcluding(true);
      await battleActions.conclude(battle.id, selectedResult);
      setSelectedResult(null);
      // Suppress the null-refetch auto-dismiss in useEffect — we dismiss directly
      // here so the modal closes immediately without waiting for the refetch.
      dismissedAfterNullRef.current = true;
      router.back();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setConcludeError('Battle is not active');
        return;
      }
      setConcludeError(error instanceof Error ? error.message : 'Failed to conclude battle');
    } finally {
      setIsConcluding(false);
    }
  }, [battle, battleActions, concludeDisabled, router, selectedResult]);

  const handleRequestDiscardConfirm = useCallback(() => {
    setDiscardError(null);
    setDiscardConfirmVisible(true);
  }, []);

  const handleCancelDiscardConfirm = useCallback(() => {
    setDiscardConfirmVisible(false);
  }, []);

  const handleConfirmDiscard = useCallback(async () => {
    if (!battle || isDiscarding) {
      return;
    }

    try {
      setDiscardError(null);
      setIsDiscarding(true);
      setDiscardConfirmVisible(false);
      await battleActions.discard(battle.id);
      // Guard against double `router.back()` when the WS-driven refetch (see useEffect
      // at lines 59-69) has already nulled `battle` and dismissed the modal before our
      // HTTP response resolved.
      if (!dismissedAfterNullRef.current) {
        dismissedAfterNullRef.current = true;
        router.back();
      }
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        setDiscardError('Battle is not active');
        return;
      }
      setDiscardError(error instanceof Error ? error.message : 'Failed to discard battle');
    } finally {
      setIsDiscarding(false);
    }
  }, [battle, battleActions, isDiscarding, router]);

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

            {saveError && (
              <Text style={styles.errorText} testID="battle-save-error">{saveError}</Text>
            )}

            <BattleSidePanel
              bonuses={draft.playerSide.bonuses}
              activeParticipants={playerParticipants.active}
              characters={confirmedCharacters}
              removedCharacterIds={playerParticipants.removed}
              selectedCharacterIds={draft.playerSide.characterIds}
              side="players"
              title="Player Side"
              toneColor={AppTheme.colors.accent}
              total={playerTotal}
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

            <BattleConcludeAction
              dirtyHint={isDirty}
              disabled={concludeDisabled}
              isConcluding={isConcluding}
              selectedResult={selectedResult}
              onConclude={handleConclude}
              onSelectResult={handleSelectConcludeResult}
            />

            {concludeError && (
              <Text style={styles.errorText} testID="battle-conclude-error">{concludeError}</Text>
            )}

            <BattleDiscardAction
              confirmVisible={discardConfirmVisible}
              isDiscarding={isDiscarding || battleActions.isDiscarding}
              onCancelConfirm={handleCancelDiscardConfirm}
              onConfirmDiscard={handleConfirmDiscard}
              onRequestConfirm={handleRequestDiscardConfirm}
            />

            {discardError && (
              <Text style={styles.errorText} testID="battle-discard-error">{discardError}</Text>
            )}
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
