"use client";
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  // Read stored preference and apply immediately
  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sg_theme") : null;
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = stored === "dark" || (!stored && prefersDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
      setDark(true);
    }
  }, []);

  function toggle() {
    setDark((d) => {
      const next = !d;
      if (next) {
        document.documentElement.classList.add("dark");
        localStorage.setItem("sg_theme", "dark");
      } else {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("sg_theme", "light");
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ dark, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);

