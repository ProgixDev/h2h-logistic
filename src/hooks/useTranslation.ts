import { useCallback, useState } from 'react';
import { fr, type TranslationKeys } from '@/i18n/fr';
import { en } from '@/i18n/en';

type Language = 'fr' | 'en';

const translations: Record<Language, TranslationKeys> = { fr, en };

let currentLanguage: Language = 'fr';

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string ? (T[K] extends string ? K : `${K}.${NestedKeyOf<T[K]>}`) : never }[keyof T]
  : never;

type TranslationKey = NestedKeyOf<TranslationKeys>;

function getNestedValue(obj: unknown, path: string): string {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return path;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : path;
}

export function useTranslation() {
  const [lang, setLang] = useState<Language>(currentLanguage);

  const t = useCallback(
    (key: TranslationKey): string => {
      return getNestedValue(translations[lang], key);
    },
    [lang],
  );

  const changeLanguage = useCallback((newLang: Language) => {
    currentLanguage = newLang;
    setLang(newLang);
  }, []);

  return { t, lang, changeLanguage };
}
