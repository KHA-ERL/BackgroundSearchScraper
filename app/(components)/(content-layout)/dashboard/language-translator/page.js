"use client";
import { useState } from "react";
import axios from "axios";

const LANGUAGES = [
  { label: "Auto Detect",          code: "auto", flag: "🌐" },
  { label: "English",              code: "en",   flag: "🇬🇧" },
  { label: "Hindi",                code: "hi",   flag: "🇮🇳" },
  { label: "Spanish",              code: "es",   flag: "🇪🇸" },
  { label: "French",               code: "fr",   flag: "🇫🇷" },
  { label: "German",               code: "de",   flag: "🇩🇪" },
  { label: "Italian",              code: "it",   flag: "🇮🇹" },
  { label: "Portuguese",           code: "pt",   flag: "🇧🇷" },
  { label: "Russian",              code: "ru",   flag: "🇷🇺" },
  { label: "Japanese",             code: "ja",   flag: "🇯🇵" },
  { label: "Korean",               code: "ko",   flag: "🇰🇷" },
  { label: "Chinese (Simplified)", code: "zh",   flag: "🇨🇳" },
  { label: "Arabic",               code: "ar",   flag: "🇸🇦" },
  { label: "Bengali",              code: "bn",   flag: "🇧🇩" },
  { label: "Turkish",              code: "tr",   flag: "🇹🇷" },
  { label: "Urdu",                 code: "ur",   flag: "🇵🇰" },
  { label: "Tamil",                code: "ta",   flag: "🇮🇳" },
  { label: "Telugu",               code: "te",   flag: "🇮🇳" },
  { label: "Marathi",              code: "mr",   flag: "🇮🇳" },
  { label: "Gujarati",             code: "gu",   flag: "🇮🇳" },
  { label: "Punjabi",              code: "pa",   flag: "🇮🇳" },
  { label: "Dutch",                code: "nl",   flag: "🇳🇱" },
  { label: "Polish",               code: "pl",   flag: "🇵🇱" },
  { label: "Swedish",              code: "sv",   flag: "🇸🇪" },
  { label: "Norwegian",            code: "no",   flag: "🇳🇴" },
  { label: "Danish",               code: "da",   flag: "🇩🇰" },
  { label: "Finnish",              code: "fi",   flag: "🇫🇮" },
  { label: "Greek",                code: "el",   flag: "🇬🇷" },
  { label: "Thai",                 code: "th",   flag: "🇹🇭" },
  { label: "Vietnamese",           code: "vi",   flag: "🇻🇳" },
  { label: "Indonesian",           code: "id",   flag: "🇮🇩" },
  { label: "Malay",                code: "ms",   flag: "🇲🇾" },
  { label: "Ukrainian",            code: "uk",   flag: "🇺🇦" },
  { label: "Hebrew",               code: "iw",   flag: "🇮🇱" },
  { label: "Persian (Farsi)",      code: "fa",   flag: "🇮🇷" },
  { label: "Swahili",              code: "sw",   flag: "🇰🇪" },
  { label: "Filipino",             code: "tl",   flag: "🇵🇭" },
  { label: "Nepali",               code: "ne",   flag: "🇳🇵" },
  { label: "Sinhala",              code: "si",   flag: "🇱🇰" },
];

const TARGET_LANGUAGES = LANGUAGES.filter(l => l.code !== "auto");
const MAX_CHARS = 5000;

