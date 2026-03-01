import { Character as RoomCharacter } from '@/api/characters';
import VioletButton from '@/components/VioletButton';
import avatars from '@/constants/avatars';
import { userProfileContext } from '@/context/UserContext';
import { useRoomCharacters } from '@/hooks/useCharacters';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useContext, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ChangeCharacterModal from './modal-change-caracter';
import CreateCharacterModal from './modal-create-character';

// Color constants from design
const COLORS = {
  BACKGROUND: '#4C4545',
  CONTENT_BG: '#3C3636',
  DARK_BG: '#544C4C',
  CARD_BG: '#A67560',
  ROOM_HEADER: '#74574A',
  DARK_GRAY: '#313131',
  BUTTON_DANGER: '#922525',
  OVERLAY: 'rgba(0, 0, 0, 0.30)',
  TEXT_WHITE: '#FFFFFF',
  TEXT_BLACK: '#000000',
  ATTRIBUTE_BG: 'rgba(0, 0, 0, 0.30)',
};

const ATTRIBUTES: ('race' | 'gender' | 'class')[] = [
  'race', 'gender', 'class'
];

const CharacterCard: React.FC<{
  character: RoomCharacter;
  isHighlight?: boolean;
  onChangePress: (character: RoomCharacter) => void;
}> = ({ character, isHighlight = false, onChangePress }) => {
  return (
    <View
      style={[
        styles.characterCard,
        isHighlight && styles.characterCardHighlight,
      ]}
      key={character.id}
    >
      <View style={styles.characterContent}>
        <View style={{ backgroundColor: character.color, borderRadius: 20 }}>
          <Image
            source={avatars[character.avatar]}
            style={styles.characterAvatar}
          />
        </View>
        <View style={styles.characterInfo}>
          <View style={styles.nicknameRow}>
            <Text style={styles.characterNickname}>{character.nickname}</Text>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.characterStats}>{character.level} lvl</Text>
            <Text style={styles.characterStats}>{character.power} str</Text>
          </View>
        </View>
      </View>

      <View style={styles.attributesBox}>
        <ScrollView>
          {ATTRIBUTES.map((attr) => (
            character[attr].map((value: string) => (
              <Text key={`attribute-${character.id}-${value}`} style={styles.attributeText}>
                {value}
              </Text>
            ))
          ))}
        </ScrollView>
      </View>

      <VioletButton
        title="Change"
        onPress={() => onChangePress(character)}
      />
    </View>
  );
};

