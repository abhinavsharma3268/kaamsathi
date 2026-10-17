"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { t as translate, type Lang } from "@/lib/i18n";
import { loadLang, saveLang } from "@/lib/storage";

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string) => string;
  ready: boolean;
};

const LanguageContext = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setLangState(loadLang());
    setReady(true);
  }, []);

  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = lang;
    }
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    saveLang(l);
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: string) => translate(lang, key),
      ready,
    }),
    [lang, setLang, ready],
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
