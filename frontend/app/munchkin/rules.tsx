import { AppTheme } from '@/constants/theme';
import { Stack } from 'expo-router';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export const OFFICIAL_MUNCHKIN_RULES_URL =
  'https://munchkin.game/site-munchkin/assets/files/1138/munchkin_rules-1.pdf';

const RULE_SECTIONS = [
  ['goalTitle', 'goalBody'],
  ['setupTitle', 'setupBody'],
  ['turnTitle', 'turnBody'],
  ['charactersTitle', 'charactersBody'],
  ['combatTitle', 'combatBody'],
  ['itemsTitle', 'itemsBody'],
  ['helpTitle', 'helpBody'],
  ['escapeTitle', 'escapeBody'],
  ['cursesTitle', 'cursesBody'],
  ['priorityTitle', 'priorityBody'],
] as const;

export default function MunchkinRulesPage() {
  const { t } = useTranslation();
  const scrollViewRef = useRef<ScrollView>(null);

  const openOfficialRules = async () => {
    try {
      await Linking.openURL(OFFICIAL_MUNCHKIN_RULES_URL);
    } catch (error) {
      console.warn('Failed to open official Munchkin rules', error);
    }
  };

  return (
    <SafeAreaView
      style={styles.safeArea}
      edges={Platform.OS === 'ios' ? [] : ['top', 'bottom', 'left', 'right']}
    >
      <Stack.Screen options={{ title: t('gameRules.screenTitle') }} />

      <ScrollView
        ref={scrollViewRef}
        testID="munchkin-rules-scroll"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator
      >
        <Text accessibilityRole="header" aria-level={1} style={styles.title}>
          {t('gameRules.title')}
        </Text>
        <Text style={styles.description}>{t('gameRules.description')}</Text>
        <View style={styles.notice}>
          <Text style={styles.noticeText}>{t('gameRules.summaryNotice')}</Text>
        </View>
        <TouchableOpacity
          accessibilityRole="link"
          onPress={() => scrollViewRef.current?.scrollToEnd({ animated: false })}
          style={styles.jumpLink}
          testID="jump-to-official-rules-source"
        >
          <Text style={styles.jumpLinkText}>{t('gameRules.sourceIntro')}</Text>
        </TouchableOpacity>

        {RULE_SECTIONS.map(([titleKey, bodyKey]) => (
          <View key={titleKey} style={styles.section}>
            <Text accessibilityRole="header" aria-level={2} style={styles.sectionTitle}>
              {t(`gameRules.${titleKey}`)}
            </Text>
            <Text style={styles.sectionBody}>{t(`gameRules.${bodyKey}`)}</Text>
          </View>
        ))}

        <View style={styles.sourceCard}>
          <Text accessibilityRole="header" aria-level={2} style={styles.sourceTitle}>
            {t('gameRules.sourceIntro')}
          </Text>
          <TouchableOpacity
            accessibilityLabel={t('gameRules.sourceA11y')}
            accessibilityRole="link"
            onPress={openOfficialRules}
            style={styles.sourceLink}
            testID="official-rules-source"
          >
            <Text style={styles.sourceLinkText}>{t('gameRules.sourceLabel')}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: AppTheme.colors.background,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: AppTheme.spacing.xl,
    paddingVertical: AppTheme.spacing.xl,
    gap: AppTheme.spacing.lg,
  },
  title: {
    color: AppTheme.colors.accent,
    fontSize: 32,
    fontFamily: 'Roboto',
    fontWeight: '700',
    lineHeight: 38,
  },
  description: {
    color: AppTheme.colors.textPrimary,
    fontSize: 17,
    fontFamily: 'Roboto',
    lineHeight: 25,
  },
  notice: {
    backgroundColor: AppTheme.colors.surface,
    borderColor: AppTheme.colors.accent,
    borderLeftWidth: 4,
    borderRadius: AppTheme.radius.md,
    padding: AppTheme.spacing.lg,
  },
  noticeText: {
    color: AppTheme.colors.textAccentSoft,
    fontSize: 15,
    fontFamily: 'Roboto',
    lineHeight: 22,
  },
  jumpLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  jumpLinkText: {
    color: AppTheme.colors.accent,
    fontSize: 15,
    fontFamily: 'Roboto',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  section: {
    gap: AppTheme.spacing.sm,
  },
  sectionTitle: {
    color: AppTheme.colors.textAccentSoft,
    fontSize: 21,
    fontFamily: 'Roboto',
    fontWeight: '700',
    lineHeight: 27,
  },
  sectionBody: {
    color: AppTheme.colors.textPrimary,
    fontSize: 15,
    fontFamily: 'Roboto',
    lineHeight: 23,
    opacity: 0.92,
  },
  sourceCard: {
    backgroundColor: AppTheme.colors.surface,
    borderRadius: AppTheme.radius.lg,
    gap: AppTheme.spacing.sm,
    marginTop: AppTheme.spacing.sm,
    padding: AppTheme.spacing.lg,
  },
  sourceTitle: {
    color: AppTheme.colors.textPrimary,
    fontSize: 17,
    fontFamily: 'Roboto',
    fontWeight: '700',
  },
  sourceLink: {
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  sourceLinkText: {
    color: AppTheme.colors.accent,
    fontSize: 16,
    fontFamily: 'Roboto',
    fontWeight: '600',
    lineHeight: 22,
    textDecorationLine: 'underline',
  },
});
