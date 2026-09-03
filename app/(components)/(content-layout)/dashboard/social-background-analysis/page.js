"use client";
import { useState } from "react";
import axios from "axios";

const PROVIDERS = [
  { id: "mistral", label: "Mistral", icon: "ri-triangle-line" },
  { id: "claude", label: "Claude", icon: "ri-brain-line" },
  { id: "codex", label: "Codex", icon: "ri-code-box-line" },
];

const ANALYSIS_MODES = [
  { id: "balanced", label: "Balanced", icon: "ri-scales-3-line" },
  { id: "risk", label: "Safety Review", icon: "ri-shield-check-line" },
  { id: "reputation", label: "Reputation", icon: "ri-medal-line" },
  { id: "consistency", label: "Profile Consistency", icon: "ri-fingerprint-line" },
];

const SAMPLE_URLS = [
  "https://www.instagram.com/username/",
  "https://www.linkedin.com/in/username/",
  "https://www.facebook.com/username",
  "https://x.com/username/status/123456789",
];

function parseUrls(value) {
  return value
    .split(/\r?\n|,/)
    .map((url) => url.trim())
    .filter(Boolean);
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SocialBackgroundAnalysisPage() {
  const [urlInput, setUrlInput] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [context, setContext] = useState("");
  const [provider, setProvider] = useState("mistral");
  const [depth, setDepth] = useState("standard");
  const [analysisMode, setAnalysisMode] = useState("balanced");
  const [acknowledged, setAcknowledged] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const urls = parseUrls(urlInput);
  const canRun = urls.length > 0 && acknowledged && !loading;

  async function runAnalysis() {
    if (!urls.length) {
      setError("Add at least one public social profile or post URL.");
      return;
    }
    if (!acknowledged) {
      setError("Confirm that you are analyzing lawful public content and will review the output.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await axios.post("/api/social_background_analysis", {
        urls,
        subjectName,
        context,
        provider,
        depth,
        analysisMode,
      });
      setResult(res.data);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to complete the analysis.");
    } finally {
      setLoading(false);
    }
  }

  function fillSample() {
    setUrlInput(SAMPLE_URLS.join("\n"));
  }

  return (
    <div>
      <div className="box mb-5 overflow-hidden border-l-4 border-l-purple-500">
        <div className="box-body">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-purple-600 dark:text-purple-300">Public evidence brief</p>
              <h2 className="mt-1 text-2xl font-bold text-defaulttextcolor dark:text-white">
                Social Background Analysis
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-gray-500 dark:text-gray-400">
                Scrape public social profiles or post URLs, then generate a structured analysis of visible topics, activity, communication style, and evidence gaps.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                ["URLs", urls.length],
                ["Provider", PROVIDERS.find((p) => p.id === provider)?.label],
                ["Mode", ANALYSIS_MODES.find((mode) => mode.id === analysisMode)?.label],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/10 dark:bg-white/5">
                  <p className="text-[11px] text-gray-400">{label}</p>
                  <p className="text-sm font-bold text-defaulttextcolor dark:text-white">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-5">
        <section className="col-span-12 xl:col-span-5">
          <div className="box">
            <div className="box-header">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-links-line text-purple-500" />
                Analysis Inputs
              </h5>
            </div>
            <div className="box-body space-y-4">
              <div>
                <label htmlFor="subject-name" className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
                  Subject name or identifier
                </label>
                <input
                  id="subject-name"
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder="Optional: name, case ID, applicant ID"
                  className="ti-form-input"
                />
              </div>

              <div>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <label htmlFor="social-urls" className="block text-sm font-medium text-gray-600 dark:text-gray-300">
                    Public profile or post URLs
                  </label>
                  <button
                    type="button"
                    onClick={fillSample}
                    className="text-xs font-semibold text-purple-600 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
                  >
                    Use examples
                  </button>
                </div>
                <textarea
                  id="social-urls"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  rows={8}
                  placeholder="Paste one URL per line..."
                  className="ti-form-input min-h-44 resize-y"
                />
                <p className="mt-1 text-xs text-gray-400">
                  Up to 12 URLs. Publicly visible content only; login walls may return partial data.
                </p>
              </div>

              <div>
                <label htmlFor="analysis-context" className="mb-1 block text-sm font-medium text-gray-600 dark:text-gray-300">
                  Review context
                </label>
                <textarea
                  id="analysis-context"
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                  placeholder="Optional: what should the brief focus on?"
                  className="ti-form-input resize-y"
                />
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Analysis provider</p>
                <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Analysis provider">
                  {PROVIDERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={provider === item.id}
                      onClick={() => setProvider(item.id)}
                      className={`min-h-12 rounded-lg border px-3 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                        provider === item.id
                          ? "border-purple-500 bg-purple-500 text-white"
                          : "border-gray-200 bg-white text-gray-600 hover:border-purple-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                      }`}
                    >
                      <i className={`${item.icon} mr-1`} />
                      {item.label}
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  Configure provider keys and model names in Profile settings.
                </p>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Analysis lens</p>
                <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Analysis lens">
                  {ANALYSIS_MODES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      role="radio"
                      aria-checked={analysisMode === item.id}
                      onClick={() => setAnalysisMode(item.id)}
                      className={`min-h-12 rounded-lg border px-3 text-left text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                        analysisMode === item.id
                          ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          : "border-gray-200 bg-white text-gray-600 hover:border-purple-300 dark:border-white/10 dark:bg-white/5 dark:text-gray-300"
                      }`}
                    >
                      <i className={`${item.icon} mr-1`} />
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-gray-600 dark:text-gray-300">Scrape depth</p>
                <div className="flex gap-2">
                  {[
                    ["standard", "Standard"],
                    ["deep", "Deep"],
                  ].map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setDepth(id)}
                      className={`min-h-10 rounded-full border px-4 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 ${
                        depth === id
                          ? "border-purple-500 bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300"
                          : "border-gray-200 text-gray-500 hover:border-purple-300 dark:border-white/10"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-200">
                <input
                  type="checkbox"
                  checked={acknowledged}
                  onChange={(e) => setAcknowledged(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-amber-300 text-purple-600 focus:ring-purple-500"
                />
                <span>
                  I confirm this review uses lawful public content and the AI output will be treated as an evidence brief, not an automated decision.
                </span>
              </label>

              <button
                type="button"
                onClick={runAnalysis}
                disabled={!canRun}
                className="ti-btn flex w-full items-center justify-center gap-2 bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <span className="ti-spinner h-4 w-4 border-white/70" />
                    Scraping and analyzing...
                  </>
                ) : (
                  <>
                    <i className="ri-search-eye-line" />
                    Generate Background Brief
                  </>
                )}
              </button>
              {error && (
                <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-700 dark:bg-red-900/20">
                  <i className="ri-error-warning-line mr-1" />
                  {error}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="col-span-12 xl:col-span-7">
          <div className="box min-h-[560px]">
            <div className="box-header flex-wrap gap-3">
              <h5 className="box-title flex items-center gap-2">
                <i className="ri-file-chart-line text-purple-500" />
                Background Brief
              </h5>
              {result?.analysis && (
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => downloadFile("social-background-brief.md", result.analysis, "text/markdown")}
                    className="ti-btn text-xs"
                  >
                    <i className="ri-markdown-line mr-1" />
                    MD
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadFile("social-background-brief.json", JSON.stringify(result, null, 2), "application/json")}
                    className="ti-btn text-xs"
                  >
                    <i className="ri-braces-line mr-1" />
                    JSON
                  </button>
                </div>
              )}
            </div>
            <div className="box-body">
              {loading && (
                <div className="flex min-h-96 flex-col items-center justify-center text-center">
                  <span className="ti-spinner mb-4 h-10 w-10 border-purple-400" />
                  <h3 className="text-lg font-bold text-defaulttextcolor dark:text-white">Building the evidence brief</h3>
                  <p className="mt-2 max-w-sm text-sm text-gray-400">
                    Scraping public pages first, then asking {PROVIDERS.find((p) => p.id === provider)?.label} to summarize the findings.
                  </p>
                </div>
              )}

              {!loading && !result && (
                <div className="flex min-h-96 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 p-8 text-center dark:border-white/10 dark:bg-white/5">
                  <i className="ri-user-search-line mb-3 text-5xl text-purple-200" />
                  <h3 className="text-lg font-bold text-defaulttextcolor dark:text-white">No brief generated yet</h3>
                  <p className="mt-2 max-w-md text-sm text-gray-400">
                    Add public social URLs, choose a model provider, and generate a structured review with evidence and confidence notes.
                  </p>
                </div>
              )}

              {!loading && result && (
                <div className="space-y-5">
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 dark:border-green-700 dark:bg-green-900/20 dark:text-green-300">
                    <i className="ri-checkbox-circle-line mr-1" />
                    {result.notice}
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                    {[
                      ["Provider", result.provider],
                      ["URLs", result.urls?.length || 0],
                      ["Confidence", `${result.evidence_pack?.metrics?.confidence_score || 0}% ${result.evidence_pack?.metrics?.confidence_label || "low"}`],
                      ["Generated", result.generated_at ? new Date(result.generated_at).toLocaleString() : "N/A"],
                    ].map(([label, value]) => (
                      <div key={label} className="rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-white/10 dark:bg-white/5">
                        <p className="text-xs text-gray-400">{label}</p>
                        <p className="truncate text-sm font-bold text-defaulttextcolor dark:text-white">{value}</p>
                      </div>
                    ))}
                  </div>

                  {result.evidence_pack && (
                    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <h3 className="mb-3 text-sm font-bold text-defaulttextcolor dark:text-white">Evidence Metrics</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {[
                            ["Scraped", result.evidence_pack.metrics.scraped_count],
                            ["Failed", result.evidence_pack.metrics.failed_count],
                            ["Text chars", result.evidence_pack.metrics.text_chars],
                            ["Avg chars", result.evidence_pack.metrics.average_chars_per_scraped_url],
                          ].map(([label, value]) => (
                            <div key={label}>
                              <p className="text-xs text-gray-400">{label}</p>
                              <p className="font-bold text-defaulttextcolor dark:text-white">{value}</p>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 h-2 overflow-hidden rounded-full bg-gray-200 dark:bg-white/10">
                          <div
                            className="h-full rounded-full bg-purple-500"
                            style={{ width: `${result.evidence_pack.metrics.confidence_score}%` }}
                          />
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5">
                        <h3 className="mb-3 text-sm font-bold text-defaulttextcolor dark:text-white">Detected Themes</h3>
                        <div className="flex flex-wrap gap-2">
                          {result.evidence_pack.keywords?.length ? (
                            result.evidence_pack.keywords.slice(0, 12).map((keyword) => (
                              <span key={keyword.term} className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-gray-600 ring-1 ring-gray-200 dark:bg-black dark:text-gray-300 dark:ring-white/10">
                                {keyword.term} <span className="text-gray-400">{keyword.count}</span>
                              </span>
                            ))
                          ) : (
                            <p className="text-sm text-gray-400">No strong repeated themes detected.</p>
                          )}
                        </div>
                      </div>

                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-white/10 dark:bg-white/5 lg:col-span-2">
                        <h3 className="mb-3 text-sm font-bold text-defaulttextcolor dark:text-white">Human Review Signals</h3>
                        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                          {result.evidence_pack.public_signals?.map((signal) => (
                            <div key={signal.id} className="rounded-lg border border-gray-200 bg-white p-3 dark:border-white/10 dark:bg-black">
                              <div className="flex items-center justify-between gap-2">
                                <p className="text-sm font-semibold text-defaulttextcolor dark:text-white">{signal.label}</p>
                                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                                  signal.count > 0 ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500"
                                }`}>
                                  {signal.count}
                                </span>
                              </div>
                              <p className="mt-1 text-xs text-gray-400">Confidence: {signal.confidence}</p>
                              {signal.matches?.[0]?.excerpt && (
                                <p className="mt-2 line-clamp-3 text-xs text-gray-500 dark:text-gray-400">
                                  {signal.matches[0].excerpt}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <article className="prose prose-sm max-w-none whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 leading-6 text-gray-700 dark:prose-invert dark:border-white/10 dark:bg-black dark:text-white/80">
                    {result.analysis}
                  </article>

                  <div>
                    <h3 className="mb-2 text-sm font-bold text-defaulttextcolor dark:text-white">Scraped Sources</h3>
                    <div className="space-y-2">
                      {result.scraped?.map((source) => (
                        <div key={source.url} className="rounded-lg border border-gray-200 p-3 dark:border-white/10">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              source.status === "scraped" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"
                            }`}>
                              {source.status}
                            </span>
                            <span className="text-xs font-semibold text-purple-600 dark:text-purple-300">{source.platform}</span>
                          </div>
                          <a href={source.url} target="_blank" rel="noreferrer" className="mt-1 block break-all text-sm text-sky-600 hover:underline">
                            {source.title || source.url}
                          </a>
                          {source.error && <p className="mt-1 text-xs text-red-500">{source.error}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
