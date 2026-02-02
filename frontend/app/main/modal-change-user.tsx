import avatars from '@/constants/avatars';
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
import ChangeAvatarModal from './modal-change-avatar';

interface UserProfile {
  nickname: string;
  avatar: { uri: string };
}

interface ChangeUserModalProps {
  user?: UserProfile;
  visible?: boolean;
  onConfirm: (user: UserProfile) => void;
  onCancel: () => void;
}

export default function ChangeUserModal({
  user: initialUser,
  visible = true,
  onConfirm,
  onCancel,
}: ChangeUserModalProps) {
  const [user, setUser] = useState<UserProfile>(
    initialUser || {
      nickname: 'Player',
      avatar: avatars[Math.floor(Math.random() * avatars.length)],
    }
  );
  const [showAvatarModal, setShowAvatarModal] = useState(false);

  const handlePickAvatar = () => {
    setShowAvatarModal(true);
  };

  const handleAvatarConfirm = (avatar: { uri: string }) => {
    setUser({ ...user, avatar });
    setShowAvatarModal(false);
  };

  const handleAvatarCancel = () => {
    setShowAvatarModal(false);
  };

  const handleSave = () => {
    onConfirm(user);
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
            <View style={styles.avatarContainer}>
              <Image
                source={user.avatar}
                style={styles.avatar}
              />
              <TouchableOpacity
                style={styles.changeAvatarButton}
                onPress={handlePickAvatar}
              >
                <Text style={styles.changeAvatarButtonText}>Change Avatar</Text>
              </TouchableOpacity>
            </View>

            {/* Name Input */}
            <View style={styles.fieldRow}>
              <Text style={styles.fieldLabel}>Nickname:</Text>
              <TextInput
                maxLength={14}
                style={styles.input}
                value={user.nickname}
                onChangeText={(text) =>
                  setUser({ ...user, nickname: text })
                }
                placeholderTextColor="#888686"
                placeholder="Enter nickname"
              />
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

      {showAvatarModal && <ChangeAvatarModal
        visible={showAvatarModal}
        selectedImage={user.avatar}
        onConfirm={handleAvatarConfirm}
        onCancel={handleAvatarCancel}
      />}
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
    minHeight: '40%',
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
    height: '100%',
    gap: 12,
  },
  avatarContainer: {
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 5,
  },
  changeAvatarButton: {
    backgroundColor: '#DFDFDF',
    borderRadius: 5,
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#000000',
  },
  changeAvatarButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  fieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  fieldLabel: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'Roboto',
  },
  input: {
    width: '50%',
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
