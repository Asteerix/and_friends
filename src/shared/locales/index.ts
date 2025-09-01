import * as Localization from 'expo-localization';
import en from './en-extended.json';
import fr from './fr-extended.json';

const translations: Record<string, Record<string, string>> = {
  en,
  fr,
};

export function getDeviceLanguage(): 'fr' | 'en' {
  const locales = Localization.getLocales();
  const locale = locales?.[0]?.languageCode || 'en';
  if (locale.startsWith('fr')) return 'fr';
  return 'en';
}
export function t(
  key: string,
  lang?: 'fr' | 'en',
  variables?: Record<string, string | number>
): string {
  const language = lang || getDeviceLanguage();
  let translation = translations[language]?.[key] || translations['en']?.[key] || key;

  if (variables) {
    Object.keys(variables).forEach((variableName) => {
      const regex = new RegExp(`{{${variableName}}}`, 'g');
      translation = translation.replace(regex, String(variables[variableName]));
    });
  }
  return translation;
}
