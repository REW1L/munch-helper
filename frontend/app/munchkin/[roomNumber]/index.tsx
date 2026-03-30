import { Character as RoomCharacter } from '@/api/characters';
import { AppTheme } from '@/constants/theme';
import { userProfileContext } from '@/context/UserContext';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { useRoomCodeClipboard } from '@/hooks/useRoomCodeClipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CurrentCharacterFooter from '../../../components/munchkin/CurrentCharacterFooter';
import QuickEditSheet from '../../../components/munchkin/QuickEditSheet';
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
  const { characters, create, update, isLoading, errorMessage } = useRoomCharacters(roomId, userProfile);
  const { buttonLabel, accessibilityLabel, copyRoomCode } = useRoomCodeClipboard(roomCode);

  const [createCharacterModalVisible, setCreateCharacterModalVisible] = useState(false);
  const [changeCharacterModalVisible, setChangeCharacterModalVisible] = useState(false);
  const [quickEditVisible, setQuickEditVisible] = useState(false);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [optimisticOverrides, setOptimisticOverrides] = useState<Record<string, CharacterStatsOverride>>({});
  const [quickEditSnapshot, setQuickEditSnapshot] = useState<{ characterId: string; stats: CharacterStatsOverride } | null>(null);
  const [undoState, setUndoState] = useState<UndoState | null>(null);
  const [showUndoToast, setShowUndoToast] = useState(false);
  const [dangerFlash, setDangerFlash] = useState(false);

  useEffect(() => {
    if (!showUndoToast) {
      return;
    }

    const timer = setTimeout(() => {
      setShowUndoToast(false);
      setUndoState(null);
    }, 1500);

    return () => clearTimeout(timer);
  }, [showUndoToast]);

  useEffect(() => {
    if (!dangerFlash) {
      return;
    }

    const timer = setTimeout(() => {
      setDangerFlash(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [dangerFlash]);

  const displayCharacters = useMemo(
    () =>
      characters.map((character) => {
        const override = optimisticOverrides[character.id];
        if (!override) {
          return character;
        }

        return {
          ...character,
          level: override.level,
          power: override.power,
        };
      }),
    [characters, optimisticOverrides]
  );

  const selectedCharacter = useMemo(
    () => displayCharacters.find((character) => character.id === selectedCharacterId),
    [displayCharacters, selectedCharacterId]
  );

  const currentCharacter = useMemo(
    () => displayCharacters.find((character) => character.userId === userProfile.id),
    [displayCharacters, userProfile.id]
  );

  const handleChangePress = useCallback(
    (character: RoomCharacter) => {
      setSelectedCharacterId(character.id);

      if (character.userId === userProfile.id) {
        setQuickEditSnapshot({
          characterId: character.id,
          stats: { level: character.level, power: character.power },
        });
        setQuickEditVisible(true);
        return;
      }

      setChangeCharacterModalVisible(true);
    },
    [userProfile.id]
  );

  const handleQuickStatsChange = useCallback(
    (stats: CharacterStatsOverride) => {
      if (!selectedCharacterId) {
        return;
      }

      setOptimisticOverrides((prev) => ({
        ...prev,
        [selectedCharacterId]: stats,
      }));
    },
    [selectedCharacterId]
  );

  const closeQuickEditWithUndo = useCallback(() => {
    if (!selectedCharacterId || !quickEditSnapshot) {
      setQuickEditVisible(false);
      return;
    }

    const latest = optimisticOverrides[selectedCharacterId] ?? quickEditSnapshot.stats;
    const changed = latest.level !== quickEditSnapshot.stats.level || latest.power !== quickEditSnapshot.stats.power;

    setQuickEditVisible(false);

    if (!changed) {
      return;
    }

    setUndoState({ characterId: selectedCharacterId, previous: quickEditSnapshot.stats });
    setShowUndoToast(true);
  }, [optimisticOverrides, quickEditSnapshot, selectedCharacterId]);

  const handleQuickEditSave = useCallback(async () => {
    if (!selectedCharacter || !selectedCharacterId || !quickEditSnapshot) {
      return;
    }

    const stats = optimisticOverrides[selectedCharacterId] ?? {
      level: selectedCharacter.level,
      power: selectedCharacter.power,
    };

    try {
      setActionError(null);
      await update(selectedCharacter.id, {
        level: stats.level,
        power: stats.power,
      });
      setQuickEditVisible(false);
      setQuickEditSnapshot(null);
      setOptimisticOverrides((prev) => {
        const next = { ...prev };
        delete next[selectedCharacter.id];
        return next;
      });
      setShowUndoToast(false);
      setUndoState(null);
    } catch (error) {
      setDangerFlash(true);
      setActionError(error instanceof Error ? error.message : 'Failed to update character stats');
      setOptimisticOverrides((prev) => ({
        ...prev,
        [selectedCharacter.id]: quickEditSnapshot.stats,
      }));
    }
  }, [optimisticOverrides, quickEditSnapshot, selectedCharacter, selectedCharacterId, update]);

  const handleQuickEditUndo = useCallback(() => {
    if (!undoState) {
      return;
    }

    setOptimisticOverrides((prev) => ({
      ...prev,
      [undoState.characterId]: undoState.previous,
    }));
    setShowUndoToast(false);
    setUndoState(null);
  }, [undoState]);

  const handleOpenFullEdit = useCallback(() => {
    setQuickEditVisible(false);
    setChangeCharacterModalVisible(true);
  }, []);

  const handleCopyRoomCodePress = useCallback(() => {
    void copyRoomCode().catch((error) => {
      console.error('Failed to copy room code:', error);
    });
  }, [copyRoomCode]);

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

          <RoomCharactersList
            characters={displayCharacters}
            isLoading={isLoading}
            errorMessage={errorMessage}
            actionError={actionError}
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

          {changeCharacterModalVisible && selectedCharacter && (
            <ChangeCharacterModal
              character={selectedCharacter}
              onConfirm={async (character) => {
                try {
                  setActionError(null);
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
              onCancel={() => setChangeCharacterModalVisible(false)}
            />
          )}

          <QuickEditSheet
            visible={quickEditVisible}
            character={selectedCharacter ?? null}
            onStatsChange={handleQuickStatsChange}
            onSave={handleQuickEditSave}
            onClose={closeQuickEditWithUndo}
            onOpenFullEdit={handleOpenFullEdit}
            hasErrorFlash={dangerFlash}
          />

          {showUndoToast && undoState && (
            <View style={styles.undoToastWrapper} pointerEvents="box-none">
              <Pressable style={styles.undoToast} onPress={handleQuickEditUndo}>
                <Text style={styles.undoToastText}>Undo</Text>
              </Pressable>
            </View>
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
  undoToastWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: AppTheme.spacing.xl,
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
