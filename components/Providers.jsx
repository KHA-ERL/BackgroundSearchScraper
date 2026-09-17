"use client";
import { useEffect } from "react";
import { ThemeProvider } from "./ThemeProvider";
import { LanguageProvider } from "./LanguageProvider";
import { ToastProvider } from "./ToastProvider";
import { AuthProvider } from "./AuthProvider";

export default function Providers({ children }) {
  useEffect(() => {
    fetch("/api/app_user/", { cache: "no-store" }).catch(() => {});
  }, []);

  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          <ToastProvider>{children}</ToastProvider>
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
