"use client";
import { useState, useEffect } from "react";
import { useTheme } from "../../../../../components/ThemeProvider";
import { useLanguage } from "../../../../../components/LanguageProvider";

export default function ProfilePage() {
  const { dark: darkMode, toggle: toggleDarkMode } = useTheme();
  const { t } = useLanguage();
  const [apiKey] = useState("sk-scrape-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
  const [copied, setCopied] = useState(false);
  const [dnsMode, setDnsMode] = useState("vpn"); // "vpn" | "doh"
  const [dnsSaving, setDnsSaving] = useState(false);
  const [dnsSaved, setDnsSaved] = useState(false);

  // Bright Data state
  const [bdEnabled, setBdEnabled] = useState(false);
  const [bdProxy, setBdProxy] = useState("http://brd.superproxy.io:22225");
  const [bdUsername, setBdUsername] = useState("");
  const [bdPassword, setBdPassword] = useState("");
  const [bdPasswordSet, setBdPasswordSet] = useState(false);
  const [bdSaving, setBdSaving] = useState(false);
  const [bdSaved, setBdSaved] = useState(false);

  // ListClean state
  const [lcApiKey, setLcApiKey] = useState("");
  const [lcApiKeySet, setLcApiKeySet] = useState(false);
  const [lcSaving, setLcSaving] = useState(false);
  const [lcSaved, setLcSaved] = useState(false);

  // Mistral state
  const [mistralApiKey, setMistralApiKey] = useState("");
  const [mistralApiKeySet, setMistralApiKeySet] = useState(false);
  const [mistralSaving, setMistralSaving] = useState(false);
  const [mistralSaved, setMistralSaved] = useState(false);

  // WA Security Secret state
  const [waSecret, setWaSecret] = useState("");
  const [waSecretSet, setWaSecretSet] = useState(false);
  const [waSaving, setWaSaving] = useState(false);
  const [waSaved, setWaSaved] = useState(false);

  // Webhook state
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookSaved, setWebhookSaved] = useState(false);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookTestResult, setWebhookTestResult] = useState(null);

  useEffect(() => {
    fetch("/api/settings/")
      .then((r) => r.json())
      .then((d) => {
        if (d.dns_mode) setDnsMode(d.dns_mode);
        if (d.bright_data_enabled !== undefined) setBdEnabled(d.bright_data_enabled === true || d.bright_data_enabled === "true");
        if (d.bright_data_proxy) setBdProxy(d.bright_data_proxy);
        if (d.bright_data_username) setBdUsername(d.bright_data_username);
        if (d.bright_data_password_set) setBdPasswordSet(true);
        if (d.listclean_api_key_set) setLcApiKeySet(true);
        if (d.mistral_api_key_set) setMistralApiKeySet(true);
        if (d.wa_security_secret_set) setWaSecretSet(true);
        if (d.webhook_url) setWebhookUrl(d.webhook_url);
      })
      .catch(() => {});
  }, []);


  async function toggleDnsMode() {
    const next = dnsMode === "vpn" ? "doh" : "vpn";
    setDnsSaving(true);
    try {
      const res = await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dns_mode: next }),
      });
      if (res.ok) {
        setDnsMode(next);
        setDnsSaved(true);
        setTimeout(() => setDnsSaved(false), 2000);
      }
    } finally {
      setDnsSaving(false);
    }
  }

  async function saveBrightData() {
    setBdSaving(true);
    try {
      const body = {
        bright_data_enabled: bdEnabled,
        bright_data_proxy: bdProxy,
        bright_data_username: bdUsername,
      };
      if (bdPassword) body.bright_data_password = bdPassword;
      const res = await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        if (bdPassword) { setBdPasswordSet(true); setBdPassword(""); }
        setBdSaved(true);
        setTimeout(() => setBdSaved(false), 2000);
      }
    } finally {
      setBdSaving(false);
    }
  }

  async function saveListClean() {
    if (!lcApiKey) return;
    setLcSaving(true);
    try {
      const res = await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listclean_api_key: lcApiKey }),
      });
      if (res.ok) {
        setLcApiKeySet(true);
        setLcApiKey("");
        setLcSaved(true);
        setTimeout(() => setLcSaved(false), 2000);
      }
    } finally {
      setLcSaving(false);
    }
  }

  async function saveMistral() {
    if (!mistralApiKey) return;
    setMistralSaving(true);
    try {
      const res = await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mistral_api_key: mistralApiKey }),
      });
      if (res.ok) {
        setMistralApiKeySet(true);
        setMistralApiKey("");
        setMistralSaved(true);
        setTimeout(() => setMistralSaved(false), 2000);
      }
    } finally {
      setMistralSaving(false);
    }
  }

  async function saveWaSecret() {
    if (!waSecret) return;
    setWaSaving(true);
    try {
      const res = await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wa_security_secret: waSecret }),
      });
      if (res.ok) {
        setWaSecretSet(true);
        setWaSecret("");
        setWaSaved(true);
        setTimeout(() => setWaSaved(false), 2000);
      }
    } finally {
      setWaSaving(false);
    }
  }


  async function saveWebhook() {
    setWebhookSaving(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch("/api/settings/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ webhook_url: webhookUrl }),
      });
      if (res.ok) {
        setWebhookSaved(true);
        setTimeout(() => setWebhookSaved(false), 2000);
      }
    } finally {
      setWebhookSaving(false);
    }
  }

  async function testWebhook() {
    if (!webhookUrl) return;
    setWebhookTesting(true);
    setWebhookTestResult(null);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tool: "Test Ping", count: 0, results: [], timestamp: new Date().toISOString() }),
      });
      setWebhookTestResult(res.ok ? "success" : "error");
    } catch (_) {
      setWebhookTestResult("error");
    } finally {
      setWebhookTesting(false);
    }
  }

  function copyApiKey() {
    navigator.clipboard.writeText(apiKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const stats = [
    { label: "Total Scrapes", value: "0", icon: "ri-database-line", color: "sky" },
    { label: "Tools Used", value: "18", icon: "ri-tools-line", color: "blue" },
    { label: "Data Exported", value: "0", icon: "ri-download-cloud-line", color: "green" },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Profile Header Card */}
      <div className="box mb-5">
        <div className="box-body">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 rounded-full bg-sky-500 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                U
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-2xl font-bold text-defaulttextcolor dark:text-white mb-1">Admin User</h2>
              <p className="text-gray-500 dark:text-gray-400 mb-2">
                <span className="inline-flex items-center gap-1">
                  <i className="ri-shield-star-line text-sky-500" />
                  Administrator
                </span>
              </p>
              <p className="text-sm text-gray-400">
                <i className="ri-mail-line mr-1" />
                admin@bubblescraper.com
              </p>
              <div className="flex gap-2 mt-3 justify-center md:justify-start">
                <span className="px-3 py-1 bg-sky-100 text-sky-700 rounded-full text-xs font-semibold">Pro Plan</span>
                <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold flex items-center gap-1">
                  <i className="ri-checkbox-circle-fill text-xs" /> Active
                </span>
              </div>
            </div>

            {/* Edit button placeholder */}
            <div className="flex-shrink-0">
              <button className="ti-btn ti-btn-outline border border-sky-300 text-sky-600 hover:bg-sky-500 hover:text-white flex items-center gap-2">
                <i className="ri-edit-line" /> Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl bg-${s.color}-100 flex items-center justify-center`}>
                    <i className={`${s.icon} text-${s.color}-600 text-2xl`} />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{s.label}</p>
                    <p className="text-2xl font-bold text-defaulttextcolor dark:text-white">{s.value}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Settings */}
      <div className="grid grid-cols-12 gap-5">
        {/* Preferences */}
        <div className="col-span-12 md:col-span-6">
          <div className="box h-full">
            <div className="box-header">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-settings-3-line text-sky-500" /> {t("settings.preferences")}
              </h5>
            </div>
            <div className="box-body space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/10">
                <div>
                  <p className="text-sm font-medium text-defaulttextcolor dark:text-white">{t("settings.dark_mode")}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t("settings.dark_mode_desc")}</p>
                </div>
                <button
                  onClick={toggleDarkMode}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${darkMode ? "bg-sky-500" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${darkMode ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              {/* DNS Mode toggle */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/10">
                <div className="flex-1 pr-4">
                  <p className="text-sm font-medium text-defaulttextcolor dark:text-white flex items-center gap-1.5">
                    <i className="ri-router-line text-sky-500" />
                    {t("settings.dns_mode")}
                    {dnsSaved && (
                      <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-semibold">Saved</span>
                    )}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                    {dnsMode === "vpn" ? t("settings.dns_vpn_desc") : t("settings.dns_doh_desc")}
                  </p>
                </div>
                <button
                  onClick={toggleDnsMode}
                  disabled={dnsSaving}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${dnsMode === "vpn" ? "bg-sky-500" : "bg-gray-200"} disabled:opacity-60`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${dnsMode === "vpn" ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/10">
                <div>
                  <p className="text-sm font-medium text-defaulttextcolor dark:text-white">{t("settings.email_notif")}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t("settings.email_notif_desc")}</p>
                </div>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 rounded text-xs">{t("settings.coming_soon")}</span>
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <p className="text-sm font-medium text-defaulttextcolor dark:text-white">{t("settings.auto_export")}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t("settings.auto_export_desc")}</p>
                </div>
                <span className="px-2 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 rounded text-xs">{t("settings.coming_soon")}</span>
              </div>
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="col-span-12 md:col-span-6">
          <div className="box h-full">
            <div className="box-header">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-key-line text-sky-500" /> {t("settings.api_key")}
              </h5>
            </div>
            <div className="box-body">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Your API key for programmatic access. Keep this private.</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2">
                  <code className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">{apiKey}</code>
                </div>
                <button
                  onClick={copyApiKey}
                  className="ti-btn ti-btn-outline border border-sky-300 text-sky-600 hover:bg-sky-500 hover:text-white flex-shrink-0 flex items-center gap-1 text-xs"
                >
                  <i className={copied ? "ri-check-line" : "ri-clipboard-line"} />
                  {copied ? t("btn.copied") : t("btn.copy")}
                </button>
              </div>
              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-700">
                <p className="text-xs text-yellow-700 dark:text-yellow-400 flex items-start gap-1.5">
                  <i className="ri-alert-line flex-shrink-0 mt-0.5" />
                  Do not share your API key publicly. Regenerate it if you suspect it has been compromised.
                </p>
              </div>
              <button className="mt-3 ti-btn ti-btn-outline border border-red-300 text-red-500 hover:bg-red-500 hover:text-white flex items-center gap-2 text-sm">
                <i className="ri-refresh-line" /> Regenerate Key
              </button>
            </div>
          </div>
        </div>

        {/* Bright Data Web Unlocker */}
        <div className="col-span-12">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-shield-flash-line text-sky-500" /> {t("settings.bd_title")}
                {bdSaved && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-semibold">Saved</span>
                )}
              </h5>
            </div>
            <div className="box-body space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {t("settings.bd_desc")} Requires a Bright Data account with a Web Unlocker zone.
              </p>

              {/* Enable toggle */}
              <div className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-white/10">
                <div>
                  <p className="text-sm font-medium text-defaulttextcolor dark:text-white">{t("settings.bd_enable")}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{t("settings.bd_enable_desc")}</p>
                </div>
                <button
                  onClick={() => setBdEnabled(!bdEnabled)}
                  className={`relative w-12 h-6 rounded-full transition-colors duration-200 flex-shrink-0 ${bdEnabled ? "bg-sky-500" : "bg-gray-200"}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${bdEnabled ? "translate-x-6" : "translate-x-0"}`} />
                </button>
              </div>

              {/* Proxy fields */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t("settings.bd_proxy")}</label>
                  <input
                    type="text"
                    value={bdProxy}
                    onChange={(e) => setBdProxy(e.target.value)}
                    placeholder="http://brd.superproxy.io:22225"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t("settings.bd_username")}</label>
                  <input
                    type="text"
                    value={bdUsername}
                    onChange={(e) => setBdUsername(e.target.value)}
                    placeholder="brd-customer-XXX-zone-web_unlocker"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t("settings.bd_password")} {bdPasswordSet && <span className="text-green-500 font-semibold">(saved)</span>}
                  </label>
                  <input
                    type="password"
                    value={bdPassword}
                    onChange={(e) => setBdPassword(e.target.value)}
                    placeholder={bdPasswordSet ? "••••••••  (leave blank to keep)" : "Enter password"}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                </div>
              </div>

              <button
                onClick={saveBrightData}
                disabled={bdSaving}
                className="ti-btn bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-2 disabled:opacity-60"
              >
                <i className={bdSaving ? "ri-loader-4-line animate-spin" : "ri-save-line"} />
                {bdSaving ? t("btn.loading") : t("settings.bd_save")}
              </button>
            </div>
          </div>
        </div>

        {/* Third-Party API Keys */}
        <div className="col-span-12 md:col-span-6">
          <div className="box h-full">
            <div className="box-header">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-plug-line text-sky-500" /> {t("settings.api_keys")}
                {lcSaved && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-semibold">Saved</span>
                )}
              </h5>
            </div>
            <div className="box-body space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  {t("settings.lc_key")} {lcApiKeySet && <span className="text-green-500 font-semibold">(saved)</span>}
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  Enables full SMTP + risk-signal email verification. Get a key at{" "}
                  <a href="https://listclean.xyz" target="_blank" rel="noreferrer" className="text-sky-500 underline">
                    listclean.xyz
                  </a>
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={lcApiKey}
                    onChange={(e) => setLcApiKey(e.target.value)}
                    placeholder={lcApiKeySet ? "••••••••  (saved — enter new key to replace)" : "Enter ListClean API key"}
                    className="flex-1 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={saveListClean}
                    disabled={lcSaving || !lcApiKey}
                    className="ti-btn bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-2 disabled:opacity-60 text-sm flex-shrink-0"
                  >
                    <i className={lcSaving ? "ri-loader-4-line animate-spin" : "ri-save-line"} />
                    {lcSaving ? t("btn.loading") : t("btn.save")}
                  </button>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-700 mb-6">
                <p className="text-xs text-blue-700 dark:text-blue-400 flex items-start gap-1.5">
                  <i className="ri-information-line flex-shrink-0 mt-0.5" />
                  Without a key the email verifier uses DNS MX record checks (free). With a ListClean key it performs full SMTP delivery verification.
                </p>
              </div>

              {/* Mistral AI Section */}
              <div className="border-t border-gray-100 dark:border-white/10 pt-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Mistral AI Router Key {mistralApiKeySet && <span className="text-green-500 font-semibold">(saved)</span>}
                  {mistralSaved && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-semibold transition-opacity">Saved</span>
                  )}
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  Enables the floating <strong>npm AI start</strong> auto-pilot system. Get a key at{" "}
                  <a href="https://console.mistral.ai/" target="_blank" rel="noreferrer" className="text-sky-500 underline">
                    console.mistral.ai
                  </a>
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={mistralApiKey}
                    onChange={(e) => setMistralApiKey(e.target.value)}
                    placeholder={mistralApiKeySet ? "••••••••  (saved — enter new key to replace)" : "Enter Mistral API key"}
                    className="flex-1 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={saveMistral}
                    disabled={mistralSaving || !mistralApiKey}
                    className="ti-btn bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-2 disabled:opacity-60 text-sm flex-shrink-0"
                  >
                    <i className={mistralSaving ? "ri-loader-4-line animate-spin" : "ri-save-line"} />
                    {mistralSaving ? t("btn.loading") : t("btn.save")}
                  </button>
                </div>
              </div>

              {/* WhatsApp Security Secret Section */}
              <div className="border-t border-gray-100 dark:border-white/10 pt-4">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  WhatsApp Security Secret Key {waSecretSet && <span className="text-green-500 font-semibold">(configured)</span>}
                  {waSaved && (
                    <span className="ml-2 text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-semibold transition-opacity">Saved</span>
                  )}
                </label>
                <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
                  Used for signing human-approval confirmation tokens for bulk WhatsApp dispatches.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={waSecret}
                    onChange={(e) => setWaSecret(e.target.value)}
                    placeholder={waSecretSet ? "••••••••  (saved — enter custom key to override)" : "Enter custom secret key (optional)"}
                    className="flex-1 border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                  />
                  <button
                    onClick={saveWaSecret}
                    disabled={waSaving || !waSecret}
                    className="ti-btn bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-2 disabled:opacity-60 text-sm flex-shrink-0"
                  >
                    <i className={waSaving ? "ri-loader-4-line animate-spin" : "ri-save-line"} />
                    {waSaving ? t("btn.loading") : t("btn.save")}
                  </button>
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* Webhook Automation */}
        <div className="col-span-12 md:col-span-6">
          <div className="box h-full">
            <div className="box-header">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-webhook-line text-sky-500" /> Webhook / Automation
                {webhookSaved && (
                  <span className="text-[10px] px-1.5 py-0.5 bg-green-100 text-green-600 rounded font-semibold">Saved</span>
                )}
              </h5>
            </div>
            <div className="box-body space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Post results to any URL after each scraper run. Works with Zapier, Make, n8n, or any HTTP endpoint.
              </p>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Webhook URL</label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => { setWebhookUrl(e.target.value); setWebhookTestResult(null); }}
                  placeholder="https://hooks.zapier.com/hooks/catch/..."
                  className="w-full border border-gray-200 dark:border-white/10 rounded-lg px-3 py-2 text-sm bg-gray-50 dark:bg-white/5 text-defaulttextcolor dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-400"
                />
              </div>
              {webhookTestResult && (
                <p className={`text-xs flex items-center gap-1.5 ${webhookTestResult === "success" ? "text-green-600" : "text-red-500"}`}>
                  <i className={webhookTestResult === "success" ? "ri-checkbox-circle-line" : "ri-error-warning-line"} />
                  {webhookTestResult === "success" ? "Ping succeeded — endpoint is reachable." : "Ping failed — check the URL and try again."}
                </p>
              )}
              <div className="flex gap-2">
                <button
                  onClick={saveWebhook}
                  disabled={webhookSaving || !webhookUrl}
                  className="ti-btn bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-2 disabled:opacity-60 text-sm"
                >
                  <i className={webhookSaving ? "ri-loader-4-line animate-spin" : "ri-save-line"} />
                  {webhookSaving ? "Saving..." : "Save"}
                </button>
                <button
                  onClick={testWebhook}
                  disabled={webhookTesting || !webhookUrl}
                  className="ti-btn ti-btn-outline border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-60 text-sm"
                >
                  <i className={webhookTesting ? "ri-loader-4-line animate-spin" : "ri-send-plane-line"} />
                  {webhookTesting ? "Pinging..." : "Test Ping"}
                </button>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/10">
                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium mb-1">Payload sent on each run:</p>
                <code className="text-[11px] text-gray-400 dark:text-gray-500 font-mono">
                  {"{ tool, count, results[], timestamp }"}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Account Info */}
        <div className="col-span-12 md:col-span-6">
          <div className="box h-full">
            <div className="box-header">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-user-settings-line text-sky-500" /> {t("settings.account")}
              </h5>
            </div>
            <div className="box-body">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {[
                  { label: "Username", value: "admin_user", icon: "ri-user-line" },
                  { label: "Email", value: "admin@bubblescraper.com", icon: "ri-mail-line" },
                  { label: "Role", value: "Administrator", icon: "ri-shield-star-line" },
                  { label: "Account Created", value: "Jan 1, 2025", icon: "ri-calendar-line" },
                  { label: "Last Login", value: "Today", icon: "ri-login-box-line" },
                  { label: "Plan", value: "Pro (Lifetime)", icon: "ri-vip-crown-line" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/20 flex items-center justify-center flex-shrink-0">
                      <i className={`${item.icon} text-sky-500 text-sm`} />
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
                      <p className="text-sm font-medium text-defaulttextcolor dark:text-white">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
