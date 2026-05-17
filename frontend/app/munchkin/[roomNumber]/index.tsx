import { Character as RoomCharacter } from '@/api/characters';
import { AppTheme } from '@/constants/theme';
import { userProfileContext } from '@/context/UserContext';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { useReconnectOnForeground } from '@/hooks/useReconnectOnForeground';
import { useRoomCodeClipboard } from '@/hooks/useRoomCodeClipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CurrentCharacterFooter from '../../../components/munchkin/CurrentCharacterFooter';
import QuickEditSheet from '../../../components/munchkin/QuickEditSheet';
import ReconnectingBanner from '../../../components/munchkin/ReconnectingBanner';
import RoomCharactersList from '../../../components/munchkin/RoomCharactersList';
import ChangeCharacterModal from '../modal-change-caracter';
import CreateCharacterModal from '../modal-create-character';

type CharacterStatsOverride = { level: number; power: number };

type UndoState = {
  characterId: string;
  previous: CharacterStatsOverride;
};

const MunchkinIndexView: React.FC = () => {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
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
      setActionError(error instanceof Error ? error.message : 'Failed to update character stats');
      setShowUndoToast(false);
      setUndoState(null);
    }
  }, [selectedCharacter, selectedCharacterId, update]);

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
      setActionError(error instanceof Error ? error.message : 'Failed to undo character stats');
    });
  }, [undoState, update]);

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
  }, [reconnect, refresh]);

  useReconnectOnForeground(Boolean(roomId && userProfile.id && !isConnected), handleReconnect);

  return (
    <SafeAreaProvider key={`room-${roomNumber}`}>
      <SafeAreaView style={styles.safeArea} edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}>
        <View style={styles.container}>
          <Stack.Screen
            options={{
              headerTitle: () => (
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerRoomLabel}>Room</Text>
                  <Text style={styles.headerRoomCode} numberOfLines={1} ellipsizeMode="middle">
                    {roomCode}
                  </Text>
                  <TouchableOpacity
                    accessibilityLabel={accessibilityLabel}
                    accessibilityRole="button"
                    onPress={handleCopyRoomCodePress}
                    style={styles.headerCopyButton}
                    disabled={roomCode.length === 0}
                  >
                    <Text style={styles.headerCopyButtonLabel}>{buttonLabel}</Text>
                  </TouchableOpacity>
                </View>
              ),
            }}
          />

          <ReconnectingBanner visible={isReconnecting} />

          {isTimedOut && !isConnected && (
            <Pressable
              accessibilityLabel="Connection lost. Tap to retry"
              accessibilityRole="button"
              onPress={() => {
                void handleReconnect();
              }}
              style={styles.connectionRetryButton}
            >
              <Text style={styles.connectionRetryButtonText}>Connection lost · Retry</Text>
            </Pressable>
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
            <TouchableOpacity style={[styles.battleButton, { opacity: 0 }]}>
              <Text style={styles.battleButtonText}>Battle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logButton, { opacity: 0 }]}>
              <Text style={styles.logButtonText}>Log</Text>
            </TouchableOpacity>
          </View>

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
                setActionError(error instanceof Error ? error.message : 'Failed to create character');
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
                  setActionError(error instanceof Error ? error.message : 'Failed to update character');
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

                  setDeleteError(error instanceof Error ? error.message : 'Failed to delete character');
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
                <Text style={styles.undoToastText}>Undo</Text>
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
    backgroundColor: AppTheme.colors.elevated,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    columnGap: AppTheme.spacing.sm,
    flexShrink: 1,
    minWidth: 0,
    maxWidth: '100%',
  },
  headerRoomCode: {
    color: AppTheme.colors.accent,
    fontSize: 18,
    fontWeight: '600',
    flexShrink: 1,
    minWidth: 0,
  },
  headerRoomLabel: {
    color: AppTheme.colors.textMuted,
    ...AppTheme.typography.labelMd,
  },
  headerCopyButton: {
    backgroundColor: AppTheme.colors.elevated,
    borderColor: AppTheme.colors.accent,
    borderRadius: AppTheme.radius.pill,
    borderWidth: 1,
    paddingHorizontal: AppTheme.spacing.md,
    paddingVertical: AppTheme.spacing.xs,
  },
  headerCopyButtonLabel: {
    color: AppTheme.colors.textPrimary,
    fontSize: 14,
    fontWeight: '500',
  },
  actionButtons: {
    height: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: AppTheme.colors.background,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  battleButton: {
    paddingHorizontal: 50,
    paddingVertical: 7,
    backgroundColor: AppTheme.colors.danger,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  battleButtonText: {
    fontSize: 32,
    fontWeight: '400',
    color: AppTheme.colors.textPrimary,
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
