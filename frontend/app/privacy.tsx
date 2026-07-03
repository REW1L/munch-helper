import React from 'react';
import { Stack } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { PRIVACY_EFFECTIVE_DATE, SUPPORT_EMAIL } from '@/constants/releaseContent';
import { useLocalization } from '@/i18n';

export default function PrivacyPolicyPage() {
  const { t } = useLocalization();

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={styles.safeArea}
        edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}
      >
        <Stack.Screen options={{ title: t('privacy.title') }} />

        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.title}>{t('privacy.title')}</Text>
          <Text style={styles.meta}>{t('privacy.effectiveDate', { date: PRIVACY_EFFECTIVE_DATE })}</Text>

          <PolicySection
            title={t('privacy.section1Title')}
            body={t('privacy.section1Body')}
          />

          <PolicySection
            title={t('privacy.section2Title')}
            body={t('privacy.section2Body')}
          />

          <PolicySection
            title={t('privacy.section3Title')}
            body={t('privacy.section3Body')}
          />

          <PolicySection
            title={t('privacy.section4Title')}
            body={t('privacy.section4Body')}
          />

          <PolicySection
            title={t('privacy.section5Title')}
            body={t('privacy.section5Body')}
          />

          <PolicySection
            title={t('privacy.section6Title')}
            body={t('privacy.section6Body')}
          />

          <PolicySection
            title={t('privacy.section7Title')}
            body={t('privacy.section7Body')}
          />

          <PolicySection
            title={t('privacy.section8Title')}
            body={t('privacy.section8Body')}
          />

          <PolicySection
            title={t('privacy.section9Title')}
            body={t('privacy.section9Body')}
          />

          <PolicySection
            title={t('privacy.section10Title')}
            body={t('privacy.section10Body')}
          />

          <PolicySection
            title={t('privacy.section11Title')}
            body={t('privacy.section11Body')}
          />

          <PolicySection
            title={t('privacy.section12Title')}
            body={t('privacy.section12Body')}
          />

          <View style={styles.contactCard}>
            <Text style={styles.contactTitle}>{t('privacy.contact')}</Text>
            <Text style={styles.contactText}>{t('privacy.contactText', { email: SUPPORT_EMAIL })}</Text>
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
