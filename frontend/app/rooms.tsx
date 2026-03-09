import { Image } from 'expo-image';
import { useContext, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import VioletButton from '@/components/VioletButton';
import avatars from '@/constants/avatars';
import { userProfileContext } from '@/context/UserContext';
import { router, Stack } from 'expo-router';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import ChangeUserModal from './main/modal-change-user';
import RoomCreateModal from './main/modal-room-create';
import RoomJoinModal from './main/modal-room-join';
import ShopModal from './main/modal-shop';

export default function Home() {
  const [shopModalVisible, setShopModalVisible] = useState(false);
  const [createRoomModalVisible, setCreateRoomModalVisible] = useState(false);
  const [joinRoomModalVisible, setJoinRoomModalVisible] = useState(false);
  const [changeUserModalVisible, setChangeUserModalVisible] = useState(false);
  const { userProfile, setUserProfile } = useContext(userProfileContext);

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: "#121212", // Dark theme background
      }} edges={Platform.OS === "ios" ? [] : ["top", "bottom", "left", "right"]}>
        <View style={styles.container}>
          {/* Status Bar */}
          <Stack.Screen options={{ title: 'Games' }} />

          {/* Main Content */}
          <View style={styles.mainContent}>
            {/* Munchkin Game Card */}
            <View style={styles.gameCard}>
              <View style={styles.gameTitle}>
                <Text style={styles.gameTitleText}>Munch ⚔️</Text>
                <Text style={styles.gameTitleText}>Classic</Text>
              </View>
              <View style={styles.gameActions}>
                <TouchableOpacity style={styles.actionButton} onPress={() => setCreateRoomModalVisible(true)}>
                  <Text style={styles.actionButtonLabel}>Create</Text>
                  <Text style={styles.actionButtonCost}>20 coins</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionButton} onPress={() => setJoinRoomModalVisible(true)}>
                  <Text style={styles.actionButtonLabel}>Join</Text>
                  <Text style={styles.actionButtonCost}>10 coins</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Rooms History Button */}
          <View style={styles.roomsHistoryContainer}>
            {/* TODO: Not implemented yet */}
            <TouchableOpacity style={[styles.roomsHistoryButton, { opacity: 0 }]}>
              <Text style={styles.roomsHistoryText}>Rooms history</Text>
            </TouchableOpacity>
          </View>

          {/* User Profile Section */}
          <View style={styles.profileSection}>
            <View style={styles.profileInfo}>
              <Image
                source={avatars[userProfile.avatar]}
                style={styles.profileImage}
              />
              <View style={{ justifyContent: 'center', alignItems: 'center', gap: 5, width: '50%' }}>
                <Text style={styles.profileNickname}>{userProfile.nickname}</Text>
                <VioletButton title="Change" onPress={() => setChangeUserModalVisible(true)} />
              </View>
            </View>
            <View style={styles.profileStats}>
              <View style={styles.coinDisplay}>
                <Text style={styles.coinAmount}>100</Text>
                <Text style={styles.coinLabel}>coins</Text>
              </View>
              <VioletButton title="Shop" onPress={() => setShopModalVisible(true)} />
            </View>
          </View>

          <ShopModal visible={shopModalVisible} onClose={() => setShopModalVisible(false)} />
          {changeUserModalVisible && <ChangeUserModal
            user={userProfile}
            visible={changeUserModalVisible}
            onConfirm={(newUserProfile) => {
              setChangeUserModalVisible(false);
              setUserProfile(newUserProfile);
            }}
            onCancel={() => setChangeUserModalVisible(false)}
          />}
          <RoomCreateModal
            visible={createRoomModalVisible}
            onConfirm={() => {
              setCreateRoomModalVisible(false);
              router.navigate({ pathname: '/munchkin' });
            }}
            onCancel={() => setCreateRoomModalVisible(false)}
            game="Munchkin"
          />
          <RoomJoinModal
            visible={joinRoomModalVisible}
            onClose={() => setJoinRoomModalVisible(false)}
            onJoin={(roomName) => {
              router.navigate({ pathname: `./munchkin`, params: { roomId: roomName } });
            }}
            game="Munchkin"
          />
        </View >
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'stretch',
    height: '100%',
    backgroundColor: '#4C4545',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  mainContent: {
    alignSelf: 'stretch',
    flex: 1,
    paddingHorizontal: 5,
    paddingVertical: 10,
    backgroundColor: '#3C3636',
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    height: '100%',
    gap: 10,
  },
  gameCard: {
    alignSelf: 'stretch',
    padding: 10,
    backgroundColor: '#473F3F',
    borderRadius: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gameTitle: {
    height: 80,
    paddingHorizontal: 10,
    paddingVertical: 20,
    backgroundColor: '#3C3636',
    borderRadius: 5,
    width: '45%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gameTitleText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 28,
    fontFamily: 'Roboto',
    fontWeight: '400',
  },
  gameActions: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    flexDirection: 'row',
  },
  actionButton: {
    minWidth: 80,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#3C3636',
    borderRadius: 5,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 5,
  },
  actionButtonLabel: {
    alignSelf: 'stretch',
    textAlign: 'center',
    color: '#D4C26E',
    fontSize: 24,
    fontFamily: 'Roboto',
    fontWeight: '400',
  },
  actionButtonCost: {
    alignSelf: 'stretch',
    textAlign: 'center',
    color: 'white',
    fontSize: 11,
    fontFamily: 'Roboto',
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  roomsHistoryContainer: {
    alignSelf: 'stretch',
    padding: 10,
    backgroundColor: '#3C3636',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
  },
  roomsHistoryButton: {
    paddingHorizontal: 21,
    paddingVertical: 7,
    backgroundColor: '#4B4B4B',
    borderRadius: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomsHistoryText: {
    textAlign: 'center',
    color: 'white',
    fontSize: 32,
    fontFamily: 'Roboto',
    fontWeight: '400',
  },
  profileSection: {
    height: 100,
    width: '100%',
    paddingHorizontal: 20,
    paddingVertical: 5,
    backgroundColor: '#544C4C',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  profileInfo: {
    height: 75,
    maxWidth: '60%',
    paddingVertical: 5,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  profileImage: {
    position: 'relative',
    width: 75,
    height: 75,
    borderRadius: 75,
  },
  profileNickname: {
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontFamily: 'Roboto',
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  profileStats: {
    paddingHorizontal: 10,
    paddingVertical: 0,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  coinDisplay: {
    width: 50,
    height: 39,
    flexDirection: 'column',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  coinAmount: {
    alignSelf: 'stretch',
    textAlign: 'center',
    color: 'white',
    fontSize: 16,
    fontFamily: 'Roboto',
    fontWeight: '500',
    letterSpacing: 0.15,
  },
  coinLabel: {
    alignSelf: 'stretch',
    textAlign: 'center',
    color: 'white',
    fontSize: 17,
    fontFamily: 'Arial',
    fontWeight: '400',
  },

});