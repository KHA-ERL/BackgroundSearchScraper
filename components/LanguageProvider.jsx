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
    let mounted = true;

    async function hydrateLanguage() {
      let stored = null;
      try {
        const res = await fetch("/api/user_preferences/?key=language", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          stored = data.value;
        }
      } catch (_) {}

      if (!stored && typeof window !== "undefined") {
        stored = localStorage.getItem("sg_lang");
      }

      if (mounted && stored && translations[stored]) setLangState(stored);
    }

    hydrateLanguage();
    return () => { mounted = false; };
  }, []);

  function setLang(code) {
    if (!translations[code]) return;
    setLangState(code);
    localStorage.setItem("sg_lang", code);
    fetch("/api/user_preferences/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "language", value: code }),
    }).catch(() => {});
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
