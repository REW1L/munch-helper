import React from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

import { useLanguage } from '@/hooks/useLanguage';
import { SUPPORTED_LANGUAGES, type LanguageCode } from '@/i18n/languages';

/**
 * Lists every supported language by its endonym and lets the user switch. The
 * active language is visually indicated; selecting one applies immediately (no
 * restart) and persists the choice via the language context.
 */
export default function LanguageSelector() {
  const { t } = useTranslation();
  const { language, setLanguage } = useLanguage();

  const handleSelect = (code: LanguageCode) => {
    if (code === language) {
      return;
    }
    void setLanguage(code);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{t('language.label')}</Text>
      <View style={styles.options}>
        {SUPPORTED_LANGUAGES.map((entry) => {
          const isActive = entry.code === language;
          return (
            <TouchableOpacity
              key={entry.code}
              accessibilityRole="button"
              accessibilityState={{ selected: isActive }}
              accessibilityLabel={entry.name}
              onPress={() => handleSelect(entry.code)}
              style={[styles.option, isActive && styles.optionActive]}
              testID={`language-option-${entry.code}`}
            >
              <Text style={[styles.optionText, isActive && styles.optionTextActive]}>
                {entry.name}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    paddingHorizontal: 5,
  },
  label: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '500',
    lineHeight: 24,
    fontFamily: 'Roboto',
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: '#484848',
    backgroundColor: '#DFDFDF',
  },
  optionActive: {
    backgroundColor: '#CEB464',
    borderColor: '#796834',
  },
  optionText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '500',
    fontFamily: 'Roboto',
  },
  optionTextActive: {
    color: '#2A2424',
    fontWeight: '700',
  },
});
