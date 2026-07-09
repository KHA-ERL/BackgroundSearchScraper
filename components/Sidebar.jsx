"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { useLanguage } from "./LanguageProvider";

const nav = [
  {
    label: "Dashboard",
    key: "cat.dashboard",
    items: [
      { title: "Home", href: "/dashboard/home", icon: "ri-home-2-line" },
    ],
  },
  {
    label: "Lead Generation",
    key: "cat.lead_generation",
    items: [
      { title: "Business Directory",  href: "/dashboard/business-directory-scraper", icon: "ri-git-repository-line" },
      { title: "Justdial Scraper",    href: "/dashboard/justdial-scraper",            icon: "ri-store-2-line" },
      { title: "Indiamart Scraper",   href: "/dashboard/indiamart-scraper",           icon: "ri-building-2-line" },
      { title: "Sulekha Scraper",     href: "/dashboard/sulekha-scraper",             icon: "ri-service-line" },
      { title: "Email Scraper",       href: "/dashboard/email-scraper",               icon: "ri-mail-line" },
      { title: "Phone Scraper",       href: "/dashboard/phone-number-scraper",        icon: "ri-phone-line" },
      { title: "WA Number Scraper",   href: "/dashboard/whatsapp-number-scraper",     icon: "ri-whatsapp-line", badge: "v16" },
    ],
  },
  {
    label: "Search Scrapers",
    key: "cat.search_scrapers",
    items: [
      { title: "Search Engine Scraper", href: "/dashboard/search-engine-scraper", icon: "ri-search-line",  badge: "v14" },
      { title: "Google Maps",           href: "/dashboard/google-map-scraper",    icon: "ri-map-pin-line" },
    ],
  },
  {
    label: "Social Media",
    key: "cat.social_media",
    items: [
      { title: "Social Media Scraper", href: "/dashboard/social-media-scraper", icon: "ri-share-line", badge: "v14" },
    ],
  },
  {
    label: "eCommerce",
    key: "cat.ecommerce",
    items: [
      { title: "eCommerce Scraper", href: "/dashboard/ecommerce-scraper", icon: "ri-shopping-cart-line", badge: "v14" },
      { title: "Myntra Scraper",    href: "/dashboard/myntra-scraper",    icon: "ri-shirt-line",         badge: "v15" },
      { title: "Snapdeal Scraper",  href: "/dashboard/snapdeal-scraper",  icon: "ri-store-line",         badge: "v15" },
    ],
  },
  {
    label: "Corporate",
    key: "cat.corporate",
    items: [
      { title: "Corporate Scraper", href: "/dashboard/corporate-scraper", icon: "ri-building-4-line", badge: "v15" },
    ],
  },
  {
    label: "Job Portals",
    key: "cat.job_portals",
    items: [
      { title: "Job Portal Scraper", href: "/dashboard/job-portal-scraper", icon: "ri-briefcase-line", badge: "v16" },
    ],
  },
  {
    label: "Website Tools",
    key: "cat.website_tools",
    items: [
      { title: "Live Website Scraping", href: "/dashboard/live-website-scraping", icon: "ri-global-line" },
      { title: "Website Data Scraper",  href: "/dashboard/website-data-scraper",  icon: "ri-code-s-slash-line" },
      { title: "Document Scraper",      href: "/dashboard/document-data-scraper", icon: "ri-file-text-line" },
      { title: "Image Scraper",         href: "/dashboard/image-data-scraper",    icon: "ri-image-line" },
    ],
  },
  {
    label: "Domain Tools",
    key: "cat.domain_tools",
    items: [
      { title: "Whois Domains",    href: "/dashboard/whois-domains",        icon: "ri-information-line" },
      { title: "Website Checker",  href: "/dashboard/website-urls-checker", icon: "ri-checkbox-circle-line" },
      { title: "Verified Domains", href: "/dashboard/verified-domains",     icon: "ri-verified-badge-line" },
    ],
  },
  {
    label: "WhatsApp Tools",
    key: "cat.whatsapp_tools",
    items: [
      { title: "WA Business Checker",  href: "/dashboard/whatsapp-checker",     icon: "ri-whatsapp-line" },
      { title: "WA Business Verifier", href: "/dashboard/whatsapp-verifier",    icon: "ri-shield-check-line" },
      { title: "Bulk WA Sender",       href: "/dashboard/whatsapp-bulk-sender", icon: "ri-send-plane-line" },
    ],
  },
  {
    label: "Verifiers",
    key: "cat.verifiers",
    items: [
      { title: "Phone Verifier", href: "/dashboard/phone-verifier", icon: "ri-phone-find-line" },
      { title: "Email Verifier", href: "/dashboard/email-verifier", icon: "ri-mail-check-line" },
    ],
  },
  {
    label: "Language",
    key: "cat.language",
    items: [
      { title: "Language Translator", href: "/dashboard/language-translator", icon: "ri-translate-2", badge: "v14" },
    ],
  },
  {
    label: "Ad Intelligence",
    key: "cat.ad_intelligence",
    items: [
      { title: "Facebook Ad Library", href: "/dashboard/facebook-ad-library", icon: "ri-advertisement-line", badge: "v17" },
    ],
  },
  {
    label: "Global Directories",
    key: "cat.global_directories",
    items: [
      { title: "Global Directory", href: "/dashboard/global-directory-scraper", icon: "ri-earth-line", badge: "v17" },
    ],
  },
  {
    label: "CRM",
    key: "cat.crm",
    items: [
      { title: "JustDial Enquiry",  href: "/dashboard/justdial-enquiry",  icon: "ri-customer-service-2-line", badge: "v18" },
      { title: "Indiamart Enquiry", href: "/dashboard/indiamart-enquiry", icon: "ri-customer-service-line",   badge: "v18" },
      { title: "B2C Data",          href: "/dashboard/b2c-data",          icon: "ri-database-line",           badge: "v18" },
    ],
  },
];

