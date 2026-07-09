"use client";
import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useLanguage } from "../../../../../components/LanguageProvider";
import ResultsTable from "../../../../../components/ResultsTable";

// ── Stats helpers via localStorage ────────────────────────────────────────────
function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}
export function trackRun(toolName) {
  if (typeof window === "undefined") return;
  try {
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
  v14: "bg-sky-500", v15: "bg-purple-500", v16: "bg-teal-500",
  v17: "bg-orange-500", v18: "bg-rose-500",
};


function toolTitle(t, href, fallback) {
  const key = `page.${href.replace("/dashboard/", "").replace(/-/g, "_")}`;
  const tr = t(key);
  return tr === key ? fallback : tr;
}

// ── Recently used strip ───────────────────────────────────────────────────────
function RecentlyUsed({ tools: recentTools }) {
  if (!recentTools.length) return null;
  return (
    <div className="box mb-5">
      <div className="box-header py-3">
        <h5 className="box-title text-sm flex items-center gap-1.5">
          <i className="ri-history-line text-sky-500" />
          Recently Used Today
        </h5>
      </div>
      <div className="box-body py-3">
        <div className="flex flex-wrap gap-2">
          {recentTools.map((tool) => (
            <Link
              key={tool.href}
              href={tool.href}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-bgdark hover:border-sky-200 dark:hover:border-sky-500/30 hover:shadow-sm transition-all duration-200 group`}
            >
              <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${tool.color}`}>
                <i className={`${tool.icon} text-xs`} />
              </div>
              <span className="text-xs font-medium text-gray-700 dark:text-white/80 group-hover:text-sky-600 dark:group-hover:text-sky-400 transition-colors">
                {tool.title}
              </span>
              <span className="text-[10px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded-full font-semibold">
                ×{tool.runCount}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
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
      className="overflow-hidden py-3 space-y-2.5 border-b border-gray-100 dark:border-white/10 px-0"
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
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 ${tool.color} hover:shadow-sm hover:scale-105 transition-all duration-200`}
              >
                <i className={`${tool.icon} text-xs`} />
                {tool.title}
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

const STATUS_DOT = {
  green:  "bg-green-400",
  yellow: "bg-amber-400",
  red:    "bg-red-400",
};
const STATUS_TITLE = {
  green:  "Working",
  yellow: "Partial / may be blocked",
  red:    "Blocked by bot detection",
};

// ── Tool card ─────────────────────────────────────────────────────────────────
function ToolCard({ tool, t }) {
  return (
    <Link
      href={tool.href}
      className="group flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-white/10 bg-white dark:bg-bgdark hover:border-sky-200 dark:hover:border-sky-500/30 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200"
    >
      {/* Icon circle with status dot */}
      <div className="relative shrink-0">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tool.color}`}>
          <i className={`${tool.icon} text-lg`} />
        </div>
        {tool.status && (
          <span
            className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-bgdark ${STATUS_DOT[tool.status]}`}
            title={STATUS_TITLE[tool.status]}
          />
        )}
      </div>

      {/* Name + category */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 dark:text-white truncate leading-snug">
          {toolTitle(t, tool.href, tool.title)}
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">{tool.category}</p>
      </div>

      {/* Version badge */}
      {tool.badge && (
        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold text-white shrink-0 ${BADGE_COLORS[tool.badge] || "bg-gray-400"}`}>
          {tool.badge}
        </span>
      )}

      {/* Arrow — slides in on hover */}
      <i className="ri-arrow-right-s-line text-gray-300 dark:text-gray-600 group-hover:text-sky-500 group-hover:translate-x-0.5 transition-all text-base shrink-0" />
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { t } = useLanguage();
  const [stats, setStats] = useState({ today: 0, total: 0, topTool: null });
  const [activeCat, setActiveCat] = useState("All");
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
      try {
        const cached = localStorage.getItem("sg_ai_chat_cache");
        if (cached) {
          const { timestamp, logs } = JSON.parse(cached);
          if (Date.now() - timestamp < 360000) { // 6 minutes
            setChatLog(logs);
          } else {
            localStorage.removeItem("sg_ai_chat_cache");
          }
        }
      } catch (e) {}
    }
  }, []);

  // ── Session Caching: Save chat log continuously ──
  useEffect(() => {
    if (typeof window !== "undefined" && chatLog.length > 1) {
      try {
        localStorage.setItem("sg_ai_chat_cache", JSON.stringify({
          timestamp: Date.now(),
          logs: chatLog
        }));
      } catch (e) {}
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
    setStats(getStats());
    setRecentTools(getRecentlyUsedTools(tools));
    const id = setInterval(() => {
      setStats(getStats());
      setRecentTools(getRecentlyUsedTools(tools));
    }, 10000);
    return () => clearInterval(id);
  }, []);

  const filtered = activeCat === "All" ? tools : tools.filter((tool) => tool.category === activeCat);

  return (
    <div>
      {/* Welcome banner */}
      <div className="box mb-5 overflow-hidden">
        <div className="box-body relative z-10">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h2 className="text-xl font-bold uppercase tracking-widest text-[#00FF41]">{"// INIT SEQUENCE"}</h2>
              <p className="text-sm mt-1 text-[#00FF41]/70 font-mono tracking-wide">SYSTEM: ONLINE | STATUS: OPTIMAL</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs border border-[#00FF41]/50 bg-[#00FF41]/10 text-[#00FF41] px-2.5 py-1 font-bold uppercase tracking-widest shadow-[0_0_5px_rgba(0,255,65,0.3)]">BUILD_V19.0</span>
              <span className="text-xs border border-[#00FF41]/50 bg-[#00FF41]/10 text-[#00FF41] px-2.5 py-1 font-bold uppercase tracking-widest shadow-[0_0_5px_rgba(0,255,65,0.3)]">{tools.length} MODULES</span>
            </div>
          </div>
        </div>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {[
          { label: t("home.runs_today"),      value: stats.today,            icon: "ri-play-circle-line", color: "sky" },
          { label: t("home.total_runs"),       value: stats.total,            icon: "ri-database-line",    color: "green" },
          { label: t("home.top_tool"),         value: stats.topTool || "—",   icon: "ri-trophy-line",      color: "amber" },
          { label: t("home.tools_available"),  value: tools.length,           icon: "ri-tools-line",       color: "purple" },
        ].map((s) => (
          <div key={s.label} className="col-span-12 sm:col-span-6 xl:col-span-3">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center gap-3">
                  <div className={`w-11 h-11 rounded-xl bg-${s.color}-50 dark:bg-${s.color}-900/20 flex items-center justify-center`}>
                    <i className={`${s.icon} text-${s.color}-500 text-xl`} />
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{s.label}</p>
                    <p className="text-lg font-bold text-defaulttextcolor dark:text-white truncate max-w-[140px]">{s.value}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Recently used strip — only visible after first run */}
      <RecentlyUsed tools={recentTools} />

      {/* All Tools */}
      <div className="box">
        {/* Header with category filter */}
        <div className="box-header flex-wrap gap-3 py-3">
          <h5 className="box-title shrink-0">
            {t("home.all_tools")}
            <span className="ml-2 text-gray-400 dark:text-gray-500 font-normal text-sm">
              ({filtered.length}{activeCat !== "All" ? ` / ${tools.length}` : ""})
            </span>
          </h5>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => {
              const cnt = c === "All" ? tools.length : tools.filter((tool) => tool.category === c).length;
              return (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${
                    activeCat === c
                      ? "bg-sky-500 text-white"
                      : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 hover:bg-sky-50 dark:hover:bg-sky-900/20 hover:text-sky-600 dark:hover:text-sky-400"
                  }`}
                >
                  {c}{c !== "All" && ` · ${cnt}`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Live marquee — shows all tools scrolling regardless of filter */}
        <ToolMarquee tools={tools} />

        {/* Card grid — filtered by active category */}
        <div className="box-body">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {filtered.map((tool) => (
              <ToolCard key={tool.href} tool={tool} t={t} />
            ))}
          </div>
        </div>
      </div>

      {/* Floating AI Mode Button */}
      <div className="fixed bottom-6 right-6 z-50 animate-bounce">
        <button
          onClick={() => setIsAIModalOpen(true)}
          className="flex items-center justify-center px-4 h-12 bg-black border border-[#00FF41] shadow-[0_0_20px_rgba(0,255,65,0.6)] hover:-translate-y-1 hover:bg-[#00FF41] hover:text-black hover:shadow-[0_0_30px_#00FF41] text-[#00FF41] transition-all duration-300 group rounded-none"
        >
          <span className="font-bold font-mono tracking-widest lowercase">npm start ai</span>
          <span className="animate-pulse ml-1 font-mono hover:text-black">_</span>
        </button>
      </div>

      {/* Floating AI Modal Overlay */}
      {isAIModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-black w-full max-w-5xl h-[85vh] rounded-none shadow-[0_0_50px_rgba(0,255,65,0.3)] flex flex-col overflow-hidden border border-[#00FF41]">
            
            {/* Header */}
            <div className="px-4 py-2 border-b border-[#00FF41] bg-[#00FF41]/10 flex justify-between items-center shrink-0">
               <div className="font-bold text-[#00FF41] tracking-widest uppercase text-sm" style={{ textShadow: "0 0 5px #00FF41" }}>
                  root@ai-router:~#
               </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setChatLog([{ role: "system", content: "Terminal Refreshed. Type your instruction to begin." }]);
                    localStorage.removeItem("sg_ai_chat_cache");
                  }}
                  className="text-xs px-2 py-0.5 border border-[#00FF41] text-[#00FF41] hover:bg-[#00FF41] hover:text-black transition-colors lowercase"
                >
                  [clear_session]
                </button>
                <button
                  onClick={() => setIsAIModalOpen(false)}
                  className="w-6 h-6 flex items-center justify-center text-[#00FF41] hover:bg-[#00FF41] hover:text-black transition-colors border border-[#00FF41] font-bold"
                >
                  X
                </button>
              </div>
            </div>

            {/* Content Body (Chat Log) */}
            <div className="flex-1 p-6 flex flex-col overflow-hidden bg-black text-[#00FF41]">
              <div className="flex-1 overflow-y-auto mb-4 space-y-4 pr-2">
                {chatLog.map((msg, idx) => (
                  <div key={idx} className="flex flex-col">
                    {msg.role === "user" && (
                      <div className="mb-1 text-[#00FF41]/70 font-mono text-xs">root@user:~# <span className="text-[#00FF41] text-sm break-words">{msg.content}</span></div>
                    )}
                    {msg.role === "assistant" && (
                      <div className="border-l-2 border-[#00FF41]/50 pl-3 py-1 font-mono text-[#00FF41] whitespace-pre-wrap">{msg.content}</div>
                    )}
                    {msg.role === "system" && (
                      <div className="font-bold uppercase tracking-wide text-xs text-[#00FF41]/80 mt-2 mb-2">
                        {msg.content.includes("[ERROR]") ? <span className="text-red-500">{msg.content}</span> : `// ${msg.content}`}
                      </div>
                    )}
                    {msg.results && (
                      <div className="mt-2 text-left w-full h-[400px] border border-[#00FF41]/40 flex flex-col bg-black">
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
                  <div className="font-bold uppercase tracking-wide text-xs text-sky-400 mt-2 mb-2 flex items-center gap-2">
                     <span className="w-3 h-3 border border-sky-400 border-t-transparent rounded-full animate-spin"></span>
                     // EXTRACTING DIRECTORY: {aiExecutingRoute}
                  </div>
                )}
                {aiLoading && !aiExecutingRoute && (
                  <div className="font-bold uppercase tracking-wide text-xs text-yellow-500 mt-2 flex items-center gap-2">
                    <span className="w-3 h-3 border border-yellow-500 border-t-transparent rounded-full animate-spin"></span>
                    // ANALYZING INSTRUCTION SET
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>
              
              {/* Terminal PROMPT Area */}
              <div className="relative shrink-0 border-t border-[#00FF41]/40 pt-4">
                <div className="absolute top-7 left-4 font-mono font-bold text-[#00FF41]">{">"}</div>
                <textarea
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                  placeholder="enter natural language instruction sequence..."
                  className="w-full bg-[#030504] border border-[#00FF41]/30 px-10 py-3 text-sm focus:ring-1 focus:ring-[#00FF41] focus:border-[#00FF41] outline-none resize-none transition-all text-[#00FF41] placeholder-[#00FF41]/30 font-mono tracking-wide"
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
                  className="absolute bottom-6 right-3 bg-[#00FF41]/10 border border-[#00FF41] text-[#00FF41] px-4 py-1 text-xs font-bold uppercase hover:bg-[#00FF41] hover:text-black shadow-[0_0_10px_rgba(0,255,65,0.4)] hover:shadow-[0_0_15px_rgba(0,255,65,0.8)] disabled:opacity-50 transition-all"
                >
                  {aiLoading ? "TX..." : "EXECUTE"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