export default function LanguageTranslatorPage() {
  const [fromLang, setFromLang] = useState("auto");
  const [toLang, setToLang] = useState("hi");
  const [inputText, setInputText] = useState("");
  const [outputText, setOutputText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [lastMeta, setLastMeta] = useState(null);

  async function translate() {
    if (!inputText.trim()) { setError("Enter text to translate."); return; }
    if (!toLang) { setError("Select a target language."); return; }
    if (fromLang !== "auto" && fromLang === toLang) { setError("Source and target languages must be different."); return; }

    setError(""); setOutputText(""); setLoading(true); setLastMeta(null);
    try {
      const res = await axios.post("/api/language_translator", {
        text: inputText.slice(0, MAX_CHARS),
        from: fromLang,
        to: toLang,
      });
      setOutputText(res.data.data?.translated || "");
      setLastMeta(res.data.data || null);
    } catch (e) {
      setError(e?.response?.data?.error || "Translation failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function swapLanguages() {
    if (fromLang === "auto") return;
    const prevFrom = fromLang;
    const prevTo = toLang;
    setFromLang(prevTo);
    setToLang(prevFrom);
    setInputText(outputText);
    setOutputText("");
    setLastMeta(null);
  }

  function copyOutput() {
    if (!outputText) return;
    navigator.clipboard.writeText(outputText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  function clearAll() {
    setInputText("");
    setOutputText("");
    setError("");
    setLastMeta(null);
  }

  const fromLangObj = LANGUAGES.find(l => l.code === fromLang);
  const toLangObj = TARGET_LANGUAGES.find(l => l.code === toLang);
  const fromLabel = fromLangObj ? `${fromLangObj.flag} ${fromLangObj.label}` : fromLang;
  const toLabel = toLangObj ? `${toLangObj.flag} ${toLangObj.label}` : toLang;
  const charCount = inputText.length;

  return (
    <div>
      {/* Info Banner */}
      <div className="box mb-5 border-l-4 border-l-cyan-500">
        <div className="box-body py-3">
          <p className="text-sm text-gray-600">
            <i className="ri-translate-2 text-cyan-500 mr-2" />
            Language Translator — powered by Google Translate. Supports 40+ languages including Indian, European, and Asian languages.
          </p>
        </div>
      </div>

      {/* Language Selector Bar */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-translate-2 text-cyan-600" />
            Language Translator
            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-semibold ml-1">Google v19</span>
          </h5>
        </div>
        <div className="box-body">
          {/* Language row */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {/* From language */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1 font-medium">Translate From</label>
              <select
                className="ti-form-input"
                value={fromLang}
                onChange={e => setFromLang(e.target.value)}
              >
                {LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                ))}
              </select>
            </div>

            {/* Swap button */}
            <div className="flex flex-col items-center mt-5">
              <button
                onClick={swapLanguages}
                disabled={fromLang === "auto"}
                title={fromLang === "auto" ? "Cannot swap when Auto Detect is selected" : "Swap languages"}
                className={`w-9 h-9 rounded-full border flex items-center justify-center transition-all ${
                  fromLang === "auto"
                    ? "border-gray-200 text-gray-300 cursor-not-allowed"
                    : "border-cyan-300 text-cyan-600 hover:bg-cyan-50 hover:border-cyan-500"
                }`}
              >
                <i className="ri-arrow-left-right-line" />
              </button>
            </div>

            {/* To language */}
            <div className="flex-1 min-w-[150px]">
              <label className="block text-xs text-gray-500 mb-1 font-medium">Translate To</label>
              <select
                className="ti-form-input"
                value={toLang}
                onChange={e => setToLang(e.target.value)}
              >
                {TARGET_LANGUAGES.map(l => (
                  <option key={l.code} value={l.code}>{l.flag} {l.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Text areas side by side */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            {/* Input */}
            <div className="col-span-12 md:col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">
                  <i className="ri-edit-line mr-1" />
                  {fromLabel}
                </label>
                <div className="flex items-center gap-2">
                  <span className={`text-xs ${charCount > MAX_CHARS * 0.9 ? "text-red-400" : "text-gray-400"}`}>
                    {charCount} / {MAX_CHARS}
                  </span>
                  {inputText && (
                    <button onClick={clearAll} className="text-xs text-gray-400 hover:text-red-400 transition-colors">
                      <i className="ri-close-circle-line" /> Clear
                    </button>
                  )}
                </div>
              </div>
              <textarea
                className="ti-form-input resize-none w-full"
                rows={10}
                value={inputText}
                onChange={e => setInputText(e.target.value.slice(0, MAX_CHARS))}
                placeholder="Enter text to translate..."
              />
            </div>

            {/* Output */}
            <div className="col-span-12 md:col-span-6">
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-medium text-gray-500">
                  <i className="ri-text-snippet mr-1" />
                  {toLabel}
                </label>
                {outputText && (
                  <button
                    onClick={copyOutput}
                    className="text-xs text-cyan-600 hover:text-cyan-700 flex items-center gap-1 transition-colors"
                  >
                    <i className={copied ? "ri-check-line" : "ri-clipboard-line"} />
                    {copied ? "Copied!" : "Copy"}
                  </button>
                )}
              </div>
              <div
                className={`w-full rounded-lg border min-h-[240px] p-3 text-sm leading-relaxed relative transition-colors ${
                  loading
                    ? "bg-gray-50 dark:bg-white/5 border-gray-200"
                    : outputText
                    ? "bg-cyan-50 dark:bg-cyan-900/10 border-cyan-200 dark:border-cyan-800 text-gray-800 dark:text-white/80"
                    : "bg-gray-50 dark:bg-white/5 border-gray-200 text-gray-400"
                }`}
              >
                {loading ? (
                  <div className="flex items-center gap-2 text-gray-400 mt-4">
                    <span className="ti-spinner w-4 h-4 border-cyan-400" />
                    <span className="text-sm">Translating...</span>
                  </div>
                ) : outputText ? (
                  <span className="whitespace-pre-wrap">{outputText}</span>
                ) : (
                  <span className="text-gray-400 italic">Translation will appear here...</span>
                )}
              </div>
            </div>
          </div>

          {/* Action button */}
          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={translate}
              disabled={loading || !inputText.trim()}
              className="ti-btn ti-btn-outline border border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <><span className="ti-spinner w-4 h-4 border-white/60" /> Translating...</>
              ) : (
                <><i className="ri-translate-2" /> Translate</>
              )}
            </button>
            {outputText && (
              <button
                onClick={copyOutput}
                className="ti-btn ti-btn-outline border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <i className={copied ? "ri-check-line text-green-500" : "ri-clipboard-line"} />
                {copied ? "Copied!" : "Copy Translation"}
              </button>
            )}
          </div>

          {error && (
            <p className="text-red-500 text-sm mt-3">
              <i className="ri-error-warning-line mr-1" />{error}
            </p>
          )}

          {/* Translation meta info */}
          {lastMeta && !loading && (
            <div className="mt-4 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10 text-xs text-gray-500 flex flex-wrap gap-4">
              <span><i className="ri-input-method-line mr-1" />Original: {lastMeta.original?.length} chars</span>
              <span><i className="ri-text-snippet mr-1" />Translated: {lastMeta.translated?.length} chars</span>
              <span><i className="ri-global-line mr-1" />
                {(() => { const l = LANGUAGES.find(x => x.code === lastMeta.from); return l ? `${l.flag} ${l.label}` : lastMeta.from; })()}
                {" → "}
                {(() => { const l = TARGET_LANGUAGES.find(x => x.code === lastMeta.to); return l ? `${l.flag} ${l.label}` : lastMeta.to; })()}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Supported Languages grid */}
      <div className="box">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-global-line text-cyan-500" /> Supported Languages
          </h5>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
            {TARGET_LANGUAGES.map(lang => (
              <button
                key={lang.code}
                onClick={() => setToLang(lang.code)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                  toLang === lang.code
                    ? "bg-cyan-600 text-white border-cyan-600"
                    : "border-gray-200 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:border-cyan-300 hover:text-cyan-600"
                }`}
              >
                <span className="text-base leading-none">{lang.flag}</span>
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
