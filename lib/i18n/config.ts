import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import translation files
import en from './locales/en.json';
import ru from './locales/ru.json';
import uk from './locales/uk.json';
import bg from './locales/bg.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import it from './locales/it.json';
import pt from './locales/pt.json';
import pl from './locales/pl.json';
import tr from './locales/tr.json';
import zh from './locales/zh.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import ar from './locales/ar.json';
import hi from './locales/hi.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
  uk: { translation: uk },
  bg: { translation: bg },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  it: { translation: it },
  pt: { translation: pt },
  pl: { translation: pl },
  tr: { translation: tr },
  zh: { translation: zh },
  ja: { translation: ja },
  ko: { translation: ko },
  ar: { translation: ar },
  hi: { translation: hi },
};

const LANGUAGE_STORAGE_KEY = '@izimate_language';

// Get device locale
const getDeviceLocale = (): string => {
  try {
    // Check if Localization is available (may not be on web in some cases)
    if (typeof Localization !== 'undefined' && Localization.getLocales) {
      const locales = Localization.getLocales();
      if (locales && locales.length > 0) {
        const locale = locales[0].languageTag;
        // Extract language code (e.g., 'en-US' -> 'en')
        const langCode = locale.split('-')[0];
        // Check if we support this language
        if (resources[langCode as keyof typeof resources]) {
          return langCode;
        }
      }
    }
    // Fallback for web: use browser language
    if (typeof navigator !== 'undefined' && navigator.language) {
      const langCode = navigator.language.split('-')[0];
      if (resources[langCode as keyof typeof resources]) {
        return langCode;
      }
    }
  } catch (error) {
    console.warn('Error getting device locale:', error);
  }
  return 'en';
};

// Initialize i18n
i18n
  .use(initReactI18next)
  .init({
    resources,
    compatibilityJSON: 'v3',
    lng: 'en', // Will be set after loading from storage
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // React already escapes values
    },
  });

// Load saved language preference
export const loadLanguage = async (): Promise<string> => {
  try {
    const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (savedLanguage && resources[savedLanguage as keyof typeof resources]) {
      await i18n.changeLanguage(savedLanguage);
      return savedLanguage;
    }
    // Use device locale if no saved preference
    const deviceLang = getDeviceLocale();
    await i18n.changeLanguage(deviceLang);
    return deviceLang;
  } catch (error) {
    console.error('Error loading language:', error);
    const deviceLang = getDeviceLocale();
    await i18n.changeLanguage(deviceLang);
    return deviceLang;
  }
};

// Save language preference
export const saveLanguage = async (language: string): Promise<void> => {
  try {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    await i18n.changeLanguage(language);
  } catch (error) {
    console.error('Error saving language:', error);
  }
};

// Get available languages
export const getAvailableLanguages = () => {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'uk', name: 'Ukrainian', nativeName: 'Українська' },
    { code: 'bg', name: 'Bulgarian', nativeName: 'Български' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'pl', name: 'Polish', nativeName: 'Polski' },
    { code: 'tr', name: 'Turkish', nativeName: 'Türkçe' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
    { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
    { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  ];
};

export default i18n;

