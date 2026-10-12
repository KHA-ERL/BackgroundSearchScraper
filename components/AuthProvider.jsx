"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  completeGoogleRedirectSignIn,
  isFirebaseConfigured,
  signInWithGoogle,
  signOutFromGoogle,
} from "@/lib/client/firebaseAuth";

const AuthContext = createContext(null);

async function readJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Authentication request failed.");
  return data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch("/api/auth/session/", { cache: "no-store" }).then(readJson);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh().catch(() => setLoading(false));
  }, [refresh]);

  const loginWithFirebaseToken = useCallback(async (idToken) => {
    const data = await fetch("/api/auth/session/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "firebase", idToken }),
    }).then(readJson);
    setUser(data);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function finishRedirectLogin() {
      if (!isFirebaseConfigured()) return;
      try {
        const idToken = await completeGoogleRedirectSignIn();
        if (!idToken || cancelled) return;
        await loginWithFirebaseToken(idToken);
      } catch {}
    }
    finishRedirectLogin();
    return () => {
      cancelled = true;
    };
  }, [loginWithFirebaseToken]);

  const loginPassword = useCallback(async ({ username, password }) => {
    const data = await fetch("/api/auth/session/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "password", action: "login", username, password }),
    }).then(readJson);
    setUser(data);
    return data;
  }, []);

  const registerPassword = useCallback(async ({ username, email, displayName, password }) => {
    const data = await fetch("/api/auth/session/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "password", action: "register", username, email, displayName, password }),
    }).then(readJson);
    setUser(data);
    return data;
  }, []);

  const loginGoogle = useCallback(async () => {
    const idToken = await signInWithGoogle();
    return loginWithFirebaseToken(idToken);
  }, [loginWithFirebaseToken]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/session/", { method: "DELETE" }).then(readJson);
    await signOutFromGoogle().catch(() => {});
    const data = await refresh();
    setUser(data);
    return data;
  }, [refresh]);

  const value = useMemo(() => ({
    user,
    loading,
    firebaseConfigured: isFirebaseConfigured(),
    loginPassword,
    registerPassword,
    loginGoogle,
    logout,
    refresh,
  }), [user, loading, loginPassword, registerPassword, loginGoogle, logout, refresh]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider.");
  return ctx;
}
