"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLanguage } from "../../../../../components/LanguageProvider";
import ResultsTable from "../../../../../components/ResultsTable";

// ── Stats helpers with local fallback ─────────────────────────────────────────
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}
export function trackRun(toolName) {
  if (typeof window === "undefined") return;
  try {
    fetch("/api/request_logs/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolName, status: "success" }),
    }).catch(() => {});
    const key = `sg_stats_${getTodayKey()}`;
    const stats = JSON.parse(localStorage.getItem(key) || "{}");
    stats.total = (stats.total || 0) + 1;
    stats.tools = stats.tools || {};
    stats.tools[toolName] = (stats.tools[toolName] || 0) + 1;
    localStorage.setItem(key, JSON.stringify(stats));
  } catch (_) {}
}

function getStats() {
  if (typeof window === "undefined") return { today: 0, total: 0, topTool: null };
  try {
    const todayKey = `sg_stats_${getTodayKey()}`;
    const todayStats = JSON.parse(localStorage.getItem(todayKey) || "{}");
    let total = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sg_stats_")) {
        const d = JSON.parse(localStorage.getItem(k) || "{}");
        total += d.total || 0;
      }
    }
    const tools = todayStats.tools || {};
    const topTool = Object.entries(tools).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
    return { today: todayStats.total || 0, total, topTool };
  } catch (_) {
    return { today: 0, total: 0, topTool: null };
  }
}

async function getServerStats() {
  try {
    const res = await fetch("/api/request_logs/", { cache: "no-store" });
    if (!res.ok) throw new Error("Stats unavailable");
    return await res.json();
  } catch (_) {
    return getStats();
  }
}

function getRecentlyUsedTools(toolList) {
  if (typeof window === "undefined") return [];
  try {
    const key = `sg_stats_${getTodayKey()}`;
    const stats = JSON.parse(localStorage.getItem(key) || "{}");
    const toolCounts = stats.tools || {};
    return Object.entries(toolCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, count]) => {
        const match = toolList.find(
          (t) => t.title.toLowerCase() === name.toLowerCase()
        );
        return match ? { ...match, runCount: count } : null;
      })
      .filter(Boolean);
  } catch (_) {
    return [];
  }
}

function getRecentlyUsedToolsFromStats(toolList, statTools = {}) {
  return Object.entries(statTools)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, count]) => {
      const match = toolList.find((tool) => tool.title.toLowerCase() === name.toLowerCase());
      return match ? { ...match, runCount: count } : null;
    })
    .filter(Boolean);
}

async function loadChatCache() {
  try {
    const res = await fetch("/api/user_preferences/?key=ai_chat_cache", { cache: "no-store" });
    if (!res.ok) throw new Error("Cache unavailable");
    return res.json();
  } catch (_) {
    const cached = localStorage.getItem("sg_ai_chat_cache");
    return { value: cached ? JSON.parse(cached) : null };
  }
}

async function saveChatCache(logs) {
  const value = { timestamp: Date.now(), logs };
  try {
    await fetch("/api/user_preferences/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ai_chat_cache", value }),
    });
  } catch (_) {
    localStorage.setItem("sg_ai_chat_cache", JSON.stringify(value));
  }
}

async function clearChatCache() {
  try {
    await fetch("/api/user_preferences/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "ai_chat_cache", value: null }),
    });
  } catch (_) {
    localStorage.removeItem("sg_ai_chat_cache");
  }
}

