import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

import enGB from './locales/en-GB.json';
import ptBR from './locales/pt-BR.json';
import esES from './locales/es-ES.json';

const normalizeLanguage = (lng) => {
  if (!lng) return 'en-GB';

  const value = lng.toLowerCase();

  if (value.startsWith('pt')) return 'pt-BR';
  if (value.startsWith('es')) return 'es-ES';
  return 'en-GB';
};

const browserLanguage = normalizeLanguage(navigator.language);

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'en-GB': { translation: enGB },
      'pt-BR': { translation: ptBR },
      'es-ES': { translation: esES }
    },
    fallbackLng: 'en-GB',
    lng: browserLanguage,
    interpolation: {
      escapeValue: false
    },
    detection: {
      order: ['navigator', 'localStorage', 'htmlTag'],
      caches: ['localStorage']
    }
  });

export default i18n;
