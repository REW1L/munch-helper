import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ButtonLabel from '@/components/ButtonLabel';
import { AppTheme } from '@/constants/theme';
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ModalRoomJoinProps {
  visible: boolean;
  onClose: () => void;
  onJoin: (roomName: string) => void;
  game: string;
}

export default function ModalRoomJoin({ visible, onClose, onJoin, game }: ModalRoomJoinProps) {
  const { t } = useTranslation();
  const [roomName, setRoomName] = useState('');

  const handleJoin = () => {
    const roomNm = roomName.trim();
    if (roomNm) {
      console.log('Joining room:', roomNm);
      onJoin(roomNm);
      setRoomName('');
      onClose();
    }
  };

  const handleCancel = () => {
    setRoomName('');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.modalContent}>
          <View style={styles.formSection}>
            <Text style={styles.title}>{t('roomJoin.title', { game })}</Text>
            <TextInput
              style={styles.input}
              placeholder={t('roomJoin.placeholder')}
              placeholderTextColor="#888686"
              value={roomName}
              onChangeText={setRoomName}
              autoCapitalize="none"
              autoCorrect={false}
              accessible
              accessibilityLabel="screenshot-room-id-input"
              testID="screenshot-room-id-input"
            />
          </View>
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={handleJoin}
              activeOpacity={0.7}
              accessibilityLabel="screenshot-confirm-room-join"
              testID="screenshot-confirm-room-join"
            >
              <ButtonLabel accessible accessibilityLabel="screenshot-confirm-room-join" testID="screenshot-confirm-room-join" style={styles.buttonText}>{t('common.join')}</ButtonLabel>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.button}
              onPress={handleCancel}
              activeOpacity={0.7}
            >
              <ButtonLabel style={styles.buttonText}>{t('common.cancel')}</ButtonLabel>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    paddingHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: '#2A2424',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#313131',
    gap: 10,
    minWidth: 300,
  },
  formSection: {
    paddingTop: 10,
    backgroundColor: AppTheme.colors.surfaceWarm,
    borderRadius: 5,
    gap: 5,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  title: {
    textAlign: 'center',
    color: '#493D29',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  input: {
    padding: 5,
    backgroundColor: '#DFDFDF',
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    fontSize: 16,
    fontWeight: '500',
    height: 40,
    letterSpacing: 0.15,
    textAlign: 'center',
    alignContent: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  button: {
    paddingHorizontal: 31,
    paddingVertical: 16,
    backgroundColor: '#D2ACAC',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    textAlign: 'center',
    color: '#CEB464',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 28,
    textShadowColor: '#796834',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});