// ── Tool data ─────────────────────────────────────────────────────────────────
// status: "green" = works well | "yellow" = partial/bot-dependent | "red" = heavily blocked
const tools = [
  // Lead Gen
  { title: "Business Directory", href: "/dashboard/business-directory-scraper", icon: "ri-git-repository-line", color: "bg-yellow-50 text-yellow-600", category: "Lead Gen", status: "red" },
  { title: "Justdial Scraper",   href: "/dashboard/justdial-scraper",           icon: "ri-store-2-line",         color: "bg-orange-50 text-orange-500", category: "Lead Gen", status: "red" },
  { title: "Indiamart Scraper",  href: "/dashboard/indiamart-scraper",          icon: "ri-building-2-line",      color: "bg-teal-50 text-teal-500",     category: "Lead Gen", status: "red" },
  { title: "Sulekha Scraper",    href: "/dashboard/sulekha-scraper",            icon: "ri-service-line",         color: "bg-violet-50 text-violet-500", category: "Lead Gen", status: "red" },
  { title: "Email Scraper",      href: "/dashboard/email-scraper",              icon: "ri-mail-line",            color: "bg-rose-50 text-rose-500",     category: "Lead Gen", status: "green" },
  { title: "Phone Scraper",      href: "/dashboard/phone-number-scraper",       icon: "ri-phone-line",           color: "bg-cyan-50 text-cyan-500",     category: "Lead Gen", status: "green" },
  { title: "WA Number Scraper",  href: "/dashboard/whatsapp-number-scraper",    icon: "ri-whatsapp-line",        color: "bg-lime-50 text-lime-600",     category: "Lead Gen", status: "green", badge: "v16" },
  { title: "Google Maps",        href: "/dashboard/google-map-scraper",         icon: "ri-map-pin-line",         color: "bg-green-50 text-green-500",   category: "Lead Gen", status: "green" },
  { title: "Global Directory",   href: "/dashboard/global-directory-scraper",   icon: "ri-earth-line",           color: "bg-cyan-50 text-cyan-600",     category: "Lead Gen", status: "red",   badge: "v17" },
  // Social
  { title: "Social Media",       href: "/dashboard/social-media-scraper",       icon: "ri-share-line",           color: "bg-pink-50 text-pink-500",     category: "Social",   status: "yellow", badge: "v14" },
  { title: "Social Background",   href: "/dashboard/social-background-analysis", icon: "ri-user-search-line",     color: "bg-purple-50 text-purple-600", category: "Social",   status: "green",  badge: "v19" },
  { title: "FB Ad Library",      href: "/dashboard/facebook-ad-library",        icon: "ri-advertisement-line",   color: "bg-orange-50 text-orange-500", category: "Social",   status: "yellow", badge: "v17" },
  // eCommerce
  { title: "eCommerce",          href: "/dashboard/ecommerce-scraper",          icon: "ri-shopping-cart-line",   color: "bg-amber-50 text-amber-600",   category: "eCommerce", status: "red",  badge: "v14" },
  { title: "Myntra",             href: "/dashboard/myntra-scraper",             icon: "ri-shirt-line",           color: "bg-pink-50 text-pink-600",     category: "eCommerce", status: "red",  badge: "v15" },
  { title: "Snapdeal",           href: "/dashboard/snapdeal-scraper",           icon: "ri-store-line",           color: "bg-red-50 text-red-500",       category: "eCommerce", status: "yellow", badge: "v15" },
  // Corporate
  { title: "Corporate Scraper",  href: "/dashboard/corporate-scraper",          icon: "ri-building-4-line",      color: "bg-blue-50 text-blue-700",     category: "Corporate", status: "red",   badge: "v15" },
  { title: "Job Portals",        href: "/dashboard/job-portal-scraper",         icon: "ri-briefcase-line",       color: "bg-teal-50 text-teal-600",     category: "Corporate", status: "green", badge: "v16" },
  { title: "JustDial CRM",       href: "/dashboard/justdial-enquiry",           icon: "ri-customer-service-2-line", color: "bg-sky-50 text-sky-600",    category: "Corporate", status: "green", badge: "v18" },
  { title: "Indiamart CRM",      href: "/dashboard/indiamart-enquiry",          icon: "ri-customer-service-line",  color: "bg-teal-50 text-teal-600",   category: "Corporate", status: "green", badge: "v18" },
  { title: "B2C Data",           href: "/dashboard/b2c-data",                   icon: "ri-database-line",        color: "bg-violet-50 text-violet-600", category: "Corporate", status: "green", badge: "v18" },
  // Website
  { title: "Search Engine",      href: "/dashboard/search-engine-scraper",      icon: "ri-search-line",          color: "bg-sky-50 text-sky-500",       category: "Website", status: "yellow", badge: "v14" },
  { title: "Live Website",       href: "/dashboard/live-website-scraping",      icon: "ri-global-line",          color: "bg-purple-50 text-purple-500", category: "Website", status: "green" },
  { title: "Website Data",       href: "/dashboard/website-data-scraper",       icon: "ri-code-s-slash-line",    color: "bg-gray-100 text-gray-500",    category: "Website", status: "green" },
  { title: "Document Scraper",   href: "/dashboard/document-data-scraper",      icon: "ri-file-text-line",       color: "bg-teal-50 text-teal-600",     category: "Website", status: "green" },
  { title: "Image Scraper",      href: "/dashboard/image-data-scraper",         icon: "ri-image-line",           color: "bg-rose-50 text-rose-500",     category: "Website", status: "green" },
  // Domain
  { title: "Whois Lookup",       href: "/dashboard/whois-domains",              icon: "ri-information-line",     color: "bg-sky-50 text-sky-500",       category: "Domain", status: "green" },
  { title: "URL Checker",        href: "/dashboard/website-urls-checker",       icon: "ri-checkbox-circle-line", color: "bg-cyan-50 text-cyan-500",     category: "Domain", status: "green" },
  { title: "Domain Verifier",    href: "/dashboard/verified-domains",           icon: "ri-verified-badge-line",  color: "bg-green-50 text-green-500",   category: "Domain", status: "green" },
  // WhatsApp
  { title: "WA Checker",         href: "/dashboard/whatsapp-checker",           icon: "ri-whatsapp-line",        color: "bg-emerald-50 text-emerald-500", category: "WhatsApp", status: "green" },
  { title: "WA Verifier",        href: "/dashboard/whatsapp-verifier",          icon: "ri-shield-check-line",    color: "bg-green-50 text-green-600",   category: "WhatsApp", status: "green" },
  { title: "Bulk WA Sender",     href: "/dashboard/whatsapp-bulk-sender",       icon: "ri-send-plane-line",      color: "bg-lime-50 text-lime-600",     category: "WhatsApp", status: "green" },
  // Verify
  { title: "Phone Verifier",     href: "/dashboard/phone-verifier",             icon: "ri-phone-find-line",      color: "bg-amber-50 text-amber-600",   category: "Verify", status: "green" },
  { title: "Email Verifier",     href: "/dashboard/email-verifier",             icon: "ri-mail-check-line",      color: "bg-fuchsia-50 text-fuchsia-500", category: "Verify", status: "green" },
  { title: "Translator",         href: "/dashboard/language-translator",        icon: "ri-translate-2",          color: "bg-sky-50 text-sky-600",       category: "Verify", status: "green", badge: "v14" },
];