const MunchkinIndexView: React.FC = () => {
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  const roomId = Array.isArray(roomNumber) ? roomNumber[0] : roomNumber;
  const { userProfile } = useContext(userProfileContext);
  const { characters, create, update, isLoading, errorMessage } = useRoomCharacters(roomId, userProfile);

  const currentCharacterIndex = characters.findIndex((character) => character.userId === userProfile.id);
  const currentCharacter = currentCharacterIndex === -1 ? undefined : characters[currentCharacterIndex];
  const [createCharacterModalVisible, setCreateCharacterModalVisible] = useState(false);
  const [changeCharacterModalVisible, setChangeCharacterModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<RoomCharacter | undefined>(undefined);

  return (
    <SafeAreaProvider key={`room-${roomNumber}`}>
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: COLORS.CONTENT_BG, // Dark theme background
      }} edges={Platform.OS === "ios" ? ["bottom"] : ["top", "bottom", "left", "right"]}>
        <View style={styles.container}>
          <Stack.Screen options={{ title: `Room ${roomNumber}` }} />

          {/* Main Content */}
          <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>

            {/* Characters List */}
            <View style={styles.charactersList}>
              {isLoading && characters.length === 0 && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="small" color={COLORS.TEXT_WHITE} />
                  <Text style={styles.loadingText}>Loading characters...</Text>
                </View>
              )}

              {errorMessage && characters.length === 0 && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>{errorMessage}</Text>
                </View>
              )}

              {characters.map((character) => (
                <CharacterCard
                  key={character.id}
                  character={character}
                  onChangePress={(char) => {
                    setSelectedCharacter(char);
                    setChangeCharacterModalVisible(true);
                  }}
                />
              ))}
            </View>

            {/* Create Character Button */}
            <View style={{ padding: 10, alignItems: 'center' }}>
              <VioletButton
                title="Create a character"
                onPress={() => setCreateCharacterModalVisible(true)}
              />
            </View>
          </ScrollView>

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
            <View style={styles.currentCharacterFooter} key={`own-char-${currentCharacter.id}`}>
              <View style={{ backgroundColor: currentCharacter.color, borderRadius: 20 }}>
                <Image
                  source={avatars[currentCharacter.avatar]}
                  style={styles.footerAvatar}
                />
              </View>
              <View style={styles.footerInfo}>
                <Text style={styles.footerNickname}>{currentCharacter.nickname}</Text>
                <View style={styles.footerStats}>
                  <Text style={styles.footerStatText}>
                    {currentCharacter.level} lvl
                  </Text>
                  <Text style={styles.footerStatText}>
                    {currentCharacter.power} str
                  </Text>
                </View>
              </View>

              <View style={styles.footerAttributes}>
                <ScrollView>
                  {ATTRIBUTES.map((attr, index) => (
                    currentCharacter[attr].map((value: string) => (
                      <Text key={`footer-attribute-${currentCharacter.id}-${index}-${value}`} style={styles.footerAttributeText}>
                        {value}
                      </Text>
                    ))
                  ))}
                </ScrollView>
              </View>

              <VioletButton
                title="Change"
                onPress={() => {
                  setSelectedCharacter(currentCharacter);
                  setChangeCharacterModalVisible(true);
                }}
              />
            </View>
          )}

          <CreateCharacterModal
            visible={createCharacterModalVisible}
            onConfirm={async (character) => {
              await create({
                userId: userProfile.id,
                nickname: character.name,
                avatar: character.avatar ?? userProfile.avatar,
                level: 1,
                power: 0,
                race: character.race,
                gender: character.gender,
                class: character.class,
              });
              setCreateCharacterModalVisible(false);
            }}
            onCancel={() => setCreateCharacterModalVisible(false)}
          />

          {changeCharacterModalVisible &&
            <ChangeCharacterModal
              character={selectedCharacter}
              onConfirm={async (character) => {
                await update(character.id, {
                  nickname: character.nickname,
                  avatar: character.avatar,
                  level: character.level,
                  power: character.power,
                  race: character.race,
                  gender: character.gender,
                  class: character.class,
                });
                setChangeCharacterModalVisible(false);
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
  header: {
    height: 60,
    paddingHorizontal: 20,
    paddingVertical: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.BACKGROUND,
  },
  headerCarrier: {
    fontSize: 17,
    fontWeight: '400',
    color: COLORS.TEXT_BLACK,
  },
  statusIndicators: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    width: 73,
  },
  signalIcon: {
    width: 14,
    height: 14,
    backgroundColor: COLORS.TEXT_BLACK,
    borderRadius: 2,
  },
  lteText: {
    fontSize: 17,
    fontWeight: '400',
    color: COLORS.TEXT_BLACK,
  },
  batteryIcon: {
    width: 23,
    height: 10,
    backgroundColor: COLORS.TEXT_BLACK,
    borderRadius: 2,
    marginLeft: 10,
  },
  mainContent: {
    flex: 1,
    backgroundColor: COLORS.CONTENT_BG,
    paddingHorizontal: 5,
    paddingBottom: 10,
  },
  roomHeader: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 10,
    marginBottom: 10,
    backgroundColor: COLORS.ROOM_HEADER,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roomTitle: {
    fontSize: 32,
    fontWeight: '400',
    color: COLORS.TEXT_BLACK,
  },
  charactersList: {
    gap: 10,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: COLORS.TEXT_WHITE,
  },
  characterCard: {
    height: 85,
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: COLORS.CARD_BG,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  characterCardHighlight: {
    backgroundColor: COLORS.DARK_BG,
  },
  characterContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
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
  nicknameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 5,
  },
  characterNickname: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.15,
  },
  colorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.TEXT_BLACK,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  characterStats: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.15,
  },
  attributesBox: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.ATTRIBUTE_BG,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.TEXT_BLACK,
    height: 64,
    justifyContent: 'center',
  },
  attributeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.5,
    lineHeight: 16,
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
  currentCharacterFooter: {
    height: 85,
    paddingHorizontal: 5,
    paddingVertical: 5,
    backgroundColor: COLORS.DARK_BG,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  footerAvatar: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
  },
  footerInfo: {
    gap: 5,
  },
  footerNickname: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.15,
  },
  footerStats: {
    flexDirection: 'row',
    gap: 10,
  },
  footerStatText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.15,
  },
  footerAttributes: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.ATTRIBUTE_BG,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: COLORS.TEXT_BLACK,
    height: 64,
    justifyContent: 'center',
  },
  footerAttributeText: {
    fontSize: 11,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
});

export default MunchkinIndexView;

