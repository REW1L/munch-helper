import React from 'react';
import { Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { PRIVACY_EFFECTIVE_DATE, SUPPORT_EMAIL } from '@/constants/releaseContent';

export default function PrivacyPolicyPage() {
  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.safeArea}
        edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}
      >
        <Stack.Screen options={{ title: 'Privacy Policy' }} />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>Privacy Policy</Text>
          <Text style={styles.meta}>Effective date: {PRIVACY_EFFECTIVE_DATE}</Text>

          <PolicySection
            title="1. Overview"
            body="Munch Helper is a companion app for tabletop games like Munchkin. It does not require sign-up, account creation, email, password, or any third-party identity provider. The app creates an anonymous player profile so you can enter rooms and play without a traditional account."
          />

          <PolicySection
            title="2. Information We Process"
            body="The app processes the profile and gameplay information needed to run the game: your nickname, avatar selection from a fixed local image set, and a server-assigned user identifier. Character records can include name, avatar, color, level, power, class, race, and gender. Room, battle, and room history log records are also processed when those features are used."
          />

          <PolicySection
            title="3. Session Data"
            body="To restore your session between launches, the app stores your user profile locally on your device with AsyncStorage under the user key. The profile is also stored server-side so you can rejoin rooms. Characters, battles, rooms, and room history are stored server-side to keep shared gameplay state available."
          />

          <PolicySection
            title="4. Room Participation"
            body="When you join a room, your nickname, avatar, and character details become visible to other players in that same room. Room, battle, and room history log state is shared in real time with participants in the room so everyone sees the same gameplay state."
          />

          <PolicySection
            title="5. Server Communication"
            body="The app sends and retrieves profile, room, character, battle, and log data through backend APIs and uses WebSocket connections for real-time updates between players in the same room."
          />

          <PolicySection
            title="6. Why Data Is Used"
            body="Data is used only to operate core features: creating player profiles, creating and joining rooms, managing characters, running battles, showing room history, synchronizing shared game state, and maintaining a stable multiplayer experience."
          />

          <PolicySection
            title="7. Data Sharing"
            body="Your profile and gameplay data is shared only with other participants in rooms you join so multiplayer features can function. Munch Helper does not sell data and does not include third-party advertising, analytics, or tracking SDKs."
          />

          <PolicySection
            title="8. Children"
            body="Munch Helper is not directed to children and does not include children-directed features. If you believe a child has provided information through the app, contact support and request deletion assistance."
          />

          <PolicySection
            title="9. Security"
            body="Reasonable technical measures are used to protect data in storage and transit. However, no method of transmission or storage can be guaranteed as completely secure."
          />

          <PolicySection
            title="10. Data Retention and Deletion"
            body="Local profile data remains on your device until you clear app data or uninstall the app. Server-side data may be retained as needed to operate and maintain the service. You can contact support to request data deletion assistance."
          />

          <PolicySection
            title="11. International Use"
            body="By using the app, you understand that data may be processed in infrastructure regions selected by the service operator."
          />

          <PolicySection
            title="12. Changes to This Policy"
            body="This policy may be updated from time to time. Updates will be reflected by changing the effective date on this page."
          />

          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>Contact</Text>
            <Text style={styles.contactText}>
              For privacy questions or requests, email: {SUPPORT_EMAIL}
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

type PolicySectionProps = {
  title: string;
  body: string;
};

function PolicySection({ title, body }: PolicySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#121212',
  },
  content: {
    backgroundColor: '#3C3636',
    paddingHorizontal: 24,
    paddingVertical: 28,
    gap: 16,
  },
  title: {
    color: '#D4C26E',
    fontSize: 32,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  meta: {
    color: 'white',
    fontSize: 14,
    fontFamily: 'Roboto',
    fontWeight: '400',
    opacity: 0.75,
    marginBottom: 4,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    color: '#E8D98F',
    fontSize: 18,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  sectionBody: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Roboto',
    fontWeight: '400',
    opacity: 0.9,
    lineHeight: 22,
  },
  contactCard: {
    marginTop: 8,
    backgroundColor: '#473F3F',
    borderRadius: 10,
    padding: 16,
    gap: 6,
  },
  contactTitle: {
    color: '#D4C26E',
    fontSize: 18,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  contactText: {
    color: 'white',
    fontSize: 15,
    fontFamily: 'Roboto',
    fontWeight: '400',
    opacity: 0.9,
    lineHeight: 22,
  },
});
