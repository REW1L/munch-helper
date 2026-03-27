import React from 'react';
import { router, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { Linking, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const STORE_LINKS = {
  ios: 'https://apps.apple.com/us/app/munch-helper/id6760627502',
} as const;

export default function LandingPage() {
  const openAppStore = async () => {
    try {
      const canOpen = await Linking.canOpenURL(STORE_LINKS.ios);

      if (!canOpen) {
        return;
      }

      await Linking.openURL(STORE_LINKS.ios);
    } catch {
      // Intentionally swallow errors to keep landing actions stable.
    }
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={{
          flex: 1,
          backgroundColor: '#121212',
        }}
        edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}
      >
        <Stack.Screen options={{ title: 'Munch Helper', headerShown: false }} />
        <View style={styles.container}>
          <TouchableOpacity style={styles.privacyButton} onPress={() => router.navigate('/privacy')}>
            <Text style={styles.privacyButtonText}>Privacy</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.supportButton} onPress={() => router.navigate('/support')}>
            <Text style={styles.supportButtonText}>Support</Text>
          </TouchableOpacity>

          <View style={styles.heroSection}>
            <Text style={styles.title}>Munch Helper</Text>
            <Text style={styles.subtitle}>Your companion for board games like Munchkin</Text>
            <Text style={styles.description}>
              Create game rooms with your friends, manage characters in games, and forget about remembering and recalculating stats.
            </Text>
          </View>

          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.roomsButton} onPress={() => router.navigate('/rooms')}>
              <Text style={styles.roomsButtonText}>Rooms</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.storeLinksSection}>
            <TouchableOpacity style={styles.storeLinkButton} onPress={openAppStore} accessibilityLabel="App Store">
              <Image
                source={require('../assets/images/Download_on_the_App_Store_Badge_US-UK_RGB_blk_092917.svg')}
                style={styles.appStoreBadge}
                contentFit="contain"
                accessibilityLabel="App Store badge"
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.storeLinkButton, styles.disabledStoreLinkButton]}
              disabled
              accessibilityLabel="Google Play"
            >
              <Text style={styles.playSoonNote}>soon</Text>
              <Image
                source={require('../assets/images/GetItOnGooglePlay_Badge_Web_color_English.svg')}
                style={styles.playStoreBadge}
                contentFit="contain"
                accessibilityLabel="Google Play badge"
              />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3C3636',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    gap: 40,
  },
  heroSection: {
    alignItems: 'center',
    gap: 15,
  },
  title: {
    color: '#D4C26E',
    fontSize: 40,
    fontFamily: 'Roboto',
    fontWeight: '700',
    textAlign: 'center',
  },
  subtitle: {
    color: 'white',
    fontSize: 18,
    fontFamily: 'Roboto',
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.85,
  },
  description: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Roboto',
    fontWeight: '400',
    textAlign: 'center',
    opacity: 0.65,
    lineHeight: 22,
  },
  actionsSection: {
    alignItems: 'center',
  },
  roomsButton: {
    paddingHorizontal: 50,
    paddingVertical: 14,
    backgroundColor: '#473F3F',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  roomsButtonText: {
    color: '#D4C26E',
    fontSize: 28,
    fontFamily: 'Roboto',
    fontWeight: '500',
  },
  supportButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supportButtonText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 18,
    fontFamily: 'Roboto',
    fontWeight: '400',
  },
  privacyButton: {
    position: 'absolute',
    top: 16,
    left: 20,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'transparent',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  privacyButtonText: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontSize: 18,
    fontFamily: 'Roboto',
    fontWeight: '400',
  },
  storeLinksSection: {
    position: 'absolute',
    bottom: 28,
    left: 30,
    right: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  storeLinkButton: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appStoreBadge: {
    width: 120,
    minHeight: 40,
    height: 40,
  },
  disabledStoreLinkButton: {
    opacity: 0.6,
    overflow: 'visible',
  },
  playStoreBadge: {
    width: 135,
    minHeight: 40,
    height: 40,
  },
  playSoonNote: {
    position: 'absolute',
    top: -14,
    color: '#D4C26E',
    fontSize: 12,
    fontFamily: 'Roboto',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
});
