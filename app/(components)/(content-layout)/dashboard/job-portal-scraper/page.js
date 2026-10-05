"use client";
import { useEffect, useMemo, useState } from "react";
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

const COMPANY_FILTERS = [
  { id: "all", label: "All trusted", icon: "ri-shield-check-line" },
  { id: "startups", label: "Startups & others", icon: "ri-rocket-line" },
  { id: "big_tech", label: "Big tech", icon: "ri-building-4-line" },
];

const ROLE_PRESETS = [
  { label: "Frontend", query: "Frontend Engineer", workType: "remote", icon: "ri-layout-4-line" },
  { label: "Data", query: "Data Analyst", workType: "remote", icon: "ri-bar-chart-box-line" },
  { label: "Product", query: "Product Manager", workType: "hybrid", icon: "ri-road-map-line" },
  { label: "Design", query: "Product Designer", workType: "remote", icon: "ri-palette-line" },
];

const JOB_PROFILE_PREF_KEY = "job_application_profile";
const JOB_PROFILE_LOCAL_KEY = "bs_job_application_profile";

function uniqueCount(rows, key) {
  return new Set(rows.map((row) => row[key]).filter(Boolean)).size;
}

function visibleForCompanyMix(row, filter) {
  if (!filter || filter === "all") return true;
  if (filter === "big_tech") return row.company_type === "big_tech";
  if (filter === "startups") return row.company_type !== "big_tech";
  return true;
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
  const [companyFilter, setCompanyFilter] = useState("all");
  const [rows, setRows] = useState([]);
  const [allRows, setAllRows] = useState([]);
  const [similarRows, setSimilarRows] = useState([]);
  const [allSimilarRows, setAllSimilarRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [loading, setLoading] = useState(false);
  const [alertSaving, setAlertSaving] = useState(false);
  const [alertMessage, setAlertMessage] = useState("");
  const [error, setError] = useState("");
  const [profileName, setProfileName] = useState("");
  const [targetTitle, setTargetTitle] = useState("");
  const [cvText, setCvText] = useState("");
  const [profileLinks, setProfileLinks] = useState("");
  const [aiProvider, setAiProvider] = useState("mistral");
  const [applicationDraft, setApplicationDraft] = useState(null);
  const [applicationJob, setApplicationJob] = useState(null);
  const [applicationLoading, setApplicationLoading] = useState(false);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [profileSavedAt, setProfileSavedAt] = useState(null);
  const [profileStorageMode, setProfileStorageMode] = useState("local");
  const [showProfileWorkspace, setShowProfileWorkspace] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  const activePortal = PORTALS.find((p) => p.id === portal) || PORTALS[0];
  const isGlobal = portal === "global_careers";
  const hasProfileEvidence = Boolean(cvText.trim() || profileLinks.trim());

  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        await fetch("/api/app_user/", { cache: "no-store" });
        const res = await fetch(`/api/user_preferences/?key=${JOB_PROFILE_PREF_KEY}`, { cache: "no-store" });
        const data = await res.json();
        setProfileStorageMode(data.database_configured === false ? "local" : "cloud");
        const saved = data.value || JSON.parse(localStorage.getItem(JOB_PROFILE_LOCAL_KEY) || "null");
        if (!cancelled && saved) {
          setProfileName(saved.profileName || "");
          setTargetTitle(saved.targetTitle || "");
          setCvText(saved.cvText || "");
          setProfileLinks(saved.profileLinks || "");
          setAiProvider(saved.aiProvider || "mistral");
          setQuery(saved.query || "");
          setLocationMode(saved.locationMode || "worldwide");
          setLocation(saved.location || "");
          setWorkType(saved.workType || "remote");
          setFreshnessDays(saved.freshnessDays || 7);
          setCompanyFilter(saved.companyFilter || "all");
        }
      } catch {
        setProfileStorageMode("local");
        try {
          const saved = JSON.parse(localStorage.getItem(JOB_PROFILE_LOCAL_KEY) || "null");
          if (!cancelled && saved) {
            setProfileName(saved.profileName || "");
            setTargetTitle(saved.targetTitle || "");
            setCvText(saved.cvText || "");
            setProfileLinks(saved.profileLinks || "");
            setAiProvider(saved.aiProvider || "mistral");
            setQuery(saved.query || "");
            setLocationMode(saved.locationMode || "worldwide");
            setLocation(saved.location || "");
            setWorkType(saved.workType || "remote");
            setFreshnessDays(saved.freshnessDays || 7);
            setCompanyFilter(saved.companyFilter || "all");
          }
        } catch {}
      } finally {
        if (!cancelled) setProfileLoaded(true);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!profileLoaded) return;
    const value = {
      profileName,
      targetTitle,
      cvText,
      profileLinks,
      aiProvider,
      query,
      locationMode,
      location,
      workType,
      freshnessDays,
      companyFilter,
      updatedAt: new Date().toISOString(),
    };
    localStorage.setItem(JOB_PROFILE_LOCAL_KEY, JSON.stringify(value));
    const saveTimer = setTimeout(async () => {
      try {
        await fetch("/api/user_preferences/", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: JOB_PROFILE_PREF_KEY, value }),
        });
        setProfileSavedAt(new Date());
      } catch {}
    }, 700);
    return () => clearTimeout(saveTimer);
  }, [profileLoaded, profileName, targetTitle, cvText, profileLinks, aiProvider, query, locationMode, location, workType, freshnessDays, companyFilter]);

  useEffect(() => {
    setRows(allRows.filter((row) => visibleForCompanyMix(row, companyFilter)));
    setSimilarRows(allSimilarRows.filter((row) => visibleForCompanyMix(row, companyFilter)));
  }, [allRows, allSimilarRows, companyFilter]);

  async function run(pageOverride = resultPage, filterOverride = companyFilter, preserveCurrentRows = false) {
    if (!query.trim()) {
      setError("Enter a job role or position.");
      return;
    }
    if (isGlobal && locationMode === "country" && !location.trim()) {
      setError("Enter a country or switch location to worldwide.");
      return;
    }
    setError("");
    if (!preserveCurrentRows) {
      setRows([]);
      setAllRows([]);
      setSimilarRows([]);
      setAllSimilarRows([]);
    }
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
        companyFilter: filterOverride,
        sourceMode: filterOverride === "big_tech" ? "known_boards" : "all_trusted",
      });
      setAllRows(res.data.data || []);
      setAllSimilarRows(res.data.similar_postings || []);
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

  function handleCvUpload(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCvText(String(reader.result || "").slice(0, 20000));
    reader.readAsText(file);
  }

  async function prepareApplication(job) {
    if (!cvText.trim() && !profileLinks.trim()) {
      setShowProfileWorkspace(true);
      setError("Add CV text, upload a text-readable CV, or add portfolio/social links before preparing an application.");
      return;
    }
    setError("");
    setApplicationLoading(true);
    setApplicationJob(job);
    setApplicationDraft(null);
    try {
      const res = await axios.post("/api/job_application", {
        provider: aiProvider,
        job,
        profile: {
          name: profileName,
          targetTitle,
          cvText,
          links: profileLinks,
        },
      });
      setApplicationDraft(res.data);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to prepare this application.");
    } finally {
      setApplicationLoading(false);
    }
  }

  function downloadApplication() {
    if (!applicationDraft?.application) return;
    const safeTitle = `${applicationJob?.company || "company"}-${applicationJob?.title || "application"}`
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 80);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([applicationDraft.application], { type: "text/markdown" }));
    a.download = `${safeTitle || "application"}.md`;
    a.click();
  }

  async function clearSavedProfile() {
    setProfileName("");
    setTargetTitle("");
    setCvText("");
    setProfileLinks("");
    setAiProvider("mistral");
    setQuery("");
    setLocationMode("worldwide");
    setLocation("");
    setWorkType("remote");
    setFreshnessDays(7);
    setCompanyFilter("all");
    setAllRows([]);
    setAllSimilarRows([]);
    setApplicationDraft(null);
    setApplicationJob(null);
    localStorage.removeItem(JOB_PROFILE_LOCAL_KEY);
    try {
      await fetch("/api/user_preferences/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: JOB_PROFILE_PREF_KEY, value: null }),
      });
    } catch {}
    setProfileSavedAt(null);
  }

  function applyPreset(preset) {
    setQuery(preset.query);
    setWorkType(preset.workType);
    setResultPage(1);
    setError("");
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
      "trust_score",
      "trust_label",
      "trust_reasons",
      "trust_warnings",
      "company_type",
      "application_score",
      "application_priority",
      "resume_keywords",
      "interview_strategy",
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
          .map((h) => `"${(Array.isArray(r[h]) ? r[h].join("; ") : r[h] || "").toString().replace(/"/g, '""')}"`)
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
                <p className="text-xs font-black uppercase text-orange-200 dark:text-[#00FF41]/70">Simple workflow</p>
                <h2 className="text-lg font-black dark:text-[#00FF41]">Start with one search</h2>
              </div>
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 text-stone-950 dark:bg-[#00FF41]">
                <i className="ri-compass-3-line text-xl" />
              </span>
            </div>
            <div className="space-y-3">
              {[
                ["1", "Enter a role", "Use a normal title like Frontend Engineer or Product Designer."],
                ["2", "Pick work style", "Remote, hybrid, physical, or any location style."],
                ["3", "Search and review", "Open the source job, then optionally prepare an application."],
              ].map(([step, title, copy]) => (
                <div key={step} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.08] p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-orange-300 text-xs font-black text-stone-950 dark:bg-[#00FF41]">
                    {step}
                  </span>
                  <div>
                    <p className="text-sm font-black text-white dark:text-[#00FF41]">{title}</p>
                    <p className="mt-0.5 text-xs leading-5 text-orange-50/75 dark:text-[#00FF41]/70">{copy}</p>
                  </div>
                </div>
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

        <section className="rounded-[1.25rem] border border-stone-200 bg-white p-4 shadow-[0_18px_45px_rgba(104,62,30,0.08)] lg:p-5 dark:border-[#00FF41]/25 dark:bg-black">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-black uppercase text-orange-700 dark:text-[#00FF41]/60">Optional</p>
              <h2 className="text-lg font-black text-stone-950 dark:text-[#00FF41]">Application helper</h2>
              <p className="mt-1 text-xs font-bold text-stone-500 dark:text-[#00FF41]/55">
                {profileLoaded
                  ? hasProfileEvidence
                    ? `${profileSavedAt ? `Saved ${profileSavedAt.toLocaleTimeString()}` : "Saved automatically"} (${profileStorageMode === "cloud" ? "per-user cloud profile" : "this browser"})`
                    : "Add this later when you want tailored application drafts."
                  : "Loading saved profile..."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {showProfileWorkspace && ["mistral", "claude", "codex", "template"].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setAiProvider(provider)}
                  className={`min-h-9 rounded-full border px-3 text-xs font-black capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                    aiProvider === provider
                      ? "border-orange-500 bg-orange-100 text-orange-800 dark:border-[#00FF41] dark:bg-[#00FF41] dark:text-black"
                      : "border-stone-200 text-stone-600 hover:border-orange-200 dark:border-[#00FF41]/25 dark:text-[#00FF41]/70"
                  }`}
                >
                  {provider}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowProfileWorkspace((open) => !open)}
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 text-xs font-black text-orange-800 transition hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/30 dark:bg-[#00FF41]/10 dark:text-[#00FF41]"
              >
                <i className={showProfileWorkspace ? "ri-subtract-line" : "ri-add-line"} />
                {showProfileWorkspace ? "Hide" : "Set up"}
              </button>
              <button
                type="button"
                onClick={clearSavedProfile}
                disabled={!hasProfileEvidence && !profileName && !targetTitle}
                className="min-h-9 rounded-full border border-rose-200 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:border-rose-400/40 dark:text-rose-300"
              >
                Clear
              </button>
            </div>
          </div>

          {!showProfileWorkspace ? (
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
              <div className="rounded-2xl border border-orange-100 bg-[#fff8ef] p-4 dark:border-[#00FF41]/20 dark:bg-[#00FF41]/5">
                <p className="text-sm font-black text-stone-900 dark:text-[#00FF41]">
                  Search works without a CV.
                </p>
                <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-[#00FF41]/65">
                  Use the role search first. Open this helper only when you want Bubble Scraper to prepare a tailored application draft from your CV text and links.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowProfileWorkspace(true)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-stone-200 bg-white px-4 text-sm font-black text-stone-800 transition hover:border-orange-300 hover:text-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/25 dark:bg-black dark:text-[#00FF41]"
              >
                <i className="ri-file-edit-line" />
                Add CV details
              </button>
            </div>
          ) : (
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">Name</label>
              <input
                className="ti-form-input min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Candidate name"
              />
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">Target title</label>
              <input
                className="ti-form-input min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                value={targetTitle}
                onChange={(e) => setTargetTitle(e.target.value)}
                placeholder="e.g. Frontend Engineer"
              />
            </div>
            <div className="col-span-12 xl:col-span-6">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">Portfolio and social links</label>
              <input
                className="ti-form-input min-h-11 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                value={profileLinks}
                onChange={(e) => setProfileLinks(e.target.value)}
                placeholder="https://portfolio.com, LinkedIn, GitHub, X, TikTok"
              />
            </div>
            <div className="col-span-12 xl:col-span-4">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">Upload CV</label>
              <input
                type="file"
                accept=".txt,.md,.csv,.pdf,.doc,.docx"
                onChange={(e) => handleCvUpload(e.target.files?.[0])}
                className="block w-full cursor-pointer rounded-2xl border border-orange-100 bg-[#fff8ef] text-sm file:mr-3 file:min-h-11 file:border-0 file:bg-orange-100 file:px-4 file:text-sm file:font-black file:text-orange-800 dark:border-[#00FF41]/25 dark:bg-black dark:file:bg-[#00FF41] dark:file:text-black"
              />
            </div>
            <div className="col-span-12 xl:col-span-8">
              <label className="mb-1 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">CV text / profile evidence</label>
              <textarea
                className="ti-form-input min-h-28 rounded-2xl border-orange-100 bg-[#fff8ef] text-sm dark:border-[#00FF41]/25 dark:bg-black"
                value={cvText}
                onChange={(e) => setCvText(e.target.value)}
                placeholder="Paste the CV text or verified career evidence here. The generator will not invent missing experience."
              />
            </div>
          </div>
          )}
        </section>

        <section className="rounded-[1.25rem] border border-orange-100 bg-white p-4 shadow-[0_18px_45px_rgba(104,62,30,0.08)] lg:p-5 dark:border-[#00FF41]/25 dark:bg-black">
          <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-black uppercase text-orange-700 dark:text-[#00FF41]/60">Start here</p>
              <h2 className="text-lg font-black text-stone-950 dark:text-[#00FF41]">Search fresh direct-source jobs</h2>
              <p className="mt-1 text-sm leading-6 text-stone-600 dark:text-[#00FF41]/65">
                Enter a role, choose the work style, then search. Leave advanced options alone unless you need deeper crawling.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {ROLE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="inline-flex min-h-9 items-center gap-2 rounded-full border border-orange-100 bg-[#fff8ef] px-3 text-xs font-black text-stone-700 transition hover:border-orange-300 hover:text-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/25 dark:bg-[#00FF41]/5 dark:text-[#00FF41]/75"
                >
                  <i className={preset.icon} />
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className={`${showAdvancedSearch ? "mb-5 flex flex-wrap gap-2" : "hidden"}`} role="tablist" aria-label="Job search source">
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

            <div className={`${showAdvancedSearch ? "col-span-12 lg:col-span-2" : "hidden"}`}>
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

          <div className="mt-4">
            <div>
              <label className="mb-2 block text-sm font-bold text-stone-700 dark:text-[#00FF41]/75">
                Company mix
              </label>
              <div className="flex flex-wrap gap-2">
                {COMPANY_FILTERS.map((filter) => (
                  <button
                    key={filter.id}
                    type="button"
                    onClick={() => {
                      setCompanyFilter(filter.id);
                      setResultPage(1);
                      if (query.trim() && meta) run(1, filter.id, true);
                    }}
                    className={`inline-flex min-h-10 items-center gap-2 rounded-full border px-3 text-xs font-black transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                      companyFilter === filter.id
                        ? "border-orange-500 bg-orange-100 text-orange-800 dark:border-[#00FF41] dark:bg-[#00FF41] dark:text-black"
                        : "border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:text-orange-800 dark:border-[#00FF41]/25 dark:bg-black dark:text-[#00FF41]/70"
                    }`}
                  >
                    <i className={filter.icon} />
                    {filter.label}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-xs font-semibold text-stone-500 dark:text-[#00FF41]/55">
                All trusted blends broad discovery with known verified boards. Startups & others hides big tech. Big tech focuses on known verified company boards.
              </p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowAdvancedSearch((open) => !open)}
              className="inline-flex min-h-9 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 text-xs font-black text-stone-600 transition hover:border-orange-200 hover:text-orange-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/25 dark:bg-black dark:text-[#00FF41]/70"
            >
              <i className={showAdvancedSearch ? "ri-equalizer-line" : "ri-settings-3-line"} />
              {showAdvancedSearch ? "Hide advanced options" : "Advanced options"}
            </button>
            <span className="text-xs font-bold text-stone-400 dark:text-[#00FF41]/45">
              Fresh jobs only: {freshnessDays} day{Number(freshnessDays) === 1 ? "" : "s"}
              {meta?.directSeedBoards ? `; known seed boards active: ${meta.directSeedBoards}` : ""}
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => run(1)}
              disabled={loading || !query.trim()}
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
                {meta.companyFilter && ` Company mix: ${meta.companyFilter.replace(/_/g, " ")}.`}
                {meta.sourceMode === "known_boards" && ` Known board seeds active (${meta.directSeedBoards}).`}
                {meta.sourceMix && ` Mix: ${Object.entries(meta.sourceMix).map(([source, count]) => `${source} ${count}`).join(", ")}.`}
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
              <table className="w-full min-w-[1320px] text-sm">
                <thead className="bg-[#fff8ef] dark:bg-[#00FF41]/5">
                  <tr>
                    {["#", "Role", "Company", "Location", "Type", "Fit", "Source", "Trust", "Posted", "Action"].map((h) => (
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
                        {r.resume_keywords?.length > 0 && <p className="mt-1 truncate text-xs text-stone-500 dark:text-[#00FF41]/50">{r.resume_keywords.slice(0, 5).join(", ")}</p>}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-stone-700 dark:text-[#00FF41]/80">
                        <p>{r.company || "-"}</p>
                        {r.company_type && (
                          <p className="mt-1 text-[11px] font-black uppercase text-stone-400 dark:text-[#00FF41]/45">
                            {r.company_type.replace(/_/g, " ")}
                          </p>
                        )}
                      </td>
                      <td className="max-w-[210px] px-4 py-3 text-xs text-stone-500 dark:text-[#00FF41]/60">{r.location || "-"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-orange-100 px-2 py-1 text-[11px] font-black text-orange-800 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
                          {r.work_type || "not specified"}
                        </span>
                      </td>
                      <td className="max-w-[210px] px-4 py-3">
                        <p className="text-sm font-black text-stone-950 dark:text-[#00FF41]">{r.application_score ?? "-"}%</p>
                        <p className="mt-0.5 text-[11px] font-bold text-emerald-700 dark:text-[#00FF41]/70">{r.application_priority || ""}</p>
                        {r.interview_strategy?.[0] && <p className="mt-1 line-clamp-2 text-[11px] text-stone-500 dark:text-[#00FF41]/50">{r.interview_strategy[0]}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-bold text-stone-700 dark:text-[#00FF41]/80">{r.source || "-"}</p>
                        <p className="mt-0.5 text-[11px] text-stone-400 dark:text-[#00FF41]/45">{r.discovery_source || ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          title={[...(r.trust_reasons || []), ...(r.trust_warnings || [])].join(" | ")}
                          className={`rounded-full px-2 py-1 text-[11px] font-black ${
                            r.trust_label === "Verified"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-[#00FF41]/10 dark:text-[#00FF41]"
                              : r.trust_label === "Likely legit"
                                ? "bg-sky-50 text-sky-700 dark:bg-[#00FF41]/10 dark:text-[#00FF41]"
                                : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                          }`}
                        >
                          {r.trust_label || r.confidence || "review"} {r.trust_score !== undefined ? `${r.trust_score}%` : ""}
                        </span>
                        {r.trust_reasons?.[0] && (
                          <p className="mt-1 line-clamp-2 text-[11px] text-stone-500 dark:text-[#00FF41]/50">{r.trust_reasons[0]}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-stone-500 dark:text-[#00FF41]/60">{r.posted || "-"}</td>
                      <td className="px-4 py-3">
                        {r.url ? (
                          <div className="flex flex-col gap-2">
                            <button
                              type="button"
                              onClick={() => prepareApplication(r)}
                              disabled={applicationLoading}
                              className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 text-xs font-black text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50 dark:border-[#00FF41]/30 dark:bg-[#00FF41]/10 dark:text-[#00FF41]"
                            >
                              <i className={applicationLoading && applicationJob?.url === r.url ? "ri-loader-4-line animate-spin" : "ri-file-edit-line"} />
                              Prepare
                            </button>
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-8 items-center justify-center gap-1 rounded-full border border-orange-200 px-3 text-xs font-bold text-orange-700 transition hover:bg-orange-50 dark:border-[#00FF41]/30 dark:text-[#00FF41] dark:hover:bg-[#00FF41]/10">
                              View
                              <i className="ri-arrow-right-up-line" />
                            </a>
                          </div>
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
                  {loading ? `Searching ${activePortal.label}...` : "Enter a role above, or choose a preset, to find fresh direct-source jobs."}
                </p>
                {!loading && (
                  <div className="mt-4 flex flex-wrap justify-center gap-2">
                    {ROLE_PRESETS.slice(0, 3).map((preset) => (
                      <button
                        key={`empty-${preset.label}`}
                        type="button"
                        onClick={() => applyPreset(preset)}
                        className="inline-flex min-h-9 items-center gap-2 rounded-full border border-orange-100 bg-[#fff8ef] px-3 text-xs font-black text-orange-800 transition hover:border-orange-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 dark:border-[#00FF41]/25 dark:bg-[#00FF41]/5 dark:text-[#00FF41]"
                      >
                        <i className={preset.icon} />
                        {preset.query}
                      </button>
                    ))}
                  </div>
                )}
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

        {(applicationLoading || applicationDraft) && (
          <section className="rounded-[1.25rem] border border-emerald-100 bg-white p-4 shadow-[0_18px_45px_rgba(20,83,45,0.08)] dark:border-[#00FF41]/25 dark:bg-black">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-emerald-700 dark:text-[#00FF41]/60">Application pack</p>
                <h2 className="text-lg font-black text-stone-950 dark:text-[#00FF41]">
                  {applicationJob ? `${applicationJob.title} - ${applicationJob.company}` : "Preparing application"}
                </h2>
                {applicationDraft?.provider && (
                  <p className="mt-1 text-xs font-bold text-stone-500 dark:text-[#00FF41]/55">
                    Provider: {applicationDraft.provider}. Review before submitting.
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {applicationDraft?.application && (
                  <button
                    type="button"
                    onClick={downloadApplication}
                    className="inline-flex min-h-10 items-center gap-2 rounded-full border border-stone-200 bg-white px-4 text-xs font-black text-stone-700 transition hover:border-emerald-200 hover:text-emerald-700 dark:border-[#00FF41]/25 dark:bg-black dark:text-[#00FF41]"
                  >
                    <i className="ri-download-line" />
                    Download
                  </button>
                )}
              </div>
            </div>
            {applicationLoading ? (
              <div className="flex min-h-40 items-center justify-center gap-3 text-sm font-bold text-stone-500 dark:text-[#00FF41]/60">
                <span className="ti-spinner h-5 w-5 border-emerald-500/60" />
                Preparing truthful tailored materials...
              </div>
            ) : (
              <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap rounded-2xl border border-stone-100 bg-[#fbfaf8] p-4 text-sm leading-6 text-stone-800 dark:border-[#00FF41]/20 dark:bg-[#020502] dark:text-[#00FF41]/85">
                {applicationDraft?.application}
              </pre>
            )}
          </section>
        )}

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
