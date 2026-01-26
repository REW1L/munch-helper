import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import CreateCharacterModal from './modal-create-character';
import ChangeCharacterModal from './modal-change-caracter';

// Color constants from design
const COLORS = {
  BACKGROUND: '#4C4545',
  CONTENT_BG: '#3C3636',
  DARK_BG: '#544C4C',
  CARD_BG: '#A67560',
  ROOM_HEADER: '#74574A',
  DARK_GRAY: '#313131',
  BUTTON_PRIMARY: '#6E6BD4',
  BUTTON_DANGER: '#922525',
  OVERLAY: 'rgba(0, 0, 0, 0.30)',
  TEXT_WHITE: '#FFFFFF',
  TEXT_BLACK: '#000000',
  ATTRIBUTE_BG: 'rgba(0, 0, 0, 0.30)',
};

interface Character {
  id: string;
  nickname: string;
  level: number;
  power: number;
  color: string;
  race: string;
  gender: "male" | "female";
  class: string;
}

interface AttributeTag {
  label: string;
}

// Mock data
const MOCK_CHARACTERS: Character[] = [
  {
    id: '1',
    nickname: 'Nickname 1',
    level: 10,
    power: 50,
    color: '#FFFB00',
    race: 'Human',
    gender: 'male',
    class: 'Cleric',
  },
  {
    id: '2',
    nickname: 'Nickname 2',
    level: 10,
    power: 50,
    color: '#2600FF',
    race: 'Elf',
    gender: 'female',
    class: 'Thief',
  },
  {
    id: '3',
    nickname: 'Nickname 33',
    level: 10,
    power: 50,
    color: '#FF0004',
    race: 'Human',
    gender: 'male',
    class: 'Cleric',
  },
  {
    id: '4',
    nickname: 'Nickname 4',
    level: 10,
    power: 50,
    color: '#11FF00',
    race: 'Elf',
    gender: 'female',
    class: 'Thief',
  },
];

const ATTRIBUTES: AttributeTag[] = [
  { label: 'Human' },
  { label: 'Elf' },
  { label: 'male' },
  { label: 'female' },
  { label: 'Cleric' },
  { label: 'Thief' },
];

const CharacterCard: React.FC<{
  character: Character;
  isHighlight?: boolean;
  onChangePress?: (character: Character) => void;
}> = ({ character, isHighlight = false, onChangePress }) => {
  return (
    <View
      style={[
        styles.characterCard,
        isHighlight && styles.characterCardHighlight,
      ]}
    >
      <View style={styles.characterContent}>
        <View style={{ backgroundColor: character.color, borderRadius: 20 }}>
          <Image
            source={require('@/assets/images/avatar.png')}
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
          {ATTRIBUTES.map((attr, index) => (
            <Text key={index} style={styles.attributeText}>
              {attr.label}
            </Text>
          ))}
        </ScrollView>
      </View>

      <TouchableOpacity
        style={styles.changeButton}
        onPress={() => onChangePress?.(character)}
      >
        <Text style={styles.changeButtonText}>Change</Text>
      </TouchableOpacity>
    </View>
  );
};

const MunchkinIndexView: React.FC = () => {
  const [currentCharacter] = useState<Character>(MOCK_CHARACTERS[0]);
  const [characters] = useState<Character[]>(MOCK_CHARACTERS);
  const [createCharacterModalVisible, setCreateCharacterModalVisible] = useState(false);
  const [changeCharacterModalVisible, setChangeCharacterModalVisible] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const { roomNumber } = useLocalSearchParams<{ roomNumber: string }>();
  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: `Room ${roomNumber}` }} />

      {/* Main Content */}
      <ScrollView style={styles.mainContent} showsVerticalScrollIndicator={false}>

        {/* Characters List */}
        <View style={styles.charactersList}>
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
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setCreateCharacterModalVisible(true)}
        >
          <Text style={styles.createButtonText}>Create a character</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.battleButton}>
          <Text style={styles.battleButtonText}>Battle</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.logButton}>
          <Text style={styles.logButtonText}>Log</Text>
        </TouchableOpacity>
      </View>

      {/* Current Character Footer */}
      <View style={styles.currentCharacterFooter}>
        <View style={{ backgroundColor: currentCharacter.color, borderRadius: 20 }}>
          <Image
            source={require('@/assets/images/avatar.png')}
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
              <Text key={index} style={styles.footerAttributeText}>
                {attr.label}
              </Text>
            ))}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={styles.footerChangeButton}
          onPress={() => {
            setSelectedCharacter(currentCharacter);
            setChangeCharacterModalVisible(true);
          }}
        >
          <Text style={styles.footerChangeButtonText}>Change</Text>
        </TouchableOpacity>
      </View>

      <CreateCharacterModal
        visible={createCharacterModalVisible}
        onConfirm={(character) => {
          console.log('Character created:', character);
          setCreateCharacterModalVisible(false);
        }}
        onCancel={() => setCreateCharacterModalVisible(false)}
      />

      <ChangeCharacterModal
        visible={changeCharacterModalVisible}
        character={selectedCharacter || undefined}
        onConfirm={(character) => {
          console.log('Character changed:', character);
          setChangeCharacterModalVisible(false);
        }}
        onCancel={() => setChangeCharacterModalVisible(false)}
      />
    </View>
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
  exitButton: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.DARK_GRAY,
    borderRadius: 10,
  },
  exitButtonText: {
    fontSize: 24,
    fontWeight: '400',
    color: COLORS.TEXT_WHITE,
  },
  charactersList: {
    gap: 10,
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
  changeButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.BUTTON_PRIMARY,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  changeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.15,
  },
  createButton: {
    marginHorizontal: 68,
    marginVertical: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: COLORS.BUTTON_PRIMARY,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButtonText: {
    fontSize: 24,
    fontWeight: '400',
    color: COLORS.TEXT_WHITE,
  },
  actionButtons: {
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
  footerChangeButton: {
    paddingHorizontal: 10,
    paddingVertical: 10,
    backgroundColor: COLORS.BUTTON_PRIMARY,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerChangeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.TEXT_WHITE,
    letterSpacing: 0.15,
  },
});

export default MunchkinIndexView;

