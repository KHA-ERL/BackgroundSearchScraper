"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const SITE_NAME = "Bubble Scraper";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://bubblescraper.app").replace(/\/$/, "");

const PAGE_META = {
  "/dashboard/home": {
    title: "Bubble Scraper Dashboard",
    description: "Command center for web scraping, enrichment, verification, and AI-powered data analysis workflows.",
  },
  "/dashboard/job-portal-scraper": {
    title: "Direct Career Page Job Search",
    description: "Find fresh roles directly from company career pages with similar postings, saved alerts, and source freshness monitoring.",
  },
  "/dashboard/social-background-analysis": {
    title: "Social Background Analysis",
    description: "Analyze public social media URLs and summarize observable patterns, risks, and context from verifiable sources.",
  },
  "/dashboard/profile": {
    title: "Settings and API Keys",
    description: "Manage scraper credentials, AI providers, model preferences, proxies, webhooks, and application settings.",
  },
};

function titleFromPath(pathname = "") {
  const last = pathname.split("/").filter(Boolean).pop() || "home";
  return last.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

function upsertMeta(selector, createTag, attrs = {}) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = document.createElement(createTag);
    document.head.appendChild(element);
  }
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
  return element;
}

export default function RouteMeta() {
  const pathname = usePathname() || "/dashboard/home";

  useEffect(() => {
    const cleanPath = pathname.endsWith("/") && pathname !== "/" ? pathname.slice(0, -1) : pathname;
    const meta = PAGE_META[cleanPath] || {
      title: titleFromPath(cleanPath),
      description: `${titleFromPath(cleanPath)} tools and data workflows in Bubble Scraper.`,
    };
    const title = `${meta.title} | ${SITE_NAME}`;
    const canonical = `${SITE_URL}${cleanPath === "/" ? "" : cleanPath}`;

    document.title = title;
    upsertMeta("meta[name='description']", "meta", { name: "description", content: meta.description });
    upsertMeta("link[rel='canonical']", "link", { rel: "canonical", href: canonical });
    upsertMeta("meta[property='og:title']", "meta", { property: "og:title", content: title });
    upsertMeta("meta[property='og:description']", "meta", { property: "og:description", content: meta.description });
    upsertMeta("meta[property='og:url']", "meta", { property: "og:url", content: canonical });

    const breadcrumb = {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: cleanPath.split("/").filter(Boolean).map((segment, index, segments) => ({
        "@type": "ListItem",
        position: index + 1,
        name: segment.replace(/-/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()),
        item: `${SITE_URL}/${segments.slice(0, index + 1).join("/")}`,
      })),
    };
    let script = document.getElementById("route-breadcrumb-schema");
    if (!script) {
      script = document.createElement("script");
      script.id = "route-breadcrumb-schema";
      script.type = "application/ld+json";
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(breadcrumb);
  }, [pathname]);

  return null;
}
