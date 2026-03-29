import { Character as RoomCharacter } from '@/api/characters';
import { AppTheme } from '@/constants/theme';
import { userProfileContext } from '@/context/UserContext';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { useRoomCodeClipboard } from '@/hooks/useRoomCodeClipboard';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CurrentCharacterFooter from '../../../components/munchkin/CurrentCharacterFooter';
import RoomCharactersList from '../../../components/munchkin/RoomCharactersList';
import ChangeCharacterModal from '../modal-change-caracter';
import CreateCharacterModal from '../modal-create-character';

const MunchkinIndexView: React.FC = () => {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const roomCode = roomId ?? '';
  const { userProfile } = useContext(userProfileContext);
  const { characters, create, update, isLoading, errorMessage } = useRoomCharacters(roomId, userProfile);
  const { buttonLabel, accessibilityLabel, copyRoomCode } = useRoomCodeClipboard(roomCode);

  const currentCharacter = useMemo(
    () => characters.find((character) => character.userId === userProfile.id),
    [characters, userProfile.id]
  );
  const [createCharacterModalVisible, setCreateCharacterModalVisible] = useState(false);
  const [changeCharacterModalVisible, setChangeCharacterModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<RoomCharacter | undefined>(undefined);
  const [actionError, setActionError] = useState<string | null>(null);

  const handleChangePress = useCallback((character: RoomCharacter) => {
    setSelectedCharacter(character);
    setChangeCharacterModalVisible(true);
  }, []);

  const handleCopyRoomCodePress = useCallback(() => {
    void copyRoomCode().catch((error) => {
      console.error('Failed to copy room code:', error);
    });
  }, [copyRoomCode]);

  return (
    <SafeAreaProvider key={`room-${roomNumber}`}>
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: AppTheme.colors.background,
      }} edges={Platform.OS === "ios" ? [] : ["top", "bottom", "left", "right"]}>
        <View style={styles.container}>
          <Stack.Screen
            options={{
              headerTitle: () => (
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerRoomLabel}>Room</Text>
                  <Text
                    style={styles.headerRoomCode}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
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
            characters={characters}
            isLoading={isLoading}
            errorMessage={errorMessage}
            actionError={actionError}
            onCreateCharacter={() => setCreateCharacterModalVisible(true)}
            onChangePress={handleChangePress}
          />

          {/* Bottom Action Buttons */}
          <View style={styles.actionButtons}>
            {/* TODO: Not implemented yet */}
            <TouchableOpacity style={[styles.battleButton, { opacity: 0 }]}>
              <Text style={styles.battleButtonText}>Battle</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.logButton, { opacity: 0 }]}>
              <Text style={styles.logButtonText}>Log</Text>
            </TouchableOpacity>
          </View>

          {/* Current Character Footer */}
          {currentCharacter && (
            <CurrentCharacterFooter
              key={`own-char-${currentCharacter.id}`}
              character={currentCharacter}
              onChangePress={handleChangePress}
            />
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
                  class: character.class
                });
                setCreateCharacterModalVisible(false);
              } catch (error) {
                setActionError(error instanceof Error ? error.message : 'Failed to create character');
              }
            }}
            onCancel={() => setCreateCharacterModalVisible(false)}
          />

          {changeCharacterModalVisible &&
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
                    class: character.class
                  });
                  setChangeCharacterModalVisible(false);
                } catch (error) {
                  setActionError(error instanceof Error ? error.message : 'Failed to update character');
                }
              }}
              onCancel={() => setChangeCharacterModalVisible(false)}
            />
          }
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
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
});

export default MunchkinIndexView;