const CATEGORIES = ["All", "Lead Gen", "Social", "eCommerce", "Corporate", "Website", "Domain", "WhatsApp", "Verify"];

const BADGE_COLORS = {
  v14: "bg-sky-100 text-sky-900",
  v15: "bg-purple-100 text-purple-900",
  v16: "bg-teal-100 text-teal-900",
  v17: "bg-orange-100 text-orange-900",
  v18: "bg-rose-100 text-rose-900",
  v19: "bg-purple-100 text-purple-900",
};


function toolTitle(t, href, fallback) {
  const key = `page.${href.replace("/dashboard/", "").replace(/-/g, "_")}`;
  const tr = t(key);
  return tr === key ? fallback : tr;
}

const categoryAccent = {
  "Lead Gen": "from-amber-500 to-orange-500",
  Social: "from-rose-500 to-fuchsia-500",
  eCommerce: "from-orange-500 to-red-500",
  Corporate: "from-cyan-500 to-blue-600",
  Website: "from-sky-500 to-indigo-500",
  Domain: "from-emerald-500 to-teal-500",
  WhatsApp: "from-lime-500 to-emerald-500",
  Verify: "from-violet-500 to-purple-500",
};

const STATUS_META = {
  green: {
    dot: "bg-emerald-500",
    label: "Reliable",
    chip: "bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  yellow: {
    dot: "bg-amber-500",
    label: "Conditional",
    chip: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:ring-amber-500/30",
  },
  red: {
    dot: "bg-rose-500",
    label: "Guarded",
    chip: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-500/10 dark:text-rose-300 dark:ring-rose-500/30",
  },
};

const quickStarts = [
  { label: "Find emails from a website", query: "email" },
  { label: "Check WhatsApp numbers", query: "whatsapp" },
  { label: "Scrape Google Maps leads", query: "google maps" },
];

