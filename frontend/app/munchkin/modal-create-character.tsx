import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

interface Character {
  name: string;
  color: string;
  gender: string[];
  race: string[];
}

interface CreateCharacterModalProps {
  visible: boolean;
  onConfirm: (character: Character) => void;
  onCancel: () => void;
}

const avatarImage = require('@/assets/images/avatar.png');

export default function CreateCharacterModal({
  visible,
  onConfirm,
  onCancel,
}: CreateCharacterModalProps) {
  const [character, setCharacter] = useState<Character>({
    name: 'Munchqueen',
    color: '#1010FF',
    gender: ['male'],
    race: ['Human'],
  });

  const handleCreate = () => {
    onConfirm(character);
  };

  const races = ['Human', 'Elf', 'Dwarf', 'Halfling'];

  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            <Text style={styles.headerText}>New character</Text>

            <View style={styles.avatarContainer}>
              <Image
                source={avatarImage}
                style={styles.avatar}
              />
            </View>

            {/* Color Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Color:</Text>
              <View
                style={[
                  styles.colorPicker,
                  { backgroundColor: character.color },
                ]}
              />
            </View>

            {/* Name Input */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name:</Text>
              <TextInput
                style={styles.input}
                value={character.name}
                onChangeText={(text) =>
                  setCharacter({ ...character, name: text })
                }
                placeholderTextColor="#888686"
              />
            </View>

            {/* Gender Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Gender:</Text>
              <View style={styles.optionContainer}>
                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() =>
                    setCharacter({ ...character, gender: ['male'] })
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      character.gender.includes('male') && styles.radioSelected,
                    ]}
                  >
                    {character.gender.includes('male') && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                  <Text style={styles.optionLabel}>Male</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.optionRow}
                  onPress={() =>
                    setCharacter({ ...character, gender: ['female'] })
                  }
                >
                  <View
                    style={[
                      styles.radio,
                      character.gender.includes('female') && styles.radioSelected,
                    ]}
                  >
                    {character.gender.includes('female') && (
                      <View style={styles.radioDot} />
                    )}
                  </View>
                  <Text style={styles.optionLabel}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Race Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Race:</Text>
              <View style={styles.optionContainer}>
                {races.map((race) => (
                  <TouchableOpacity
                    key={race}
                    style={styles.optionRow}
                    onPress={() =>
                      setCharacter({ ...character, race: [race] })
                    }
                  >
                    <View
                      style={[
                        styles.radio,
                        character.race.includes(race) && styles.radioSelected,
                      ]}
                    >
                      {character.race.includes(race) && (
                        <View style={styles.radioDot} />
                      )}
                    </View>
                    <Text style={styles.optionLabel}>{race}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleCreate}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Create</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#2A2424',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#313131',
    gap: 10,
    maxHeight: '80%',
    minHeight: '60%',
    width: '90%',
    maxWidth: 400,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    backgroundColor: '#A67560',
    borderRadius: 5,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 12,
  },
  headerText: {
    textAlign: 'center',
    color: '#493D29',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'Roboto',
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 75,
    height: 75,
    borderRadius: 5,
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 5,
  },
  fieldLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'Roboto',
  },
  colorPicker: {
    width: 160,
    height: 34,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
  },
  input: {
    width: 160,
    height: 34,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    backgroundColor: '#DFDFDF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  optionContainer: {
    width: 160,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#DFDFDF',
  },
  radioSelected: {
    backgroundColor: '#DFDFDF',
  },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#000000',
  },
  optionLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'Roboto',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    backgroundColor: '#D2ACAC',
    borderRadius: 10,
    paddingHorizontal: 31,
    paddingVertical: 16,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: '#CEB464',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 28,
    textAlign: 'center',
    fontFamily: 'Roboto',
    textShadowColor: '#796834',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});
