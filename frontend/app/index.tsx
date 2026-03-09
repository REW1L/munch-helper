import { router, Stack } from 'expo-router';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

export default function LandingPage() {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={{
        flex: 1,
        backgroundColor: "#121212",
      }} edges={Platform.OS === "ios" ? [] : ["top", "bottom", "left", "right"]}>
        <Stack.Screen options={{ title: 'Tabletop Helper', headerShown: false }} />
        <View style={styles.container}>
          <View style={styles.heroSection}>
            <Text style={styles.title}>Tabletop Helper</Text>
            <Text style={styles.subtitle}>Your companion for tabletop games</Text>
            <Text style={styles.description}>
              Join or create game rooms, manage your profile, and enjoy classic tabletop games like Munchkin — all in one place.
            </Text>
          </View>
          <View style={styles.actionsSection}>
            <TouchableOpacity style={styles.roomsButton} onPress={() => router.navigate('/rooms')}>
              <Text style={styles.roomsButtonText}>Rooms</Text>
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
});