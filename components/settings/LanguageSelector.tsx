import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { saveLanguage, getAvailableLanguages } from '@/lib/i18n/config';

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
      <Text style={styles.title}>{t('settings.language')}</Text>
      <Text style={styles.subtitle}>{t('settings.selectLanguage')}</Text>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#f25842" />
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
                <Ionicons name="checkmark-circle" size={24} color="#f25842" />
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
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  loadingContainer: {
    paddingVertical: 8,
    alignItems: 'center',
  },
  languagesList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  languageItemSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#f25842',
    borderWidth: 2,
  },
  languageInfo: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  languageNameSelected: {
    color: '#f25842',
  },
  languageNative: {
    fontSize: 14,
    color: '#6b7280',
  },
  languageNativeSelected: {
    color: '#991b1b',
  },
});

