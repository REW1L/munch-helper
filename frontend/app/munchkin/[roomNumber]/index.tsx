import { Character as RoomCharacter } from '@/api/characters';
import { ApiError } from '@/api/http';
import ButtonLabel from '@/components/ButtonLabel';
import { AppTheme } from '@/constants/theme';
import { userProfileContext } from '@/context/UserContext';
import { useBattleActions } from '@/hooks/useBattleActions';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { useReconnectOnForeground } from '@/hooks/useReconnectOnForeground';
import { useRoomBattle } from '@/hooks/useRoomBattle';
import { useRoomCodeClipboard } from '@/hooks/useRoomCodeClipboard';
import { formatDateTime } from '@/i18n/format';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Animated, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ActiveBattleBanner from '../../../components/munchkin/ActiveBattleBanner';
import CurrentCharacterFooter from '../../../components/munchkin/CurrentCharacterFooter';
import QuickEditSheet from '../../../components/munchkin/QuickEditSheet';
import ReconnectingBanner from '../../../components/munchkin/ReconnectingBanner';
import RoomCharactersList from '../../../components/munchkin/RoomCharactersList';
import { RoomHeaderTitle } from '../../../components/munchkin/RoomHeaderTitle';
import ChangeCharacterModal from '../modal-change-caracter';
import CreateCharacterModal from '../modal-create-character';

type CharacterStatsOverride = { level: number; power: number };

type UndoState = {
  characterId: string;
  previous: CharacterStatsOverride;
};

const readActiveBattleId = (details: unknown): string | null => {
  if (typeof details === 'object' && details !== null && 'activeBattleId' in details) {
    const value = (details as { activeBattleId?: unknown }).activeBattleId;
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }

  return null;
};

