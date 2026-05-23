import React from 'react';
import { Stack } from 'expo-router';
import { Linking, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { SUPPORT_EMAIL } from '@/constants/releaseContent';

export default function SupportPage() {
  const handleEmailPress = async () => {
    await Linking.openURL(`mailto:${SUPPORT_EMAIL}`);
  };

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.safeArea}
        edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}
      >
        <Stack.Screen options={{ title: 'Support' }} />

        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Support</Text>
          <Text style={styles.description}>
            Need help with Munch Helper rooms, characters, battles, or room history? Contact me
            without creating an account and include a short description of the issue, the room code
            if relevant, and what you expected to happen.
          </Text>

          <View style={styles.emailCard}>
            <Text style={styles.emailLabel}>Contact Email</Text>
            <TouchableOpacity
              accessibilityLabel={`Email support at ${SUPPORT_EMAIL}`}
              accessibilityRole="button"
              onPress={handleEmailPress}
              style={styles.emailButton}
            >
              <Text selectable style={styles.emailValue}>{SUPPORT_EMAIL}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  container: {
    backgroundColor: '#3C3636',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 18,
    flexGrow: 1,
  },
  title: {
    color: '#D4C26E',
    fontSize: 32,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  description: {
    color: 'white',
    fontSize: 16,
    fontFamily: 'Roboto',
    fontWeight: '400',
    opacity: 0.85,
    lineHeight: 24,
  },
  emailCard: {
    marginTop: 8,
    backgroundColor: '#473F3F',
    borderRadius: 10,
    padding: 16,
    gap: 8,
  },
  emailLabel: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: '400',
    opacity: 0.75,
  },
  emailButton: {
    alignSelf: 'flex-start',
  },
  emailValue: {
    color: '#D4C26E',
    fontSize: 18,
    fontFamily: 'Roboto',
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});