// Flat list for command palette
const allItems = nav.flatMap((s) => s.items.map((item) => ({ ...item, section: s.label })));

const BADGE_COLORS = {
  v14: "bg-sky-100 text-sky-600",
  v15: "bg-sky-100 text-sky-700",
  v16: "bg-teal-100 text-teal-600",
  v17: "bg-orange-100 text-orange-600",
  v18: "bg-rose-100 text-rose-600",
  NEW: "bg-sky-100 text-sky-600",
};

function navItemTitle(t, href, fallback) {
  const key = `page.${href.replace("/dashboard/", "").replace(/-/g, "_")}`;
  const tr = t(key);
  return tr === key ? fallback : tr;
}

// ─── Command Palette ──────────────────────────────────────────────────────────
function CommandPalette({ open, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef(null);

  const filtered = query.trim()
    ? allItems.filter(
        (item) =>
          item.title.toLowerCase().includes(query.toLowerCase()) ||
          item.section.toLowerCase().includes(query.toLowerCase())
      )
    : allItems;

  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      setTimeout(() => inputRef.current?.focus(), 20);
    }
  }, [open]);

  useEffect(() => {
    setActiveIdx((i) => Math.min(i, Math.max(0, filtered.length - 1)));
  }, [filtered.length]);

  function go(href) { router.push(href); onClose(); }

  function handleKey(e) {
    if (e.key === "ArrowDown")  { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, filtered.length - 1)); }
    if (e.key === "ArrowUp")    { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
    if (e.key === "Enter" && filtered[activeIdx]) go(filtered[activeIdx].href);
    if (e.key === "Escape") onClose();
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-start justify-center pt-[14vh] px-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-lg bg-white dark:bg-bgdark rounded-xl shadow-2xl border border-gray-200 dark:border-white/10 overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-white/10">
          <i className="ri-search-line text-gray-400 text-lg shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={handleKey}
            placeholder="Search all tools…"
            className="flex-1 bg-transparent text-sm text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none"
          />
          <kbd className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-white/10 text-gray-400 rounded border border-gray-200 dark:border-white/10 font-mono shrink-0">ESC</kbd>
        </div>

        {/* Results list */}
        <div className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No tools match &ldquo;{query}&rdquo;</p>
          ) : (
            filtered.map((item, idx) => (
              <button
                key={item.href}
                onMouseEnter={() => setActiveIdx(idx)}
                onClick={() => go(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                  idx === activeIdx ? "bg-sky-50 dark:bg-sky-900/30" : "hover:bg-gray-50 dark:hover:bg-white/5"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                  idx === activeIdx ? "bg-sky-100 dark:bg-sky-900/50 text-sky-600 dark:text-sky-400" : "bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400"
                }`}>
                  <i className={`${item.icon} text-sm`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${idx === activeIdx ? "text-sky-700 dark:text-sky-300" : "text-gray-700 dark:text-gray-300"}`}>
                    {item.title}
                  </p>
                  <p className="text-[11px] text-gray-400 dark:text-gray-500 truncate">{item.section}</p>
                </div>
                {item.badge && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${BADGE_COLORS[item.badge] || BADGE_COLORS.NEW}`}>
                    {item.badge}
                  </span>
                )}
                {idx === activeIdx && (
                  <kbd className="text-[9px] px-1 py-0.5 bg-sky-100 dark:bg-sky-900/50 text-sky-500 rounded font-mono shrink-0">↵</kbd>
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 dark:border-white/10 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
          <span><kbd className="font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="font-mono">↵</kbd> open</span>
          <span className="ml-auto">{filtered.length} tool{filtered.length !== 1 ? "s" : ""}</span>
        </div>
      </div>
    </div>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export default function Sidebar({ onClose }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState({});
  const [search, setSearch] = useState("");
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [todayRuns, setTodayRuns] = useState({});
  const { t } = useLanguage();

  // Load today's run counts from localStorage (client-only)
  useEffect(() => {
    try {
      const key = `sg_stats_${new Date().toISOString().slice(0, 10)}`;
      const stats = JSON.parse(localStorage.getItem(key) || "{}");
      setTodayRuns(stats.tools || {});
    } catch (_) {}
    // Refresh every 30s in case another tab runs a tool
    const id = setInterval(() => {
      try {
        const key = `sg_stats_${new Date().toISOString().slice(0, 10)}`;
        const stats = JSON.parse(localStorage.getItem(key) || "{}");
        setTodayRuns(stats.tools || {});
      } catch (_) {}
    }, 30000);
    return () => clearInterval(id);
  }, []);

  // Global Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    function onKey(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const toggle = (label) => setCollapsed((p) => ({ ...p, [label]: !p[label] }));

  const searchQ = search.toLowerCase().trim();
  const filteredNav = searchQ
    ? nav
        .map((section) => ({
          ...section,
          items: section.items.filter((item) => item.title.toLowerCase().includes(searchQ)),
        }))
        .filter((section) => section.items.length > 0)
    : nav;

  return (
    <>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      <aside className="w-64 shrink-0 bg-white dark:bg-bgdark2 border-r border-gray-200 dark:border-white/10 h-screen overflow-y-auto flex flex-col">
        <div className="px-5 py-4 border-b border-[#00FF41]/40 flex items-center justify-between">
          <Link href="/dashboard/home" className="text-sm font-bold text-[#00FF41] flex items-center gap-2 uppercase tracking-wide">
            <i className="ri-terminal-box-line" />
            <span>root@bubble:~#</span>
          </Link>
          {onClose && (
            <button onClick={onClose} className="lg:hidden p-1 rounded-none text-[#00FF41]/50 hover:text-[#00FF41]">
              <i className="ri-close-line text-xl" />
            </button>
          )}
        </div>

        {/* Search area */}
        <div className="px-3 pt-3 pb-1 space-y-1.5">
          {/* Cmd+K palette trigger */}
          <button
            onClick={() => setPaletteOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs rounded-none border border-[#00FF41]/30 bg-black text-[#00FF41]/60 hover:border-[#00FF41] hover:text-[#00FF41] hover:shadow-[0_0_10px_rgba(0,255,65,0.2)] transition-all relative text-left uppercase tracking-wider"
          >
            <span className="font-bold">{">"}</span>
            <span className="flex-1">EXECUTE_TOOL...</span>
            <kbd className="text-[9px] px-1 py-0.5 bg-[#00FF41] text-black font-mono shrink-0 uppercase tracking-tighter shadow-sm">⌘K</kbd>
          </button>
          {/* Inline sidebar filter */}
          <div className="relative">
            <i className="ri-filter-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("sidebar.search_tools")}
              className="w-full pl-7 pr-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-sky-400"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <i className="ri-close-line text-xs" />
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {filteredNav.length === 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6">
              {t("sidebar.no_match")} &ldquo;{search}&rdquo;
            </p>
          )}
          {filteredNav.map((section) => (
            <div key={section.label} className="mb-1">
              <button
                onClick={() => toggle(section.label)}
                className="w-full flex items-center justify-between px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 rounded transition-colors"
              >
                {searchQ ? section.label : t(section.key)}
                <i className={`ri-arrow-${collapsed[section.label] ? "right" : "down"}-s-line text-xs`} />
              </button>
              {!collapsed[section.label] && (
                <ul className="mt-0.5 space-y-0.5">
                  {section.items.map((item) => {
                    const active = pathname === item.href || pathname === item.href + "/";
                    const runCount = todayRuns[item.title] || 0;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={onClose}
                          className={`flex items-center gap-2.5 px-3 py-2 rounded-none text-sm transition-all uppercase tracking-wide ${
                            active
                              ? "bg-[#00FF41] text-black font-bold shadow-[0_0_10px_rgba(0,255,65,0.4)]"
                              : "text-[#00FF41]/70 hover:bg-[#00FF41]/10 hover:text-[#00FF41] hover:border-l-2 hover:border-[#00FF41]"
                          }`}
                        >
                          <i className={`${item.icon} text-base shrink-0`} />
                          <span className="flex-1 truncate">{navItemTitle(t, item.href, item.title)}</span>
                          {/* Today's run count */}
                          {runCount > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold shrink-0 min-w-[18px] text-center ${
                              active ? "bg-white/25 text-white" : "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400"
                            }`}>
                              {runCount}
                            </span>
                          )}
                          {/* Version badge */}
                          {item.badge && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold shrink-0 ${
                              active ? "bg-white/20 text-white" : BADGE_COLORS[item.badge] || BADGE_COLORS.NEW
                            }`}>
                              {item.badge}
                            </span>
                          )}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          ))}
        </nav>

        {/* Profile */}
        <div className="px-3 py-3 border-t border-gray-200 dark:border-white/10">
          <Link
            href="/dashboard/profile"
            onClick={onClose}
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <i className="ri-user-line text-base" />
            {t("sidebar.profile")}
          </Link>
        </div>
      </aside>
    </>
  );
}
