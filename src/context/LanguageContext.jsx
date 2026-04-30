import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { translations, availableLanguages } from '../i18n/translations';

const LanguageContext = createContext(null);

export function LanguageProvider({ children }) {
  // Get saved language from localStorage or default to Italian
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('kmark-language');
      if (saved && translations[saved]) return saved;
    }
    return 'it';
  });

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('kmark-language', currentLanguage);
  }, [currentLanguage]);

  // Translation function
  const t = useCallback(
    (keyPath) => {
      const keys = keyPath.split('.');
      let value = translations[currentLanguage];
      
      for (const key of keys) {
        if (value && typeof value === 'object' && key in value) {
          value = value[key];
        } else {
          // Fallback to Italian if translation not found
          let fallback = translations['it'];
          for (const k of keys) {
            if (fallback && typeof fallback === 'object' && k in fallback) {
              fallback = fallback[k];
            } else {
              return keyPath; // Return key path as last resort
            }
          }
          return fallback;
        }
      }
      
      return value || keyPath;
    },
    [currentLanguage]
  );

  const setLanguage = useCallback((langCode) => {
    if (translations[langCode]) {
      setCurrentLanguage(langCode);
    }
  }, []);

  const value = {
    currentLanguage,
    setLanguage,
    t,
    availableLanguages,
    currentLanguageInfo: availableLanguages.find(l => l.code === currentLanguage)
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
