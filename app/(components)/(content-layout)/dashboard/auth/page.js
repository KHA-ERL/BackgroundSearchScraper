"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";

export default function AuthPage() {
  const router = useRouter();
  const {
    user,
    loading,
    firebaseConfigured,
    loginPassword,
    registerPassword,
    loginGoogle,
  } = useAuth();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", email: "", displayName: "", password: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";
  const title = isRegister ? "Create account" : "Sign in";
  const activeLabel = useMemo(() => {
    if (!user?.authenticated) return "Anonymous browser profile";
    return user.display_name || user.email || "Signed in account";
  }, [user]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submitPassword(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const payload = {
        username: form.username,
        email: form.email,
        displayName: form.displayName,
        password: form.password,
      };
      if (isRegister) await registerPassword(payload);
      else await loginPassword(payload);
      router.push("/dashboard/job-portal-scraper");
      router.refresh();
    } catch (err) {
      setError(err.message || "Unable to sign in.");
    } finally {
      setBusy(false);
    }
  }

  async function submitGoogle() {
    setBusy(true);
    setError("");
    try {
      await loginGoogle();
      router.push("/dashboard/job-portal-scraper");
      router.refresh();
    } catch (err) {
      setError(err.message || "Unable to sign in with Google.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 text-gray-800 dark:text-gray-100">
      <div className="mb-6">
        <p className="text-sm text-gray-500 dark:text-gray-400">Current profile</p>
        <h2 className="text-2xl font-semibold">{activeLabel}</h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Sign in to sync your job profile, CV evidence, portfolio links, saved settings, and application drafts to your account.
        </p>
      </div>

      <div className="rounded-lg border border-gray-200 dark:border-white/10 bg-white dark:bg-white/[0.03] p-5 sm:p-6 shadow-sm">
        <div className="mb-5 flex rounded-md border border-gray-200 dark:border-white/10 p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
              !isRegister
                ? "bg-sky-600 text-white"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded px-3 py-2 text-sm font-medium transition-colors ${
              isRegister
                ? "bg-sky-600 text-white"
                : "text-gray-600 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/10"
            }`}
          >
            Create account
          </button>
        </div>

        <button
          type="button"
          onClick={submitGoogle}
          disabled={!firebaseConfigured || busy || loading}
          className="mb-5 flex w-full items-center justify-center gap-2 rounded-md border border-gray-200 dark:border-white/10 px-4 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          title={firebaseConfigured ? "Continue with Google" : "Add Firebase config to enable Google sign-in"}
        >
          <i className="ri-google-fill text-base text-red-500" />
          Continue with Google
        </button>

        <div className="mb-5 flex items-center gap-3 text-xs uppercase text-gray-400">
          <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
          <span>Password account</span>
          <span className="h-px flex-1 bg-gray-200 dark:bg-white/10" />
        </div>

        <form onSubmit={submitPassword} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="username">
              Username or email
            </label>
            <input
              id="username"
              value={form.username}
              onChange={(event) => updateField("username", event.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-bgdark px-3 py-2 text-sm outline-none focus:border-sky-500"
              autoComplete="username"
              required
            />
          </div>

          {isRegister && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(event) => updateField("email", event.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-bgdark px-3 py-2 text-sm outline-none focus:border-sky-500"
                  autoComplete="email"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium" htmlFor="displayName">
                  Display name
                </label>
                <input
                  id="displayName"
                  value={form.displayName}
                  onChange={(event) => updateField("displayName", event.target.value)}
                  className="w-full rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-bgdark px-3 py-2 text-sm outline-none focus:border-sky-500"
                  autoComplete="name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={form.password}
              onChange={(event) => updateField("password", event.target.value)}
              className="w-full rounded-md border border-gray-200 dark:border-white/10 bg-white dark:bg-bgdark px-3 py-2 text-sm outline-none focus:border-sky-500"
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </div>

          {error && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy || loading}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <i className={busy ? "ri-loader-4-line animate-spin" : "ri-login-circle-line"} />
            {busy ? "Working..." : title}
          </button>
        </form>

        {!user?.database_configured && (
          <p className="mt-5 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-400/30 dark:bg-amber-400/10 dark:text-amber-200">
            Supabase is not configured yet, so username/password accounts and cloud sync will stay disabled until the database values are added.
          </p>
        )}

        {!firebaseConfigured && (
          <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            Google sign-in appears after Firebase public config is added and Google authentication is enabled in Firebase.
          </p>
        )}
      </div>
    </div>
  );
}
