import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { saveLanguage, getAvailableLanguages } from '@/lib/i18n/config';
import { pastelDesignSystem } from '@/lib/pastel-design-system';
const { colors: pastelColors, surfaces, elevation, spacing, borderRadius } = pastelDesignSystem;

export const LanguageSelector: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState(i18n.language);
  const languages = getAvailableLanguages();

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === currentLanguage) return;

    try {
      setLoading(true);
      await saveLanguage(languageCode);
      setCurrentLanguage(languageCode);
    } catch (error) {
      console.error('Error changing language:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={pastelColors.primary[500]} />
        </View>
      )}

      <ScrollView style={styles.languagesList} showsVerticalScrollIndicator={false}>
        {languages.map((lang) => {
          const isSelected = currentLanguage === lang.code;
          return (
            <Pressable
              key={lang.code}
              style={[
                styles.languageItem,
                isSelected && styles.languageItemSelected,
              ]}
              onPress={() => handleLanguageChange(lang.code)}
            >
              <View style={styles.languageInfo}>
                <Text style={[styles.languageName, isSelected && styles.languageNameSelected]}>
                  {lang.name}
                </Text>
                <Text style={[styles.languageNative, isSelected && styles.languageNativeSelected]}>
                  {lang.nativeName}
                </Text>
              </View>
              {isSelected && (
                <Ionicons name="checkmark-circle" size={24} color={pastelColors.primary[500]} />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent', // Remove white background
  },
  loadingContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  languagesList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg, // 16px
    marginHorizontal: spacing.md, // 12px
    marginBottom: spacing.sm, // 8px
    backgroundColor: pastelColors.primary[100], // Light teal #E0FBFB
    borderRadius: borderRadius.lg, // 16px
    ...elevation.level2, // Subtle shadow
  },
  languageItemSelected: {
    backgroundColor: pastelColors.primary[200], // Slightly darker teal when selected
    ...elevation.level3, // More prominent shadow when selected
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: surfaces.onSurface,
    marginBottom: spacing.xs, // 4px
  },
  languageNameSelected: {
    color: pastelColors.primary[700], // Darker teal for selected
  },
  languageNative: {
    fontSize: 14,
    color: surfaces.onSurfaceVariant,
  },
  languageNativeSelected: {
    color: pastelColors.primary[600], // Medium teal for selected
  },
});

