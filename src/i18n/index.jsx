import { useState, useEffect, createContext, useContext } from 'react';
import en from './en.json';
import ta from './ta.json';
import hi from './hi.json';
import { getLanguage, setLanguage as saveLanguageToStorage } from '../core/storage/index.js';

const translations = { en, ta, hi };

const LanguageContext = createContext();

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('en');

  useEffect(() => {
    getLanguage().then((savedLang) => {
      if (savedLang && translations[savedLang]) {
        setLang(savedLang);
      }
    });
  }, []);

  async function changeLanguage(newLang) {
    if (translations[newLang]) {
      setLang(newLang);
      await saveLanguageToStorage(newLang);
    }
  }

  const strings = translations[lang] || en;

  return (
    <LanguageContext.Provider value={{ lang, setLanguage: changeLanguage, strings }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    return { lang: 'en', setLanguage: () => {}, strings: en };
  }
  return context;
}

// Proxy object so existing imports (`import strings from '../i18n/en.json'`) 
// or `import strings from '../i18n/index.js'` work seamlessly or fall back to en.
export default en;
