import { Modal, View, Text, Image, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

interface ShopModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ShopModal({ visible, onClose }: ShopModalProps) {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            <View style={styles.header}>
              <Text style={styles.headerText}>Shop</Text>
            </View>

            <Image
              style={styles.mainImage}
              source={require('@/assets/images/shopkeeper.png')}
            />

            <View style={styles.coinItem}>
              <Image
                style={styles.coinImage}
                source={require('@/assets/images/coin-small.png')}
              />
              <View style={styles.coinInfo}>
                <Text style={styles.coinAmount}>200 coins</Text>
                <Text style={styles.coinPrice}>$1.99</Text>
              </View>
              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Buy</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.coinItem}>
              <Image
                style={styles.coinImage}
                source={require('@/assets/images/coin-medium.png')}
              />
              <View style={styles.coinInfo}>
                <Text style={styles.coinAmount}>500 coins</Text>
                <Text style={styles.coinPrice}>$3.99</Text>
              </View>
              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Buy</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.coinItem}>
              <Image
                style={styles.coinImage}
                source={require('@/assets/images/coin-large.png')}
              />
              <View style={styles.coinInfo}>
                <Text style={styles.coinAmount}>1000 coins</Text>
                <Text style={styles.coinPrice}>$7.99</Text>
              </View>
              <TouchableOpacity style={styles.buyButton}>
                <Text style={styles.buyButtonText}>Buy</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <TouchableOpacity style={styles.quitButton} onPress={onClose}>
            <Text style={styles.quitButtonText}>Quit shop</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    paddingLeft: 10,
    paddingRight: 10,
    paddingTop: 12,
    paddingBottom: 12,
    backgroundColor: '#2A2424',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#313131',
    maxHeight: '80%',
  },
  contentContainer: {
    paddingTop: 10,
    paddingBottom: 10,
    backgroundColor: '#2A2626',
    borderRadius: 5,
    alignItems: 'center',
  },
  header: {
    alignSelf: 'stretch',
    backgroundColor: '#743870',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 5,
  },
  headerText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 32,
    fontWeight: '400',
    lineHeight: 40,
  },
  mainImage: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    marginBottom: 5,
  },
  coinItem: {
    width: 250,
    minWidth: 250,
    padding: 5,
    backgroundColor: '#544C4C',
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  coinImage: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
  },
  coinInfo: {
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'flex-start',
  },
  coinAmount: {
    textAlign: 'center',
    color: 'white',
    fontSize: 22,
    fontWeight: '400',
    lineHeight: 28,
  },
  coinPrice: {
    textAlign: 'center',
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 16,
    letterSpacing: 0.5,
  },
  buyButton: {
    width: 60,
    height: 40,
    backgroundColor: '#6E6BD4',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buyButtonText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    letterSpacing: 0.15,
  },
  quitButton: {
    paddingLeft: 31,
    paddingRight: 31,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#D2ACAC',
    borderRadius: 10,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  quitButtonText: {
    textAlign: 'center',
    color: '#CEB364',
    textShadowColor: '#796834',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
    fontSize: 28,
    fontWeight: '400',
    lineHeight: 28,
  },
});