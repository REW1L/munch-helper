import { Image } from 'expo-image';
import { AppTheme } from '@/constants/theme';
import React, { useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import ColorPicker, { Panel5 } from 'reanimated-color-picker';

import NativePicker from '@/components/munchkin/NativePicker';
import avatars from '@/constants/avatars';

interface Character {
  id: string;
  nickname: string;
  color: string;
  gender: string[];
  race: string[];
  class: string[];
  level: number;
  power: number;
  avatar: number;
}

interface ChangeCharacterModalProps {
  character?: Character;
  onConfirm: (character: Character) => void;
  onCancel: () => void;
}

export default function ChangeCharacterModal({
  character: initialCharacter,
  onConfirm,
  onCancel,
}: ChangeCharacterModalProps) {
  const [character, setCharacter] = useState<Character>(
    initialCharacter || {
      id: 'temp-id',
      nickname: 'Munchqueen',
      color: '#1010FF',
      gender: ['male'],
      race: ['Human'],
      class: ['Cleric'],
      level: 9,
      power: 15,
      avatar: Math.floor(Math.random() * avatars.length),
    }
  );
  let [newRace, setNewRace] = useState("<Select>");
  let [newClass, setNewClass] = useState("<Select>");
  const [colorModalVisible, setColorModalVisible] = useState(false);

  const handleSave = () => {
    onConfirm(character);
  };

  const races = ['Human', 'Elf', 'Dwarf', 'Halfling', 'Orc', 'Gnome'];
  const classes = ['Cleric', 'Wizard', 'Warrior', 'Thief', 'Ranger', 'Bard'];

  const incrementValue = (field: 'level' | 'power') => {
    setCharacter({ ...character, [field]: character[field] + 1 });
  };

  const decrementValue = (field: 'level' | 'power') => {
    let minimum = 0;
    if (field === 'level') minimum = 1;
    setCharacter({
      ...character,
      [field]: Math.max(minimum, character[field] - 1),
    });
  };

  return (
    <Modal
      transparent={true}
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
          >
            <View style={styles.avatarContainer}>
              <Image source={avatars[character.avatar]} style={styles.avatar} />
            </View>

            {/* Name Input */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Name:</Text>
              <TextInput
                style={styles.input}
                value={character.nickname}
                onChangeText={(text) =>
                  setCharacter({ ...character, nickname: text })
                }
                placeholderTextColor="#888686"
              />
            </View>

            {/* Level Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Level:</Text>
              <View style={styles.inputGroup}>
                <View style={styles.valueDisplay}>
                  <Text style={styles.valueText}>{character.level}</Text>
                </View>
                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementValue('level')}
                >
                  <Text style={styles.buttonSmallText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => decrementValue('level')}
                >
                  <Text style={styles.buttonSmallText}>-</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Power Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Power:</Text>
              <View style={styles.inputGroup}>
                <View style={styles.valueDisplay}>
                  <Text style={styles.valueText}>{character.power}</Text>
                </View>
                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => incrementValue('power')}
                >
                  <Text style={styles.buttonSmallText}>+</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.buttonSmall}
                  onPress={() => decrementValue('power')}
                >
                  <Text style={styles.buttonSmallText}>-</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Class Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Class:</Text>
              <View style={styles.inputGroupVertical}>
                {character.class.map((cls, index) => (
                  <View style={styles.classRow} key={`class-${index}`}>
                    <View style={styles.classDropdown}>
                      <NativePicker
                        selectedValue={character.class[index]}
                        onValueChange={(value: string) => {
                          const newClasses = [...character.class];
                          newClasses[index] = value;
                          setCharacter({ ...character, class: newClasses });
                        }}
                        options={classes}
                        pickerKey={`class-${index}`}
                      />
                    </View>
                    <TouchableOpacity style={styles.classButton}
                      onPress={() => {
                        const newClasses = [...character.class];
                        newClasses.splice(index, 1);
                        setCharacter({ ...character, class: newClasses });
                      }}
                    >
                      <Text style={styles.classButtonText}>-</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.classRow}>
                  <View style={styles.classDropdown}>
                    <NativePicker
                      selectedValue={newClass}
                      onValueChange={(value: string) => setNewClass(value)}
                      options={classes}
                      pickerKey="newclass"
                    />
                  </View>
                  <TouchableOpacity style={styles.classButton}
                    onPress={() => {
                      if (newClass === "<Select>" || character.class.includes(newClass)) return;
                      setCharacter({ ...character, class: [...character.class, newClass] });
                      setNewClass("<Select>");
                    }}
                  >
                    <Text style={styles.classButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Race Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Race:</Text>
              <View style={styles.inputGroupVertical}>
                {character.race.map((race, index) => (
                  <View style={styles.classRow} key={`race-${index}`}>
                    <View style={styles.classDropdown}>
                      <NativePicker
                        selectedValue={character.race[index]}
                        onValueChange={(value: string) => {
                          const newRaces = [...character.race];
                          newRaces[index] = value;
                          setCharacter({ ...character, race: newRaces });
                        }}
                        options={races}
                        pickerKey={`race-${index}`}
                      />
                    </View>
                    <TouchableOpacity
                      style={styles.classButton}
                      onPress={() => {
                        let newRaces = [...character.race];
                        if (newRaces.length <= 1) {
                          newRaces = ['Human'];
                        } else {
                          newRaces.splice(index, 1);
                        }
                        setCharacter({ ...character, race: newRaces });
                      }}
                    >
                      <Text style={styles.classButtonText}>-</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                <View style={styles.classRow}>
                  <View style={styles.classDropdown}>
                    <NativePicker
                      selectedValue={newRace}
                      onValueChange={(value: string) => setNewRace(value)}
                      options={races}
                      pickerKey="newrace"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.classButton}
                    onPress={() => {
                      if (newRace === "<Select>" || character.race.includes(newRace)) return;
                      setCharacter({ ...character, race: [...character.race, newRace] });
                      setNewRace("<Select>");
                    }}
                  >
                    <Text style={styles.classButtonText}>+</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Gender Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Gender:</Text>
              <View style={styles.genderContainer}>
                <TouchableOpacity
                  style={styles.genderRow}
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
                  <Text style={styles.genderLabel}>Male</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.genderRow}
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
                  <Text style={styles.genderLabel}>Female</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Color Selection */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Color:</Text>
              <Pressable
                style={[
                  styles.colorPicker,
                  { backgroundColor: character.color },
                ]}
                onPress={() => setColorModalVisible(true)}
              />
              <Modal
                transparent={true}
                animationType="fade"
                visible={colorModalVisible}
              >
                <Pressable style={styles.overlay} onPress={() => setColorModalVisible(false)}>
                  <ColorPicker
                    value={character.color}
                    thumbSize={24}
                    style={styles.colorPickerModal}
                    thumbShape='circle'
                    onCompleteJS={(color) => {
                      setCharacter({ ...character, color: `${color.hex}` });
                      setColorModalVisible(false);
                    }}
                  >
                    <Text style={[styles.contentContainer, styles.headerText]}>Select Color</Text>
                    <Panel5 />
                  </ColorPicker>
                </Pressable>
              </Modal>
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Save</Text>
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
    backgroundColor: AppTheme.colors.surfaceWarm,
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
  inputGroup: {
    width: '70%',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  inputGroupVertical: {
    width: '70%',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  valueDisplay: {
    backgroundColor: '#DFDFDF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  valueText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  buttonSmall: {
    backgroundColor: '#DFDFDF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSmallText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
    fontFamily: 'Roboto',
  },
  classContainer: {
    width: '70%',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
  },
  classRow: {
    width: '100%',
    flexDirection: 'row',
    gap: 5,
    alignItems: 'center',
  },
  classDropdown: {
    flex: 1,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    backgroundColor: '#DFDFDF',
    color: '#000000',
    overflow: 'hidden'
  },
  picker: {
    color: '#000000',
    maxHeight: 40,
  },
  pickerItem: {
    fontSize: 20,
    maxHeight: 40,
  },
  classButton: {
    backgroundColor: '#DFDFDF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  classButtonText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  raceContainer: {
    width: '70%',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 5,
    justifyContent: 'center',
  },
  raceButton: {
    backgroundColor: '#DFDFDF',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
  },
  raceButtonActive: {
    backgroundColor: '#DFDFDF',
  },
  raceButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  raceButtonTextActive: {
    color: '#000000',
  },
  genderContainer: {
    width: '70%',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 8,
  },
  genderRow: {
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
  genderLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'Roboto',
  },
  input: {
    width: '70%',
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
    alignContent: 'center',
  },
  colorPicker: {
    width: '70%',
    height: 34,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
  },
  colorPickerModal: {
    maxWidth: '90%',
    maxHeight: '30%',
    borderRadius: 5,
    borderWidth: 5,
    borderColor: '#484848',
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