const MunchkinIndexView: React.FC = () => {
  const { t } = useTranslation();
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const router = useRouter();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const roomCode = roomId ?? '';
  const { userProfile } = useContext(userProfileContext);
  const {
    characters,
    create,
    update,
    remove,
    realtimeUpdateSignals,
    isLoading,
    errorMessage,
    isCreateBlocked,
    isConnected,
    isReconnecting,
    isTimedOut,
    refresh,
    reconnect,
  } = useRoomCharacters(roomId, userProfile);
  const {
    battle,
    isLoading: isBattleLoading,
    errorMessage: battleErrorMessage,
    refresh: refreshBattle,
  } = useRoomBattle(roomId, userProfile);
  const battleActions = useBattleActions(roomId);
  const { buttonLabel, accessibilityLabel, copyRoomCode } = useRoomCodeClipboard(roomCode);

  const [createCharacterModalVisible, setCreateCharacterModalVisible] = useState(false);
  const [changeCharacterModalVisible, setChangeCharacterModalVisible] = useState(false);
  const [quickEditVisible, setQuickEditVisible] = useState(false);
  const [pendingFullEditOpen, setPendingFullEditOpen] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [selectedCharacterSnapshot, setSelectedCharacterSnapshot] = useState<RoomCharacter | null>(null);
  const [pendingDeleteCharacterId, setPendingDeleteCharacterId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [dangerFlash, setDangerFlash] = useState(false);
  const undoToastTranslateY = useMemo(() => new Animated.Value(24), []);
  const selectedCharacterIdRef = useRef<string | null>(null);

  const setSelectedCharacterIdAndRef = useCallback((id: string | null) => {
    selectedCharacterIdRef.current = id;
    setSelectedCharacterId(id);
  }, []);

  useEffect(() => {
    if (!showUndoToast) {
      undoToastTranslateY.setValue(24);
      return;
    }

    Animated.spring(undoToastTranslateY, {
      toValue: 0,
      useNativeDriver: true,
      damping: 14,
      stiffness: 180,
      mass: 0.9,
    }).start();

    const timer = setTimeout(() => {
      setShowUndoToast(false);
      setUndoState(null);
    }, 1500);

    return () => clearTimeout(timer);
  }, [showUndoToast, undoToastTranslateY]);

  useEffect(() => {
    if (!dangerFlash) {
      return;
    }

    const timer = setTimeout(() => {
      setDangerFlash(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [dangerFlash]);

  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === selectedCharacterId),
    [characters, selectedCharacterId]
  );

  const currentCharacter = useMemo(
    () => characters.find((character) => character.userId === userProfile.id),
    [characters, userProfile.id]
  );
  const modalCharacter = selectedCharacter ?? selectedCharacterSnapshot;

  const handleChangePress = useCallback(
    (character: RoomCharacter) => {
      setSelectedCharacterIdAndRef(character.id);
      setSelectedCharacterSnapshot(character);
      setDeleteError(null);

      if (character.userId === userProfile.id) {
        setShowUndoToast(false);
        setUndoState(null);
        setQuickEditVisible(true);
        return;
      }

      setChangeCharacterModalVisible(true);
    },
    [userProfile.id, setSelectedCharacterIdAndRef]
  );

  const closeQuickEditSheet = useCallback(() => {
    setQuickEditVisible(false);
  }, []);

  useEffect(() => {
    if (!pendingFullEditOpen || quickEditVisible) {
      return;
    }

    setPendingFullEditOpen(false);
    setSelectedCharacterSnapshot(selectedCharacter ?? null);
    setChangeCharacterModalVisible(true);
  }, [pendingFullEditOpen, quickEditVisible, selectedCharacter]);

  useEffect(() => {
    if (!changeCharacterModalVisible || !selectedCharacterId || selectedCharacter) {
      return;
    }

    if (!selectedCharacterSnapshot || selectedCharacterSnapshot.id !== selectedCharacterId) {
      return;
    }

    if (pendingDeleteCharacterId === selectedCharacterId) {
      return;
    }

    setDeleteError(null);
    setChangeCharacterModalVisible(false);
    setSelectedCharacterSnapshot(null);
    setSelectedCharacterIdAndRef(null);
  }, [
    changeCharacterModalVisible,
    pendingDeleteCharacterId,
    selectedCharacter,
    selectedCharacterId,
    selectedCharacterSnapshot,
    setSelectedCharacterIdAndRef,
  ]);

  const handleQuickEditSave = useCallback(async (stats: CharacterStatsOverride) => {
    if (!selectedCharacter || !selectedCharacterId) {
      return;
    }

    try {
      setActionError(null);
      await update(selectedCharacter.id, {
        level: stats.level,
        power: stats.power,
      });
      setQuickEditVisible(false);
      setUndoState({
        characterId: selectedCharacter.id,
        previous: { level: selectedCharacter.level, power: selectedCharacter.power },
      });
      setShowUndoToast(true);
    } catch (error) {
      setDangerFlash(true);
      setActionError(error instanceof Error ? error.message : t('room.errorUpdateStats'));
      setShowUndoToast(false);
      setUndoState(null);
    }
  }, [selectedCharacter, selectedCharacterId, t, update]);

  const handleQuickEditUndo = useCallback(() => {
    if (!undoState) {
      return;
    }
    setShowUndoToast(false);
    setUndoState(null);

    void update(undoState.characterId, {
      level: undoState.previous.level,
      power: undoState.previous.power,
    }).catch((error) => {
      setActionError(error instanceof Error ? error.message : t('room.errorUndoStats'));
    });
  }, [t, undoState, update]);

  const handleOpenFullEdit = useCallback(() => {
    setDeleteError(null);
    setSelectedCharacterSnapshot(selectedCharacter ?? null);
    setPendingFullEditOpen(true);
    setQuickEditVisible(false);
  }, [selectedCharacter]);

  const handleCopyRoomCodePress = useCallback(() => {
    void copyRoomCode().catch((error) => {
      console.error('Failed to copy room code:', error);
    });
  }, [copyRoomCode]);

  const handleReconnect = useCallback(async () => {
    await reconnect();
    await refresh();
    await refreshBattle();
  }, [reconnect, refresh, refreshBattle]);

  const navigateToBattle = useCallback(() => {
    if (!roomId) {
      return;
    }

    router.push({
      pathname: '/munchkin/[roomNumber]/(battle)',
      params: { roomNumber: roomId },
    });
  }, [roomId, router]);

  const navigateToLog = useCallback(() => {
    if (!roomId) {
      return;
    }

    router.push({
      pathname: '/munchkin/[roomNumber]/log',
      params: { roomNumber: roomId },
    });
  }, [roomId, router]);

  const handleViewBattle = useCallback(() => {
    navigateToBattle();
  }, [navigateToBattle]);

  const createDefaultBattleName = useCallback(() => {
    const timestamp = formatDateTime(new Date(), {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    return t('room.defaultBattleName', { time: timestamp });
  }, [t]);

  const handleBattlePress = useCallback(async () => {
    if (!roomId) {
      return;
    }

    if (battle) {
      navigateToBattle();
      return;
    }

    try {
      setActionError(null);
      await battleActions.start({ roomId, name: createDefaultBattleName() });
      navigateToBattle();
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        const activeBattleId = readActiveBattleId(error.details);

        if (activeBattleId) {
          // Resolved decision #2: route straight to the existing battle from the
          // 409 payload — no second round-trip.
          navigateToBattle();
          return;
        }

        // 409 without an activeBattleId: the conflicting battle is already gone.
        // Re-sync the room instead of navigating to a battle that does not
        // exist, and let the next press start a fresh one.
        await refreshBattle();
        setActionError(t('room.errorStartBattleRetry'));
        return;
      }

      setActionError(error instanceof Error ? error.message : t('room.errorStartBattle'));
    }
  }, [battle, battleActions, createDefaultBattleName, navigateToBattle, refreshBattle, roomId, t]);

  useReconnectOnForeground(Boolean(roomId && userProfile.id && !isConnected), handleReconnect);

  return (
    <SafeAreaProvider key={`room-${roomNumber}`}>
      <SafeAreaView style={styles.safeArea} edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}>
        <View style={styles.container}>
          <Stack.Screen
            options={{
              headerTitle: () => (
                <RoomHeaderTitle
                  roomCode={roomCode}
                  buttonLabel={buttonLabel}
                  accessibilityLabel={accessibilityLabel}
                  onCopyPress={handleCopyRoomCodePress}
                />
              ),
            }}
          />

          <ReconnectingBanner visible={isReconnecting} />

          {isTimedOut && !isConnected && (
            <Pressable
              accessibilityLabel={t('room.connectionLostA11y')}
              accessibilityRole="button"
              onPress={() => {
                void handleReconnect();
              }}
              style={styles.connectionRetryButton}
            >
              <ButtonLabel style={styles.connectionRetryButtonText}>{t('room.connectionLostRetry')}</ButtonLabel>
            </Pressable>
          )}

          {battle !== null && (
            <ActiveBattleBanner battleName={battle.name} onViewBattle={handleViewBattle} />
          )}

          <RoomCharactersList
            characters={characters}
            isLoading={isLoading}
            errorMessage={errorMessage}
            actionError={actionError}
            realtimeUpdateSignals={realtimeUpdateSignals}
            isCreateBlocked={isCreateBlocked}
            onCreateCharacter={() => setCreateCharacterModalVisible(true)}
            onChangePress={handleChangePress}
          />

          <View style={styles.actionButtons}>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!roomId || isBattleLoading || battleActions.isLoading}
              onPress={() => {
                void handleBattlePress();
              }}
              style={[
                styles.battleButton,
                (!roomId || isBattleLoading || battleActions.isLoading) && styles.actionButtonDisabled,
              ]}
              accessible={false}
              accessibilityLabel="screenshot-open-battle"
              testID="screenshot-open-battle"
            >
              <ButtonLabel accessible accessibilityLabel="screenshot-open-battle" style={styles.battleButtonText}>{t('room.battle')}</ButtonLabel>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              disabled={!roomId}
              onPress={navigateToLog}
              style={[styles.logButton, !roomId && styles.actionButtonDisabled]}
              accessible={false}
              accessibilityLabel="screenshot-open-history"
              testID="screenshot-open-history"
            >
              <ButtonLabel accessible accessibilityLabel="screenshot-open-history" style={styles.logButtonText}>{t('room.log')}</ButtonLabel>
            </TouchableOpacity>
          </View>

          {battleErrorMessage && (
            <Text style={styles.inlineError}>{battleErrorMessage}</Text>
          )}

          {currentCharacter && (
            <CurrentCharacterFooter key={`own-char-${currentCharacter.id}`} character={currentCharacter} onChangePress={handleChangePress} />
          )}

          <CreateCharacterModal
            visible={createCharacterModalVisible}
            onConfirm={async (character) => {
              try {
                setActionError(null);
                await create({
                  userId: userProfile.id,
                  nickname: character.name,
                  avatar: character.avatar ?? userProfile.avatar,
                  color: character.color,
                  level: 1,
                  power: 0,
                  race: character.race,
                  gender: character.gender,
                  class: character.class,
                });
                setCreateCharacterModalVisible(false);
              } catch (error) {
                setActionError(error instanceof Error ? error.message : t('room.errorCreateCharacter'));
              }
            }}
            onCancel={() => setCreateCharacterModalVisible(false)}
          />

          {changeCharacterModalVisible && modalCharacter && (
            <ChangeCharacterModal
              character={modalCharacter}
              deleteError={deleteError}
              onConfirm={async (character) => {
                try {
                  setActionError(null);
                  setDeleteError(null);
                  await update(character.id, {
                    nickname: character.nickname,
                    avatar: character.avatar,
                    color: character.color,
                    level: character.level,
                    power: character.power,
                    race: character.race,
                    gender: character.gender,
                    class: character.class,
                  });
                  setChangeCharacterModalVisible(false);
                } catch (error) {
                  setActionError(error instanceof Error ? error.message : t('room.errorUpdateCharacter'));
                }
              }}
              onDelete={async (characterId) => {
                setPendingDeleteCharacterId(characterId);
                try {
                  setActionError(null);
                  setDeleteError(null);
                  await remove(characterId);
                  if (selectedCharacterIdRef.current !== characterId) {
                    return;
                  }

                  setChangeCharacterModalVisible(false);
                  setSelectedCharacterSnapshot(null);
                  setSelectedCharacterIdAndRef(null);
                } catch (error) {
                  if (selectedCharacterIdRef.current !== characterId) {
                    return;
                  }

                  setDeleteError(error instanceof Error ? error.message : t('room.errorDeleteCharacter'));
                } finally {
                  setPendingDeleteCharacterId((current) => (current === characterId ? null : current));
                }
              }}
              onCancel={() => {
                setDeleteError(null);
                setChangeCharacterModalVisible(false);
                setSelectedCharacterSnapshot(null);
              }}
            />
          )}

          <QuickEditSheet
            visible={quickEditVisible}
            character={selectedCharacter ?? null}
            onSave={handleQuickEditSave}
            onClose={closeQuickEditSheet}
            onOpenFullEdit={handleOpenFullEdit}
            hasErrorFlash={dangerFlash}
          />

          {showUndoToast && undoState && (
            <Animated.View style={[styles.undoToastWrapper, { transform: [{ translateY: undoToastTranslateY }] }]} pointerEvents="box-none">
              <Pressable style={styles.undoToast} onPress={handleQuickEditUndo}>
                <Text style={styles.undoToastText}>{t('room.undo')}</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  actionButtons: {
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.md,
    backgroundColor: AppTheme.colors.background,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  battleButton: {
    minWidth: 144,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.sm,
    backgroundColor: AppTheme.colors.danger,
    borderRadius: AppTheme.radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  battleButtonText: {
    fontSize: 32,
    fontWeight: '400',
    color: AppTheme.colors.textPrimary,
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  inlineError: {
    color: AppTheme.colors.textAccentSoft,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingBottom: AppTheme.spacing.sm,
    ...AppTheme.typography.labelMd,
  },
  logButton: {
    paddingHorizontal: 21,
    paddingVertical: 7,
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 32,
    fontWeight: '400',
    color: AppTheme.colors.textPrimary,
  },
  connectionRetryButton: {
    alignSelf: 'center',
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderRadius: AppTheme.radius.pill,
    marginHorizontal: AppTheme.spacing.md,
    marginTop: AppTheme.spacing.sm,
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.sm,
  },
  connectionRetryButtonText: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  undoToastWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 96,
    alignItems: 'center',
  },
  undoToast: {
    paddingHorizontal: AppTheme.spacing.lg,
    paddingVertical: AppTheme.spacing.sm,
    borderRadius: AppTheme.radius.pill,
    backgroundColor: AppTheme.colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: AppTheme.colors.accent,
  },
  undoToastText: {
    color: AppTheme.colors.textPrimary,
    ...AppTheme.typography.labelMd,
  },
});

export default MunchkinIndexView;
