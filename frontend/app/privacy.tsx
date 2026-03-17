import { Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const EFFECTIVE_DATE = 'March 17, 2026';
const SUPPORT_EMAIL = 'ivan.danilov.work@gmail.com';

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
          <Text style={styles.meta}>Effective date: {EFFECTIVE_DATE}</Text>

          <PolicySection
            title="1. Overview"
            body="Munch Helper is a companion app for tabletop games like Munchkin. This policy explains what information is processed when you use the app and how it is used."
          />

          <PolicySection
            title="2. Information We Process"
            body="The app processes player profile and gameplay information that you create, including your nickname, avatar selection, room participation, and character/game stats such as level, power, class, race, gender, and color settings."
          />

          <PolicySection
            title="3. Local Device Storage"
            body="To keep your experience consistent, the app stores your user profile (user ID, nickname, avatar) locally on your device using app storage. This data is used to restore your session between launches."
          />

          <PolicySection
            title="4. Server Communication"
            body="The app sends and retrieves profile, room, and character data through backend APIs and uses WebSocket connections for real-time game updates between players in the same room."
          />

          <PolicySection
            title="5. Why Data Is Used"
            body="Data is used only to operate core features: creating player profiles, creating/joining rooms, synchronizing game state, and maintaining a stable multiplayer experience."
          />

          <PolicySection
            title="6. Data Sharing"
            body="Your gameplay and profile data is visible to other players in rooms you join so multiplayer features can function. Data is not sold."
          />

          <PolicySection
            title="7. Children"
            body="Munch Helper is not directed to children under 13. If you believe a child has provided personal information, contact support and request deletion."
          />

          <PolicySection
            title="8. Security"
            body="Reasonable technical measures are used to protect data in storage and transit. However, no method of transmission or storage can be guaranteed as completely secure."
          />

          <PolicySection
            title="9. Data Retention and Deletion"
            body="Local profile data remains on your device until you clear app data or uninstall the app. Server-side data may be retained as needed to operate and maintain the service. You can contact support to request data deletion assistance."
          />

          <PolicySection
            title="10. International Use"
            body="By using the app, you understand that data may be processed in infrastructure regions selected by the service operator."
          />

          <PolicySection
            title="11. Changes to This Policy"
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
