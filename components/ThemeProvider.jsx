"use client";
import { createContext, useContext, useState, useEffect } from "react";

const ThemeContext = createContext({ dark: false, toggle: () => {} });

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(false);

  // Read stored preference and apply immediately
  useEffect(() => {
    let mounted = true;

    async function hydrateTheme() {
      let stored = null;
      try {
        const res = await fetch("/api/user_preferences/?key=theme", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          stored = data.value;
        }
      } catch (_) {}

      if (!stored && typeof window !== "undefined") {
        stored = localStorage.getItem("sg_theme");
      }

      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const shouldBeDark = stored === "dark" || (!stored && prefersDark);
      if (!mounted) return;
      document.documentElement.classList.toggle("dark", shouldBeDark);
      setDark(shouldBeDark);
    }

    hydrateTheme();
    return () => { mounted = false; };
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
      fetch("/api/user_preferences/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "theme", value: next ? "dark" : "light" }),
      }).catch(() => {});
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
