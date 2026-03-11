import { Character as RoomCharacter } from '@/api/characters';
import { userProfileContext } from '@/context/UserContext';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useContext, useMemo, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import CurrentCharacterFooter from '../../components/munchkin/CurrentCharacterFooter';
import RoomCharactersList from '../../components/munchkin/RoomCharactersList';
import ChangeCharacterModal from './modal-change-caracter';
import CreateCharacterModal from './modal-create-character';

// Color constants from design
const COLORS = {
  BACKGROUND: '#4C4545',
  CONTENT_BG: '#3C3636',
  BUTTON_DANGER: '#922525',
  TEXT_WHITE: '#FFFFFF',
};

const MunchkinIndexView: React.FC = () => {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const { userProfile } = useContext(userProfileContext);
  const { characters, create, update, isLoading, errorMessage } = useRoomCharacters(roomId, userProfile);

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

  return (
    <SafeAreaProvider key={`room-${roomNumber}`}>
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: COLORS.CONTENT_BG, // Dark theme background
      }} edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom", "left", "right"]}>
        <View style={styles.container}>
          <Stack.Screen options={{ title: `Room ${roomNumber}` }} />

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
    backgroundColor: COLORS.BACKGROUND,
  },
  actionButtons: {
    height: 0,
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.CONTENT_BG,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  battleButton: {
    paddingHorizontal: 50,
    paddingVertical: 7,
    backgroundColor: COLORS.BUTTON_DANGER,
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  battleButtonText: {
    fontSize: 32,
    fontWeight: '400',
    color: COLORS.TEXT_WHITE,
  },
  logButton: {
    paddingHorizontal: 21,
    paddingVertical: 7,
    backgroundColor: '#353535',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logButtonText: {
    fontSize: 32,
    fontWeight: '400',
    color: COLORS.TEXT_WHITE,
  },
});

export default MunchkinIndexView;

