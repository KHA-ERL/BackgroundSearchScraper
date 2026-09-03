"use client";
import { useMemo, useState } from "react";
import axios from "axios";

const PORTALS = [
  { id: "global_careers", label: "Direct Career Pages", icon: "ri-global-line", badge: "Main" },
];

const WORK_TYPES = [
  { id: "all", label: "Any", icon: "ri-compass-3-line" },
  { id: "remote", label: "Remote", icon: "ri-home-wifi-line" },
  { id: "hybrid", label: "Hybrid", icon: "ri-shuffle-line" },
  { id: "physical", label: "Physical", icon: "ri-building-4-line" },
];

const SOURCE_CHIPS = [
  "Open web / SEO",
  "Verified company boards",
  "Greenhouse",
  "Lever",
  "Ashby",
  "SmartRecruiters",
  "Workable",
  "Recruitee",
  "Crunchbase discovery",
];

function uniqueCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

export default function JobPortalScraperPage() {
  const [portal, setPortal] = useState("global_careers");
  const [query, setQuery] = useState("");
  const [locationMode, setLocationMode] = useState("worldwide");
  const [location, setLocation] = useState("");
  const [workType, setWorkType] = useState("remote");
  const [resultPage, setResultPage] = useState(1);
  const [discoveryPages, setDiscoveryPages] = useState(1);
  const [maxCompanies, setMaxCompanies] = useState(60);
  const [freshnessDays, setFreshnessDays] = useState(7);
  const [rows, setRows] = useState([]);
  const [similarRows, setSimilarRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [error, setError] = useState("");

  const activePortal = PORTALS.find((p) => p.id === portal) || PORTALS[0];
  const isGlobal = portal === "global_careers";

  async function run(pageOverride = resultPage) {
    if (!query.trim()) {
      setError("Enter a job role or position.");
      return;
    }
    if (isGlobal && locationMode === "country" && !location.trim()) {
      setError("Enter a country or switch location to worldwide.");
      return;
    }
    setError("");
    setRows([]);
    setSimilarRows([]);
    setMeta(null);
    setAlertMessage("");
    setLoading(true);
    try {
      const res = await axios.post("/api/job_portal_scraper", {
        portal,
        query,
        location: locationMode === "worldwide" ? "" : location,
        locationMode,
        workType,
        resultPage: Math.min(Math.max(Number(pageOverride) || 1, 1), 15),
        perPage: 24,
        maxAgeDays: Math.min(Math.max(Number(freshnessDays) || 7, 1), 7),
        discoveryPages: Math.min(Math.max(Number(discoveryPages) || 1, 1), 3),
        maxCompanies: Math.min(Math.max(Number(maxCompanies) || 20, 5), 60),
      });
      setRows(res.data.data || []);
      setSimilarRows(res.data.similar_postings || []);
      setMeta(res.data.meta || null);
      setResultPage(Math.min(Math.max(Number(pageOverride) || 1, 1), 15));
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to search jobs.");
    } finally {
      setLoading(false);
    }
  }

  async function saveAlert() {
    if (!query.trim()) {
      setError("Enter a job role before saving an alert.");
      return;
    }
    setAlertSaving(true);
    setAlertMessage("");
    setError("");
    try {
      await axios.post("/api/job_alerts", {
        name: `${query.trim()} ${workType !== "all" ? workType : "jobs"}`,
        query: query.trim(),
        locationMode,
        location: locationMode === "worldwide" ? "" : location.trim(),
        workType,
        maxAgeDays: Math.min(Math.max(Number(freshnessDays) || 7, 1), 7),
      });
      setAlertMessage("Alert saved. Fresh direct-source matches will be tracked by the scheduled crawler.");
    } catch (e) {
      setError(e?.response?.data?.error || "Could not save this alert. Check Supabase settings.");
    } finally {
      setAlertSaving(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = [
      "title",
      "company",
      "location",
      "work_type",
      "salary",
      "experience",
      "skills",
      "posted",
      "posted_age_days",
      "freshness_verified",
      "source",
      "discovery_source",
      "confidence",
      "career_page",
      "url",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${(r[h] || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${portal}-${query || "jobs"}.csv`;
    a.click();
  }

  const stats = useMemo(() => [
    { label: "Jobs Found", count: rows.length, icon: "ri-briefcase-line", tone: "bg-orange-100 text-orange-700" },
    { label: "Companies", count: uniqueCount(rows, "company"), icon: "ri-building-2-line", tone: "bg-emerald-100 text-emerald-700" },
    { label: "Sources", count: uniqueCount(rows, "source"), icon: "ri-radar-line", tone: "bg-sky-100 text-sky-700" },
    { label: "Fresh Window", count: `${freshnessDays}d`, icon: "ri-time-line", tone: "bg-violet-100 text-violet-700" },
  ], [freshnessDays, rows]);

  return (
    <main className="relative overflow-hidden rounded-[1.5rem] bg-[#fff8ef] p-3 text-stone-950 sm:p-5 dark:bg-[#030504] dark:text-[#00FF41]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_2%,rgba(251,146,60,0.28),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.82),transparent_44%)] dark:bg-none" />
      <div className="relative space-y-5">
        <section className="grid gap-4 rounded-[1.35rem] border border-orange-100 bg-white/85 p-4 shadow-[0_24px_70px_rgba(119,72,32,0.10)] backdrop-blur lg:grid-cols-[minmax(0,1.25fr)_minmax(300px,0.75fr)] lg:p-6 dark:border-[#00FF41]/30 dark:bg-black">
          <div className="min-w-0">
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-black text-orange-800 ring-1 ring-orange-200 dark:bg-[#00FF41]/10 dark:text-[#00FF41] dark:ring-[#00FF41]/30">
                JOB INTELLIGENCE
              </span>
              <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 ring-1 ring-stone-200 dark:bg-[#00FF41]/10 dark:text-[#00FF41]/80 dark:ring-[#00FF41]/25">
                direct-source fresh jobs
              </span>
            </div>
            <h1 className="max-w-4xl text-3xl font-black leading-tight sm:text-4xl lg:text-5xl">
              Find open roles directly from company career pages.
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-6 text-stone-600 sm:text-base dark:text-[#00FF41]/70">
              Search worldwide or by country, scan organization career pages and ATS boards, and show only source-verified jobs posted in the last 1-7 days.
            </p>
          </div>

          <div className="rounded-[1.15rem] border border-stone-200 bg-[#1f1814] p-4 text-white dark:border-[#00FF41]/35 dark:bg-[#020502]">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black uppercase text-orange-200 dark:text-[#00FF41]/70">Discovery sources</p>
                <h2 className="text-lg font-black dark:text-[#00FF41]">Open intelligence map</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 text-stone-950 dark:bg-[#00FF41]">
                <i className="ri-route-line text-xl" />
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {SOURCE_CHIPS.map((source) => (
                <span key={source} className="rounded-full border border-white/10 bg-white/[0.08] px-2.5 py-1 text-[11px] font-bold text-orange-50 dark:border-[#00FF41]/25 dark:text-[#00FF41]/80">
                  {source}
                </span>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="rounded-[1rem] border border-stone-200 bg-white p-4 shadow-[0_14px_35px_rgba(68,45,24,0.06)] dark:border-[#00FF41]/25 dark:bg-black">
              <div className="flex items-center gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${s.tone}`}>
                  <i className={`${s.icon} text-xl`} />
                </span>
                <div>
                  <p className="text-xs font-bold uppercase text-stone-500 dark:text-[#00FF41]/55">{s.label}</p>
                  <p className="text-2xl font-black text-stone-950 dark:text-[#00FF41]">{s.count}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-[1.25rem] border border-orange-100 bg-white p-4 shadow-[0_18px_45px_rgba(104,62,30,0.08)] lg:p-5 dark:border-[#00FF41]/25 dark:bg-black">
          <div className="mb-5 flex flex-wrap gap-2" role="tablist" aria-label="Job search source">
            {PORTALS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setPortal(p.id);
                  setRows([]);
                  setSimilarRows([]);
                  setMeta(null);
                  setError("");
                }}
                className={`flex min-h-11 items-center gap-2 rounded-2xl border px-4 text-sm font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                  portal === p.id
                    ? "border-stone-950 bg-stone-950 text-white shadow-[0_14px_30px_rgba(43,30,18,0.18)] dark:border-[#00FF41] dark:bg-[#00FF41] dark:text-black"
                    : "border-orange-100 bg-[#fff8ef] text-stone-700 hover:border-orange-300 hover:text-orange-800 dark:border-[#00FF41]/25 dark:bg-[#00FF41]/5 dark:text-[#00FF41]/75"
                }`}
                aria-selected={portal === p.id}
                role="tab"
              >
                <i className={p.icon} />
                {p.label}
                {p.badge && <span className="rounded-full bg-orange-100 px-2 py-0.5 text-[10px] text-orange-800 dark:bg-orange-200 dark:text-stone-950">{p.badge}</span>}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-4">
              <label htmlFor="job-role" className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">
                Job role / position
              </label>
              <input
                id="job-role"
                className="ti-form-input min-h-12 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Product Designer, React Developer"
                onKeyDown={(e) => e.key === "Enter" && run(1)}
              />
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-3">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">
                Type
              </label>
              <div className="grid grid-cols-2 gap-2">
                {WORK_TYPES.map((type) => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => setWorkType(type.id)}
                    className={`min-h-10 rounded-xl border px-2 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      workType === type.id
                        ? "border-orange-500 bg-orange-100 text-orange-800 dark:border-[#00FF41] dark:bg-[#00FF41] dark:text-black"
                        : "border-stone-200 text-stone-600 hover:border-orange-200 dark:border-[#00FF41]/25 dark:text-[#00FF41]/70"
                    }`}
                  >
                    <i className={`${type.icon} mr-1`} />
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="col-span-12 md:col-span-6 lg:col-span-3">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">
                Location
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setLocationMode("worldwide")}
                  className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    locationMode === "worldwide"
                      ? "border-orange-500 bg-orange-100 text-orange-800 dark:border-[#00FF41] dark:bg-[#00FF41] dark:text-black"
                      : "border-stone-200 text-stone-600 hover:border-orange-200 dark:border-[#00FF41]/25 dark:text-[#00FF41]/70"
                  }`}
                >
                  Worldwide
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode("country")}
                  className={`min-h-10 rounded-xl border px-3 text-xs font-bold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    locationMode === "country"
                      ? "border-orange-500 bg-orange-100 text-orange-800 dark:border-[#00FF41] dark:bg-[#00FF41] dark:text-black"
                      : "border-stone-200 text-stone-600 hover:border-orange-200 dark:border-[#00FF41]/25 dark:text-[#00FF41]/70"
                  }`}
                >
                  Country
                </button>
              </div>
              <input
                className="ti-form-input mt-2 min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm disabled:opacity-50 dark:border-[#00FF41]/25 dark:bg-black"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder={locationMode === "worldwide" ? "Worldwide search" : "e.g. Canada, Germany, Nigeria"}
                disabled={locationMode === "worldwide"}
              />
            </div>

            <div className="col-span-12 lg:col-span-2">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">
                Paging
              </label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-[10px] font-black uppercase text-stone-400 dark:text-[#00FF41]/45">Result page</span>
                  <input
                    id="result-page"
                    type="number"
                    className="ti-form-input min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                    value={resultPage}
                    min={1}
                    max={15}
                    onChange={(e) => setResultPage(e.target.value)}
                    aria-label="Result page, 1 to 15"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[10px] font-black uppercase text-stone-400 dark:text-[#00FF41]/45">Max age</span>
                  <input
                    type="number"
                    className="ti-form-input min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                    value={freshnessDays}
                    min={1}
                    max={7}
                    onChange={(e) => setFreshnessDays(e.target.value)}
                    aria-label="Maximum job age in days"
                  />
                </div>
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block text-[10px] font-black uppercase text-stone-400 dark:text-[#00FF41]/45">Discover</span>
                  <input
                    type="number"
                    className="ti-form-input min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                    value={discoveryPages}
                    min={1}
                    max={3}
                    onChange={(e) => setDiscoveryPages(e.target.value)}
                    aria-label="Discovery pages"
                  />
                </div>
                <div>
                  <span className="mb-1 block text-[10px] font-black uppercase text-stone-400 dark:text-[#00FF41]/45">Boards</span>
                  <input
                    type="number"
                    className="ti-form-input min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                    value={maxCompanies}
                    min={5}
                    max={60}
                    disabled={!isGlobal}
                    onChange={(e) => setMaxCompanies(e.target.value)}
                    aria-label="Maximum discovered company boards to scan"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => run(1)}
              disabled={loading}
              className="bs-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border px-5 text-sm font-black shadow-[0_14px_30px_rgba(41,30,20,0.20)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              {loading ? (
                <>
                  <span className="ti-spinner h-4 w-4 border-white/60 dark:border-black/40" />
                  Searching careers...
                </>
              ) : (
                <>
                  <i className="ri-search-eye-line" />
                  Search {activePortal.label}
                </>
              )}
            </button>
            {rows.length > 0 && (
              <button
                type="button"
                onClick={exportCSV}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-bold text-stone-700 transition hover:border-orange-200 hover:text-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/25 dark:bg-black dark:text-[#00FF41]"
              >
                <i className="ri-download-line" />
                Export CSV ({rows.length})
              </button>
            )}
            <button
              type="button"
              onClick={saveAlert}
              disabled={alertSaving || !query.trim()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-orange-200 bg-orange-50 px-4 text-sm font-bold text-orange-800 transition hover:bg-orange-100 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/30 dark:bg-[#00FF41]/10 dark:text-[#00FF41]"
            >
              <i className={alertSaving ? "ri-loader-4-line animate-spin" : "ri-notification-3-line"} />
              Save Alert
            </button>
            {meta?.sources && (
              <span className="text-xs font-semibold text-stone-500 dark:text-[#00FF41]/55">
                Page {meta.resultPage} of {meta.totalPages}; showing {meta.perPage} per page from {meta.total} fresh direct-source matches.
              </span>
            )}
          </div>
          {error && <p className="mt-3 text-sm font-semibold text-rose-600">{error}</p>}
          {alertMessage && <p className="mt-3 text-sm font-semibold text-emerald-700 dark:text-[#00FF41]">{alertMessage}</p>}
        </section>

        <section className="overflow-hidden rounded-[1.25rem] border border-stone-200 bg-white shadow-[0_18px_45px_rgba(104,62,30,0.08)] dark:border-[#00FF41]/25 dark:bg-black">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 px-4 py-4 dark:border-[#00FF41]/20">
            <div>
              <p className="text-xs font-black uppercase text-orange-700 dark:text-[#00FF41]/60">Results</p>
              <h2 className="text-lg font-black text-stone-950 dark:text-[#00FF41]">
                Jobs Found ({meta?.total ?? rows.length})
              </h2>
            </div>
            <span className="rounded-full bg-[#fff8ef] px-3 py-1 text-xs font-bold text-stone-600 ring-1 ring-orange-100 dark:bg-[#00FF41]/10 dark:text-[#00FF41] dark:ring-[#00FF41]/25">
              {activePortal.label}
            </span>
          </div>
          <div className="overflow-x-auto">
            {rows.length > 0 ? (
              <table className="w-full min-w-[1100px] text-sm">
                <thead className="bg-[#fff8ef] dark:bg-[#00FF41]/5">
                  <tr>
                    {["#", "Role", "Company", "Location", "Type", "Source", "Confidence", "Posted", "URL"].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-black uppercase text-stone-500 dark:text-[#00FF41]/60">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-[#00FF41]/15">
                  {rows.map((r, i) => (
                    <tr key={`${r.url || r.title}-${i}`} className="transition hover:bg-orange-50/60 dark:hover:bg-[#00FF41]/5">
                      <td className="px-4 py-3 text-xs font-mono text-stone-400">{i + 1}</td>
                      <td className="max-w-[260px] px-4 py-3">
                        <p className="text-sm font-black text-stone-900 dark:text-[#00FF41]">{r.title || "-"}</p>
                        {r.skills && <p className="mt-1 truncate text-xs text-stone-500 dark:text-[#00FF41]/50">{r.skills}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-stone-700 dark:text-[#00FF41]/80">{r.company || "-"}</td>
                      <td className="max-w-[210px] px-4 py-3 text-xs text-stone-500 dark:text-[#00FF41]/60">{r.location || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-black text-orange-800 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
                          {r.work_type || "not specified"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-stone-700 dark:text-[#00FF41]/80">{r.source || "-"}</p>
                        <p className="mt-0.5 text-[11px] text-stone-400 dark:text-[#00FF41]/45">{r.discovery_source || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-50 px-2 py-1 text-[11px] font-black text-emerald-700 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
                          {r.confidence || "medium"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500 dark:text-[#00FF41]/60">{r.posted || "-"}</td>
                      <td className="px-4 py-3">
                        {r.url ? (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center gap-1 rounded-full border border-orange-200 px-3 text-xs font-bold text-orange-700 transition hover:bg-orange-50 dark:border-[#00FF41]/30 dark:text-[#00FF41] dark:hover:bg-[#00FF41]/10">
                            View
                            <i className="ri-arrow-right-up-line" />
                          </a>
                        ) : (
                          <span className="text-xs text-stone-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="flex min-h-64 flex-col items-center justify-center px-4 py-12 text-center">
                <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-700 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
                  <i className={`${loading ? "ri-loader-4-line animate-spin" : "ri-briefcase-search-line"} text-2xl`} />
                </span>
                <p className="text-sm font-bold text-stone-500 dark:text-[#00FF41]/60">
                  {loading ? `Searching ${activePortal.label}...` : "No jobs to display yet"}
                </p>
              </div>
            )}
          </div>
          {meta?.totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-stone-100 px-4 py-3 dark:border-[#00FF41]/20">
              <p className="text-xs font-bold text-stone-500 dark:text-[#00FF41]/60">
                Page {meta.resultPage} of {meta.totalPages}, 24 jobs per page, max 15 pages.
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => run(Math.max(1, Number(resultPage) - 1))}
                  disabled={loading || Number(resultPage) <= 1}
                  className="min-h-9 rounded-full border border-stone-200 px-3 text-xs font-bold text-stone-600 transition hover:border-orange-200 hover:text-orange-800 disabled:opacity-40 dark:border-[#00FF41]/25 dark:text-[#00FF41]/70"
                >
                  <i className="ri-arrow-left-s-line" /> Previous
                </button>
                <button
                  type="button"
                  onClick={() => run(Math.min(15, Number(resultPage) + 1))}
                  disabled={loading || Number(resultPage) >= Number(meta.totalPages)}
                  className="min-h-9 rounded-full border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-800 transition hover:bg-orange-100 disabled:opacity-40 dark:border-[#00FF41]/30 dark:bg-[#00FF41]/10 dark:text-[#00FF41]"
                >
                  Next <i className="ri-arrow-right-s-line" />
                </button>
              </div>
            </div>
          )}
        </section>

        {similarRows.length > 0 && (
          <section className="rounded-[1.25rem] border border-stone-200 bg-white p-4 shadow-[0_18px_45px_rgba(104,62,30,0.08)] dark:border-[#00FF41]/25 dark:bg-black">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-orange-700 dark:text-[#00FF41]/60">Similar postings</p>
                <h2 className="text-lg font-black text-stone-950 dark:text-[#00FF41]">
                  Related fresh roles ({Math.min(similarRows.length, meta?.similarPerPage || 12)})
                </h2>
              </div>
              <span className="rounded-full bg-[#fff8ef] px-3 py-1 text-xs font-bold text-stone-600 ring-1 ring-orange-100 dark:bg-[#00FF41]/10 dark:text-[#00FF41] dark:ring-[#00FF41]/25">
                12 per page
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {similarRows.map((job, index) => (
                <article
                  key={`${job.url || job.title}-similar-${index}`}
                  className="group rounded-2xl border border-orange-100 bg-[#fffaf3] p-4 transition hover:-translate-y-0.5 hover:border-orange-300 hover:shadow-[0_14px_35px_rgba(104,62,30,0.10)] dark:border-[#00FF41]/20 dark:bg-[#00FF41]/5"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="line-clamp-2 text-sm font-black text-stone-950 dark:text-[#00FF41]">{job.title}</p>
                      <p className="mt-1 text-xs font-bold text-stone-600 dark:text-[#00FF41]/65">{job.company}</p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white px-2 py-1 text-[10px] font-black text-orange-700 ring-1 ring-orange-100 dark:bg-black dark:text-[#00FF41] dark:ring-[#00FF41]/20">
                      {job.posted_age_days ?? "?"}d
                    </span>
                  </div>
                  <div className="mb-3 flex flex-wrap gap-2 text-[11px] font-bold">
                    <span className="rounded-full bg-orange-100 px-2 py-1 text-orange-800 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">{job.work_type || "not specified"}</span>
                    <span className="rounded-full bg-stone-100 px-2 py-1 text-stone-600 dark:bg-[#00FF41]/10 dark:text-[#00FF41]/70">{job.source || "Company board"}</span>
                  </div>
                  <p className="mb-3 line-clamp-2 text-xs text-stone-500 dark:text-[#00FF41]/55">{job.location || "Worldwide / not specified"}</p>
                  <a
                    href={job.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1 rounded-full border border-orange-200 bg-white px-3 text-xs font-bold text-orange-700 transition group-hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/30 dark:bg-black dark:text-[#00FF41]"
                  >
                    View posting
                    <i className="ri-arrow-right-up-line" />
                  </a>
                </article>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
