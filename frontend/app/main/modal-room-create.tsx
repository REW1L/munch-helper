import React from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

interface RoomCreateModalProps {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  game?: string;
}

export default function RoomCreateModal({
  visible,
  onConfirm,
  onCancel,
  game = 'Munchkin',
}: RoomCreateModalProps) {
  return (
    <Modal
      transparent={true}
      animationType="fade"
      visible={visible}
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.titleContainer}>
            <Text style={styles.titleText}>Create a room for {game}?</Text>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.button}
              onPress={onConfirm}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>YEP</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.button}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.buttonText}>NO</Text>
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
  },
  titleContainer: {
    alignSelf: 'stretch',
    backgroundColor: '#A67560',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  titleText: {
    alignSelf: 'stretch',
    textAlign: 'center',
    color: '#493D29',
    fontSize: 17,
    fontFamily: 'Arial',
    fontWeight: '400',
    lineHeight: 22,
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
    fontFamily: 'Roboto',
    fontWeight: '400',
    lineHeight: 28,
    textShadowColor: '#796834',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
});