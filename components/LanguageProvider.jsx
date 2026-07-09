"use client";
import { createContext, useContext, useState, useEffect } from "react";
import { translations } from "../lib/i18n";

const LangContext = createContext({
  lang: "en",
  setLang: () => {},
  t: (key) => key,
});

export function LanguageProvider({ children }) {
  const [lang, setLangState] = useState("en");

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sg_lang") : null;
    if (stored && translations[stored]) setLangState(stored);
  }, []);

  function setLang(code) {
    if (!translations[code]) return;
    setLangState(code);
    localStorage.setItem("sg_lang", code);
  }

  function t(key) {
    return translations[lang]?.[key] ?? translations.en?.[key] ?? key;
  }

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export const useLanguage = () => useContext(LangContext);
