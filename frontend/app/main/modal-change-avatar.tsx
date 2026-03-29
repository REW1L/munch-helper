import avatars from '@/constants/avatars';
import { AppTheme } from '@/constants/theme';
import { Image } from 'expo-image';
import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface ChangeAvatarModalProps {
  selectedImage: number;
  visible?: boolean;
  onConfirm: (avatar: number) => void;
  onCancel: () => void;
}

export default function ChangeAvatarModal({
  selectedImage,
  visible = true,
  onConfirm,
  onCancel,
}: ChangeAvatarModalProps) {
  const [selectedAvatar, setSelectedAvatar] = useState<number>(
    selectedImage
  );

  const handleSelectAvatar = (avatarIndex: number) => {
    setSelectedAvatar(avatarIndex);
  };

  const handleConfirm = () => {
    onConfirm(selectedAvatar);
  };

  const getBorderColor = (avatarIndex: number) => {
    if (avatarIndex === selectedAvatar) {
      return '#CEB464'; // Bronze color for clicked/selected
    }
    return '#2A2424'; // Dark background color for default
  };

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
            <View style={styles.avatarGrid}>
              {avatars.map((avatar, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectAvatar(index)}
                  activeOpacity={0.7}
                >
                  <Image
                    source={avatar}
                    style={[
                      styles.avatarImage,
                      {
                        borderColor: getBorderColor(index),
                      },
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>Select</Text>
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
    minHeight: '50%',
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
  avatarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 12,
  },
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 3,
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