// ── Recently used strip ───────────────────────────────────────────────────────
function RecentlyUsed({ tools: recentTools }) {
  if (!recentTools.length) return null;
  return (
    <section className="rounded-[1.25rem] border border-orange-100 bg-white/[0.85] p-4 shadow-[0_18px_50px_rgba(120,72,29,0.08)] backdrop-blur dark:border-[#00FF41]/30 dark:bg-[#020502] dark:shadow-[0_0_18px_rgba(0,255,65,0.10)]">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-[#00FF41]">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
            <i className="ri-history-line" />
          </span>
          Recently Used Today
        </h2>
        <span className="text-xs font-medium text-stone-500 dark:text-[#00FF41]/60">{recentTools.length} active</span>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex min-w-max gap-2">
          {recentTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className="group flex min-h-11 items-center gap-2 rounded-full border border-stone-200 bg-white px-3 py-2 text-left shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-orange-200 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-[#00FF41]/30 dark:bg-black dark:hover:border-[#00FF41] dark:focus-visible:ring-[#00FF41]"
            >
              <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${tool.color}`}>
                <i className={`${tool.icon} text-xs`} />
              </div>
              <span className="text-xs font-semibold text-stone-800 transition-colors group-hover:text-orange-700 dark:text-[#00FF41]">
                {tool.title}
              </span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
                x{tool.runCount}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Animated marquee strip ────────────────────────────────────────────────────
function ToolMarquee({ tools }) {
  const [paused, setPaused] = useState(false);
  const mid = Math.ceil(tools.length / 2);
  const rows = [tools.slice(0, mid), tools.slice(mid)];
  // ~2.4s per tool gives a comfortable pace; both rows finish in different times for variety
  const durations = [mid * 2.4, (tools.length - mid) * 2.4];
  const animations = ["marquee-left", "marquee-right"];

  return (
    <div
      className="space-y-2.5 overflow-hidden py-4"
      style={{
        maskImage: "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
        WebkitMaskImage: "linear-gradient(to right, transparent 0%, black 7%, black 93%, transparent 100%)",
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {rows.map((row, ri) => (
        <div key={ri} className="flex overflow-hidden">
          <div
            className="flex gap-2 shrink-0"
            style={{
              animation: `${animations[ri]} ${durations[ri]}s linear infinite`,
              animationPlayState: paused ? "paused" : "running",
              willChange: "transform",
            }}
          >
            {/* Duplicate for seamless loop */}
            {[...row, ...row].map((tool, i) => (
              <Link
                key={i}
                href={tool.href}
                tabIndex={-1}
                className="flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full border border-white/60 bg-white/75 px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition duration-200 hover:scale-105 hover:border-orange-200 hover:text-orange-700 dark:border-[#00FF41]/25 dark:bg-[#00FF41]/5 dark:text-[#00FF41]"
              >
                <i className={`${tool.icon} text-xs text-orange-600 dark:text-[#00FF41]`} />
                {tool.title}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Tool card ─────────────────────────────────────────────────────────────────
function ToolCard({ tool, t }) {
  const status = STATUS_META[tool.status] || STATUS_META.green;
  const accent = categoryAccent[tool.category] || "from-stone-500 to-stone-700";
  const name = toolTitle(t, tool.href, tool.title);

  return (
    <Link
      href={tool.href}
      className="group relative flex min-h-[118px] flex-col justify-between overflow-hidden rounded-[1.1rem] border border-stone-200 bg-white p-4 shadow-[0_14px_35px_rgba(68,45,24,0.06)] transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_22px_55px_rgba(130,80,35,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-[#00FF41]/25 dark:bg-black dark:shadow-[0_0_14px_rgba(0,255,65,0.08)] dark:hover:border-[#00FF41] dark:focus-visible:ring-[#00FF41]"
      aria-label={`Open ${name}`}
    >
      <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${accent}`} />
      <div className="flex items-start justify-between gap-3">
        <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl ${tool.color} ring-1 ring-black/5 transition duration-300 group-hover:scale-105 dark:ring-[#00FF41]/20`}>
          <i className={`${tool.icon} text-xl`} aria-hidden="true" />
          <span
            className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-black ${status.dot}`}
            title={status.label}
          />
        </div>
        {tool.badge && (
          <span className={`shrink-0 rounded-full px-2 py-1 text-[10px] font-bold ${BADGE_COLORS[tool.badge] || "bg-stone-100 text-stone-900"}`}>
            {tool.badge}
          </span>
        )}
      </div>
      <div className="mt-4 min-w-0">
        <p className="truncate text-sm font-bold text-stone-950 dark:text-[#00FF41]">
          {name}
        </p>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[11px] font-medium text-stone-500 dark:text-[#00FF41]/60">{tool.category}</span>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${status.chip}`}>{status.label}</span>
        </div>
      </div>
      <i className="ri-arrow-right-up-line absolute bottom-4 right-4 text-lg text-stone-300 transition duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-orange-600 dark:text-[#00FF41]/40 dark:group-hover:text-[#00FF41]" aria-hidden="true" />
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ today: 0, total: 0, topTool: null });
  const [activeCat, setActiveCat] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [recentTools, setRecentTools] = useState([]);

  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [aiInput, setAiInput] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiExecutingRoute, setAiExecutingRoute] = useState("");
  // chatLog maps { role: "user"|"assistant"|"system", content: "...", results?: [], columns?: [] }
  const [chatLog, setChatLog] = useState([
    { role: "system", content: "Terminal Initialized. Type your instruction to begin the auto-pilot sequence." }
  ]);
  const chatEndRef = useRef(null);

  // ── Session Caching: Hydrate chat log on mount ──
  useEffect(() => {
    if (typeof window !== "undefined") {
      loadChatCache()
        .then(({ value }) => {
          if (value) {
            const { timestamp, logs } = value;
            if (Date.now() - timestamp < 360000) { // 6 minutes
              setChatLog(logs);
            } else {
              clearChatCache();
            }
          }
        }
      )
        .catch(() => {});
    }
  }, []);

  // ── Session Caching: Save chat log continuously ──
  useEffect(() => {
    if (typeof window !== "undefined" && chatLog.length > 1) {
      saveChatCache(chatLog);
    }
  }, [chatLog]);

  useEffect(() => {
    if (isAIModalOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatLog, isAIModalOpen]);

  const processAgentLoop = async (messageHistory) => {
    try {
      const aiRes = await axios.post("/api/ai-router", { messages: messageHistory });
      if (aiRes.data.error) throw new Error(aiRes.data.error);

      const { message, toolCalls } = aiRes.data;
      let newLogs = [];
      let nextHistory = [...messageHistory];

      if (message) {
        newLogs.push({ role: "assistant", content: message });
        nextHistory.push({ role: "assistant", content: message });
      }

      if (newLogs.length > 0) {
        setChatLog(prev => [...prev, ...newLogs]);
      }

      if (toolCalls && toolCalls.length > 0) {
        for (const tc of toolCalls) {
          if (tc.name === "execute_scraper") {
            const { apiPath, payload } = tc.args;
            setAiExecutingRoute(apiPath);
            
            let finalPath = apiPath === "/api/live-website-scraping" ? "/api/live_website" : apiPath;
            setChatLog(prev => [...prev, { role: "system", content: `EXECUTING ALGORITHM: ${finalPath} ...` }]);
            
            let data = [];
            try {
              const finalPayload = { ...payload };
              if (["/api/email_scraper", "/api/live_website", "/api/phone_scraper", "/api/document_scraper", "/api/image_scraper"].includes(finalPath)) {
                if (finalPayload.query && !finalPayload.urls) {
                  finalPayload.urls = [finalPayload.query];
                }
              }
              if (finalPath === "/api/social_background_analysis" && finalPayload.query && !finalPayload.urls) {
                finalPayload.urls = finalPayload.query.split(/\r?\n|,/).map((url) => url.trim()).filter(Boolean);
              }
              const scrapeRes = await axios.post(finalPath, finalPayload);
              data = Array.isArray(scrapeRes.data.data) ? scrapeRes.data.data : (Array.isArray(scrapeRes.data) ? scrapeRes.data : [scrapeRes.data]);
              
              if (data && data.length > 0) {
                const keys = Object.keys(data[0] || {});
                const cols = keys.map(k => ({ header: k.charAt(0).toUpperCase() + k.slice(1).replace(/_/g, " "), key: k }));
                setChatLog(prev => [...prev, { role: "system", content: `DATA EXTRACTION COMPLETE.`, results: data, columns: cols }]);
              } else {
                setChatLog(prev => [...prev, { role: "system", content: `NO DATA SECURED FOR PARAMETERS.` }]);
              }
            } catch (scrpErr) {
               setChatLog(prev => [...prev, { role: "system", content: `EXECUTION FAILED: ${scrpErr.message}` }]);
               data = { error: scrpErr.message };
            }

            // Provide compressed payload back to Mistral
            const payloadSummary = `[SYSTEM BACKGROUND: Tool '${apiPath}' executed. Returned ${Array.isArray(data) ? data.length : 1} records. Data snippet: ${JSON.stringify(data).substring(0, 4000)}... Evaluate if you need to run another tool based on the user's multi-step request, otherwise formulate your final response.]`;
            nextHistory.push({ role: "user", content: payloadSummary });
            
            // Recurse Native background loop
            await processAgentLoop(nextHistory);
            return; // Break out since recursion handles the chain
          }
        }
      } else {
        // No tools, AI finished. Stop.
        setAiLoading(false);
        setAiExecutingRoute("");
      }
    } catch (err) {
      console.error(err);
      let errMsg = err.response?.data?.error || err.message || "FATAL ERROR";
      if (err.response?.status === 400 && errMsg.includes("MISTRAL_API_KEY")) {
        errMsg = "INVALID KEY EXCEPTION: Mistral API Key is missing or invalid. Check your Profile Settings.";
      }
      setChatLog(prev => [...prev, { role: "system", content: `[ERROR] ${errMsg}` }]);
      setAiLoading(false);
      setAiExecutingRoute("");
    }
  };

  const handleAiSubmit = async () => {
    if (!aiInput.trim()) return;
    const userMsg = { role: "user", content: aiInput };
    
    // Add user message to log payload
    const outboundMessages = [...chatLog.filter(m => m.role !== "system"), userMsg].map(m => ({ role: m.role, content: m.content }));
    
    setChatLog(prev => [...prev, userMsg]);
    setAiInput("");
    setAiLoading(true);
    setAiExecutingRoute("");

    await processAgentLoop(outboundMessages);
  };

  useEffect(() => {
    let mounted = true;
    async function refreshStats() {
      const next = await getServerStats();
      if (!mounted) return;
      setStats(next);
      setRecentTools(next.tools ? getRecentlyUsedToolsFromStats(tools, next.tools) : getRecentlyUsedTools(tools));
    }
    refreshStats();
    const id = setInterval(() => {
      refreshStats();
    }, 10000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  const categoryFiltered = activeCat === "All" ? tools : tools.filter((tool) => tool.category === activeCat);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filtered = normalizedQuery
    ? categoryFiltered.filter((tool) =>
        `${tool.title} ${tool.category} ${tool.href}`.toLowerCase().includes(normalizedQuery)
      )
    : categoryFiltered;
  const reliableTools = tools.filter((tool) => tool.status === "green").length;
  const featuredTools = [
    tools.find((tool) => tool.title === "Google Maps"),
    tools.find((tool) => tool.title === "Email Scraper"),
    tools.find((tool) => tool.title === "WA Verifier"),
  ].filter(Boolean);

  return (
    <main className="relative overflow-hidden rounded-[1.75rem] bg-[#fff8ef] px-3 py-3 pb-24 font-sans text-stone-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] sm:px-5 sm:py-5 sm:pb-24 dark:bg-[#030504] dark:text-[#00FF41]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_4%,rgba(248,178,93,0.34),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.72),transparent_45%)] dark:bg-none" />
      <div className="relative space-y-5">
        <section className="overflow-hidden rounded-[1.5rem] border border-orange-100 bg-white/80 shadow-[0_24px_70px_rgba(119,72,32,0.12)] backdrop-blur dark:border-[#00FF41]/35 dark:bg-black dark:shadow-[0_0_26px_rgba(0,255,65,0.12)]">
          <div className="grid gap-6 p-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] lg:p-7">
            <div className="flex min-w-0 flex-col justify-between gap-6">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-orange-100 px-3 py-1 text-xs font-bold text-orange-800 ring-1 ring-orange-200 dark:bg-[#00FF41]/10 dark:text-[#00FF41] dark:ring-[#00FF41]/30">
                    BUILD V19.0
                  </span>
                  <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-bold text-stone-700 ring-1 ring-stone-200 dark:bg-[#00FF41]/10 dark:text-[#00FF41] dark:ring-[#00FF41]/30">
                    {tools.length} tools ready
                  </span>
                </div>
                <h2 className="max-w-3xl text-3xl font-black leading-tight text-stone-950 sm:text-4xl lg:text-5xl dark:text-[#00FF41]">
                  Discover the right scraper before momentum cools.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-stone-600 sm:text-base dark:text-[#00FF41]/70">
                  BubbleScraper brings lead, website, domain, ecommerce, and verification tools into one focused command surface.
                </p>
              </div>

              <div className="max-w-3xl rounded-[1.25rem] border border-stone-200 bg-white p-2 shadow-[0_16px_40px_rgba(83,58,35,0.10)] dark:border-[#00FF41]/30 dark:bg-[#020502]">
                <label htmlFor="tool-search" className="sr-only">Search BubbleScraper tools</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex min-h-12 flex-1 items-center gap-3 rounded-2xl bg-[#fff8ef] px-4 ring-1 ring-orange-100 focus-within:ring-2 focus-within:ring-orange-500 dark:bg-black dark:ring-[#00FF41]/30 dark:focus-within:ring-[#00FF41]">
                    <i className="ri-search-line text-lg text-orange-600 dark:text-[#00FF41]" aria-hidden="true" />
                    <input
                      id="tool-search"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search tools, channels, or data types"
                      className="w-full bg-transparent text-sm font-medium text-stone-900 placeholder:text-stone-400 focus:outline-none dark:text-[#00FF41] dark:placeholder:text-[#00FF41]/35"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsAIModalOpen(true)}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-stone-950 px-5 text-sm font-bold text-white shadow-[0_14px_30px_rgba(41,30,20,0.22)] transition duration-200 hover:-translate-y-0.5 hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-[#00FF41] dark:text-black dark:hover:bg-white dark:focus-visible:ring-[#00FF41]"
                  >
                    <i className="ri-sparkling-2-line text-base" aria-hidden="true" />
                    Ask AI
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2" aria-label="Quick searches">
                {quickStarts.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      setSearchQuery(item.query);
                      setActiveCat("All");
                    }}
                    className="min-h-10 rounded-full border border-orange-200 bg-orange-50 px-3 text-xs font-bold text-orange-800 transition hover:-translate-y-0.5 hover:bg-orange-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:border-[#00FF41]/30 dark:bg-[#00FF41]/10 dark:text-[#00FF41] dark:focus-visible:ring-[#00FF41]"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            <aside className="rounded-[1.35rem] border border-stone-200 bg-[#1f1814] p-4 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] dark:border-[#00FF41]/40 dark:bg-[#020502]" aria-label="Recommended tools">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase text-orange-200 dark:text-[#00FF41]/70">Starter stack</p>
                  <h2 className="text-lg font-black dark:text-[#00FF41]">Fastest paths to usable data</h2>
                </div>
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-400 text-stone-950 dark:bg-[#00FF41]">
                  <i className="ri-compass-3-line text-xl" aria-hidden="true" />
                </span>
              </div>
              <div className="space-y-2">
                {featuredTools.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    className="group flex min-h-14 items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.08] px-3 py-2 transition hover:bg-white/[0.14] focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 dark:border-[#00FF41]/30 dark:bg-[#00FF41]/5 dark:focus-visible:ring-[#00FF41]"
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tool.color}`}>
                      <i className={tool.icon} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-bold dark:text-[#00FF41]">{tool.title}</span>
                      <span className="block text-xs text-orange-100/70 dark:text-[#00FF41]/60">{tool.category}</span>
                    </span>
                    <i className="ri-arrow-right-line text-orange-200 transition group-hover:translate-x-0.5 dark:text-[#00FF41]" aria-hidden="true" />
                  </Link>
                ))}
              </div>
            </aside>
          </div>
          <ToolMarquee tools={tools} />
        </section>

        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Usage summary">
          {[
            { label: t("home.runs_today"), value: stats.today, icon: "ri-play-circle-line", tone: "text-orange-700 bg-orange-100" },
            { label: t("home.total_runs"), value: stats.total, icon: "ri-database-line", tone: "text-emerald-700 bg-emerald-100" },
            { label: t("home.top_tool"), value: stats.topTool || "None yet", icon: "ri-trophy-line", tone: "text-amber-700 bg-amber-100" },
            { label: t("home.tools_available"), value: `${reliableTools}/${tools.length} reliable`, icon: "ri-tools-line", tone: "text-sky-700 bg-sky-100" },
          ].map((s) => (
            <div key={s.label} className="rounded-[1.1rem] border border-white/80 bg-white/[0.82] p-4 shadow-[0_16px_40px_rgba(91,60,31,0.07)] backdrop-blur dark:border-[#00FF41]/25 dark:bg-black">
              <div className="flex items-center gap-3">
                <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${s.tone} dark:bg-[#00FF41]/10 dark:text-[#00FF41]`}>
                  <i className={`${s.icon} text-lg`} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-stone-500 dark:text-[#00FF41]/60">{s.label}</p>
                  <p className="truncate text-base font-black text-stone-950 dark:text-[#00FF41]">{s.value}</p>
                </div>
              </div>
            </div>
          ))}
        </section>

      <RecentlyUsed tools={recentTools} />

        <section className="rounded-[1.35rem] border border-orange-100 bg-white/[0.86] p-4 shadow-[0_22px_60px_rgba(118,74,36,0.10)] backdrop-blur dark:border-[#00FF41]/30 dark:bg-[#020502]">
          <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
            <div>
              <p className="text-xs font-bold uppercase text-orange-700 dark:text-[#00FF41]/70">Tool library</p>
              <h2 className="text-2xl font-black text-stone-950 dark:text-[#00FF41]">
                {t("home.all_tools")}
                <span className="ml-2 text-sm font-semibold text-stone-500 dark:text-[#00FF41]/60">
                  {filtered.length}{activeCat !== "All" ? ` / ${tools.length}` : ""} shown
                </span>
              </h2>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Filter tools by category">
            {CATEGORIES.map((c) => {
              const cnt = c === "All" ? tools.length : tools.filter((tool) => tool.category === c).length;
              return (
                <button
                  key={c}
                  type="button"
                  role="tab"
                  aria-selected={activeCat === c}
                  onClick={() => setActiveCat(c)}
                  className={`min-h-10 shrink-0 rounded-full px-3 text-xs font-bold transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:focus-visible:ring-[#00FF41] ${
                    activeCat === c
                      ? "bg-stone-950 text-white shadow-md dark:bg-[#00FF41] dark:text-black"
                      : "border border-stone-200 bg-white text-stone-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-800 dark:border-[#00FF41]/25 dark:bg-black dark:text-[#00FF41]/70 dark:hover:text-[#00FF41]"
                  }`}
                >
                  {c}{c !== "All" && ` ${cnt}`}
                </button>
              );
            })}
          </div>
        </div>

          {filtered.length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {filtered.map((tool) => (
              <ToolCard key={tool.href} tool={tool} t={t} />
            ))}
          </div>
          ) : (
            <div className="flex min-h-52 flex-col items-center justify-center rounded-[1.1rem] border border-dashed border-orange-200 bg-orange-50/70 p-6 text-center dark:border-[#00FF41]/30 dark:bg-[#00FF41]/5">
              <i className="ri-search-eye-line mb-3 text-3xl text-orange-700 dark:text-[#00FF41]" aria-hidden="true" />
              <h3 className="text-base font-black text-stone-950 dark:text-[#00FF41]">No matching tools</h3>
              <p className="mt-1 max-w-sm text-sm text-stone-600 dark:text-[#00FF41]/60">Try another search term or switch back to all categories.</p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setActiveCat("All");
                }}
                className="mt-4 min-h-10 rounded-full bg-stone-950 px-4 text-xs font-bold text-white transition hover:bg-orange-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:bg-[#00FF41] dark:text-black"
              >
                Reset discovery
              </button>
            </div>
          )}
        </section>

      {/* Floating AI Mode Button */}
      <div className="fixed bottom-5 right-5 z-50 hidden sm:block sm:bottom-6 sm:right-6">
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="bs-primary-action group flex min-h-12 items-center justify-center gap-2 rounded-full border px-4 text-sm font-bold shadow-[0_18px_45px_rgba(40,29,20,0.28)] transition duration-300 hover:-translate-y-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2 dark:shadow-[0_0_20px_rgba(0,255,65,0.45)]"
          aria-label="Open AI assistant"
        >
          <i className="ri-robot-2-line text-base" aria-hidden="true" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
      </div>

      {/* Floating AI Modal Overlay */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-stone-950/75 p-3 backdrop-blur-sm sm:p-4">
          <div
            className="flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-[1.25rem] border border-orange-200 bg-[#120f0c] shadow-[0_30px_90px_rgba(0,0,0,0.45)] dark:border-[#00FF41] dark:bg-black dark:shadow-[0_0_50px_rgba(0,255,65,0.25)]"
            role="dialog"
            aria-modal="true"
            aria-label="AI command assistant"
          >
            
            {/* Header */}
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-orange-900/50 bg-[#1d1712] px-4 py-3 dark:border-[#00FF41] dark:bg-[#00FF41]/10">
               <div>
                 <div className="text-sm font-black text-orange-100 dark:text-[#00FF41]">
                    AI command assistant
                 </div>
                 <p className="text-xs text-orange-200/60 dark:text-[#00FF41]/60">Route natural language into scraper actions</p>
               </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setChatLog([{ role: "system", content: "Terminal Refreshed. Type your instruction to begin." }]);
                    clearChatCache();
                  }}
                  className="min-h-9 rounded-full border border-orange-300/40 px-3 text-xs font-bold text-orange-100 transition hover:bg-orange-200 hover:text-stone-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 dark:border-[#00FF41] dark:text-[#00FF41] dark:hover:bg-[#00FF41] dark:hover:text-black"
                >
                  Clear
                </button>
                <button
                  onClick={() => setIsAIModalOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-orange-300/40 text-orange-100 transition hover:bg-orange-200 hover:text-stone-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 dark:border-[#00FF41] dark:text-[#00FF41] dark:hover:bg-[#00FF41] dark:hover:text-black"
                  aria-label="Close AI assistant"
                >
                  <i className="ri-close-line text-lg" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Content Body (Chat Log) */}
            <div className="flex flex-1 flex-col overflow-hidden bg-[#120f0c] p-4 text-orange-50 sm:p-6 dark:bg-black dark:text-[#00FF41]">
              <div className="mb-4 flex-1 space-y-4 overflow-y-auto pr-2">
                {chatLog.map((msg, idx) => (
                  <div key={idx} className="flex flex-col">
                    {msg.role === "user" && (
                      <div className="mb-1 text-xs font-semibold text-orange-200/70 dark:text-[#00FF41]/70">You <span className="text-sm text-orange-50 dark:text-[#00FF41] break-words">{msg.content}</span></div>
                    )}
                    {msg.role === "assistant" && (
                      <div className="whitespace-pre-wrap rounded-2xl border border-orange-200/10 bg-white/5 px-4 py-3 text-sm leading-6 text-orange-50 dark:border-[#00FF41]/30 dark:text-[#00FF41]">{msg.content}</div>
                    )}
                    {msg.role === "system" && (
                      <div className="mb-2 mt-2 text-xs font-bold uppercase text-orange-200/70 dark:text-[#00FF41]/80">
                        {msg.content.includes("[ERROR]") ? <span className="text-red-400">{msg.content}</span> : msg.content}
                      </div>
                    )}
                    {msg.results && (
                      <div className="mt-2 flex h-[400px] w-full flex-col border border-orange-200/20 bg-black text-left dark:border-[#00FF41]/40">
                         <ResultsTable
                          title="AI Sourced Lead Data"
                          rows={msg.results}
                          columns={msg.columns}
                          loading={false}
                          filename="ai_leads"
                          accentColor="none"
                        />
                      </div>
                    )}
                  </div>
                ))}
                
                {aiExecutingRoute && (
                  <div className="mb-2 mt-2 flex items-center gap-2 text-xs font-bold uppercase text-sky-300">
                     <span className="h-3 w-3 animate-spin rounded-full border border-sky-300 border-t-transparent"></span>
                     Extracting directory: {aiExecutingRoute}
                  </div>
                )}
                {aiLoading && !aiExecutingRoute && (
                  <div className="mt-2 flex items-center gap-2 text-xs font-bold uppercase text-amber-300">
                    <span className="h-3 w-3 animate-spin rounded-full border border-amber-300 border-t-transparent"></span>
                    Analyzing instruction set
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Terminal PROMPT Area */}
              <div className="relative shrink-0 border-t border-orange-200/20 pt-4 dark:border-[#00FF41]/40">
                <label htmlFor="ai-command-input" className="sr-only">AI instruction</label>
                <textarea
                  id="ai-command-input"
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="Ask for leads, domains, emails, phone checks, or a multi-step scrape..."
                  className="w-full resize-none rounded-2xl border border-orange-200/20 bg-black/30 px-4 py-3 pr-28 text-sm text-orange-50 outline-none transition focus:border-orange-300 focus:ring-2 focus:ring-orange-300/40 placeholder:text-orange-100/40 dark:border-[#00FF41]/30 dark:bg-[#030504] dark:text-[#00FF41] dark:placeholder:text-[#00FF41]/30 dark:focus:border-[#00FF41] dark:focus:ring-[#00FF41]/40"
                  rows={2}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAiSubmit();
                    }
                  }}
                />
                <button
                  onClick={handleAiSubmit}
                  disabled={aiLoading || !aiInput.trim()}
                  className="absolute bottom-6 right-3 min-h-9 rounded-full bg-orange-200 px-4 text-xs font-black uppercase text-stone-950 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#00FF41] dark:hover:bg-white"
                >
                  {aiLoading ? "Sending" : "Run"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      </div>
    </main>
  );
}
