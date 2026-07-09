"use client";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useTheme } from "./ThemeProvider";
import { useLanguage } from "./LanguageProvider";
import { LANGUAGES } from "../lib/i18n";

export default function Header({ onMenuToggle }) {
  const pathname = usePathname();
  const router = useRouter();
  const { dark, toggle: toggleDark } = useTheme();
  const { lang, setLang, t } = useLanguage();

  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const notifRef = useRef(null);
  const langRef = useRef(null);

  const segments = pathname?.split("/").filter(Boolean) || [];
  const last = segments[segments.length - 1] || "home";
  const pageKey = `page.${last.replace(/-/g, "_")}`;
  const fallbackTitle = last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const translatedTitle = t(pageKey);
  // t() returns the key if not found — fall back to auto-cased slug
  const title = translatedTitle === pageKey ? fallbackTitle : translatedTitle;

  // Close both dropdowns on outside click
  useEffect(() => {
    function handleOutside(e) {
      if (notifRef.current && !notifRef.current.contains(e.target)) setNotifOpen(false);
      if (langRef.current && !langRef.current.contains(e.target)) setLangOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const currentLang = LANGUAGES.find((l) => l.code === lang) || LANGUAGES[0];

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-bgdark border-b border-gray-200 dark:border-white/10 px-4 md:px-6 py-3 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1.5 rounded-md text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
          aria-label="Toggle menu"
        >
          <i className="ri-menu-line text-xl" />
        </button>
        <div>
          <p className="text-xs text-gray-400 dark:text-gray-500 hidden sm:block">{t("header.dashboard")}</p>
          <h1 className="text-sm sm:text-base font-semibold text-gray-800 dark:text-white">{title}</h1>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2 text-gray-500 dark:text-gray-400">

        {/* Dark Mode Toggle */}
        <button
          onClick={toggleDark}
          className="p-1.5 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-md transition-colors"
          title={dark ? t("header.switch_light") : t("header.switch_dark")}
        >
          <i className={`text-lg sm:text-xl ${dark ? "ri-sun-line" : "ri-moon-line"}`} />
        </button>

        {/* Language Picker */}
        <div ref={langRef} className="relative">
          <button
            onClick={() => setLangOpen((o) => !o)}
            className="p-1.5 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-md transition-colors flex items-center gap-1"
            title={t("header.language")}
          >
            <span className="text-base leading-none">{currentLang.flag}</span>
            <i className="ri-arrow-down-s-line text-xs hidden sm:block" />
          </button>

          {langOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-bgdark shadow-lg rounded-lg border border-gray-100 dark:border-white/10 z-50 py-1">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 px-3 py-1.5">
                {t("header.language")}
              </p>
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  onClick={() => { setLang(l.code); setLangOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-sm transition-colors ${
                    lang === l.code
                      ? "bg-sky-50 dark:bg-sky-900/40 text-sky-600 dark:text-sky-400 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="text-base leading-none">{l.flag}</span>
                  <span>{l.label}</span>
                  {lang === l.code && <i className="ri-check-line ml-auto text-sky-500 text-xs" />}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notification Bell */}
        <div ref={notifRef} className="relative">
          <button
            onClick={() => setNotifOpen((o) => !o)}
            className="p-1.5 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-md transition-colors"
            title={t("header.notifications")}
          >
            <i className="ri-notification-3-line text-lg sm:text-xl" />
          </button>

          {notifOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-bgdark shadow-lg rounded-lg border border-gray-100 dark:border-white/10 z-50">
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-white/10">
                <span className="text-sm font-semibold text-gray-800 dark:text-white">
                  {t("header.notifications")}
                </span>
                <button
                  onClick={() => setNotifOpen(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                >
                  <i className="ri-close-line text-base" />
                </button>
              </div>
              <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                <i className="ri-notification-off-line text-3xl text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-500 dark:text-gray-400">{t("header.no_notif")}</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{t("header.caught_up")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Settings Gear → Profile page */}
        <button
          onClick={() => router.push("/dashboard/profile")}
          className="p-1.5 hover:text-sky-500 hover:bg-sky-50 dark:hover:bg-sky-900/30 rounded-md transition-colors"
          title={t("header.settings")}
        >
          <i className="ri-settings-3-line text-lg sm:text-xl" />
        </button>

        {/* Profile Avatar → Profile page */}
        <button
          onClick={() => router.push("/dashboard/profile")}
          className="w-8 h-8 rounded-full bg-sky-500 flex items-center justify-center text-white text-sm font-semibold hover:bg-sky-600 transition-colors"
          title={t("header.profile")}
        >
          U
        </button>
      </div>
    </header>
  );
}
