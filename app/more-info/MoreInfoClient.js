"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";

const ICONS = {
  "Business Directory Scraper": "/assets/iconfonts/dashboard-icon/directoryIcon.png",
  "Justdial Scraper": "/assets/iconfonts/dashboard-icon/directoryIcon.png",
  "IndiaMART Scraper": "/assets/iconfonts/dashboard-icon/directoryIcon.png",
  "Sulekha Scraper": "/assets/iconfonts/dashboard-icon/directoryIcon.png",
  "Google Maps Scraper": "/assets/iconfonts/dashboard-icon/gmapIcon.png",
  "Email Scraper": "/assets/iconfonts/dashboard-icon/verify.png",
  "Phone Number Scraper": "/assets/iconfonts/dashboard-icon/checker.png",
  "WhatsApp Number Scraper": "/assets/iconfonts/dashboard-icon/checker.png",
  "Search Engine Scraper": "/assets/iconfonts/dashboard-icon/bing.png",
  "Live Website Scraping": "/assets/iconfonts/dashboard-icon/live.png",
  "Website Data Scraper": "/assets/iconfonts/dashboard-icon/website.png",
  "Document Scraper": "/assets/iconfonts/dashboard-icon/docIcon.png",
  "Image Scraper": "/assets/iconfonts/dashboard-icon/imageIcon.png",
  "Email Verifier": "/assets/iconfonts/dashboard-icon/verify.png",
  "WhatsApp Verifier": "/assets/iconfonts/dashboard-icon/checker.png",
  "Phone Verifier": "/assets/iconfonts/dashboard-icon/checker.png",
  "WhatsApp Checker": "/assets/iconfonts/dashboard-icon/checker.png",
  "Domain Verifier": "/assets/iconfonts/dashboard-icon/domain.png",
  "URL Checker": "/assets/iconfonts/dashboard-icon/websiteIcon.png",
  "WHOIS Lookup": "/assets/iconfonts/dashboard-icon/domain.png",
  "Social Media Scraper": "/assets/iconfonts/dashboard-icon/linkedin.png",
  "Social Background Analysis": "/assets/iconfonts/dashboard-icon/linkedin.png",
  "Facebook Ad Library": "/assets/iconfonts/dashboard-icon/facebook.png",
  "eCommerce Scraper": "/assets/iconfonts/dashboard-icon/website.png",
  "Myntra Scraper": "/assets/iconfonts/dashboard-icon/website.png",
  "Snapdeal Scraper": "/assets/iconfonts/dashboard-icon/website.png",
  "Job Portal Scraper": "/assets/iconfonts/dashboard-icon/websiteIcon.png",
  "Corporate Scraper": "/assets/iconfonts/dashboard-icon/websiteIcon.png",
  "B2C Data": "/assets/iconfonts/dashboard-icon/dashboard.png",
  "JustDial Enquiry": "/assets/iconfonts/dashboard-icon/dashboard.png",
  "IndiaMART Enquiry": "/assets/iconfonts/dashboard-icon/dashboard.png",
  "Global Directory Scraper": "/assets/iconfonts/dashboard-icon/map.png",
  "Language Translator": "/assets/iconfonts/dashboard-icon/docIcon.png",
};

function getIcon(tool) {
  return ICONS[tool.name] || "/assets/iconfonts/dashboard-icon/dashboard.png";
}

function getUsage(tool) {
  const name = tool.name.toLowerCase();

  if (name.includes("job portal")) {
    return [
      "Enter a role, skill, or keyword such as data engineer, React, remote, or product manager.",
      "Choose the company mix that fits your search: all trusted, startup, or big tech.",
      "Review the results table for role title, company, location, source, trust signals, and posting link.",
      "Open promising roles at the source, then sign in if you want to keep searches, alerts, or saved research.",
    ];
  }

  if (name.includes("verifier") || name.includes("checker") || name.includes("whois")) {
    return [
      "Paste one item or upload a list, depending on the tool.",
      "Run the check to validate status, format, reachability, or source signals.",
      "Review warning states before using the data in outreach, research, or saved records.",
      "Export or save the cleaned results when you are signed in.",
    ];
  }

  if (name.includes("scraper") || name.includes("scraping")) {
    return [
      "Enter the public URL, keyword, location, source, or category requested by the tool.",
      "Start the scrape and wait for the results table to populate.",
      "Filter, inspect, and remove records that are not relevant to your task.",
      "Export the clean data or sign in to save the scrape and continue later.",
    ];
  }

  if (name.includes("translator")) {
    return [
      "Paste the text or scraped content you want to translate.",
      "Select the target language.",
      "Review the translated output before using it in research or outreach.",
      "Copy or save the result when you are signed in.",
    ];
  }

  return [
    "Open the tool and enter the requested source data.",
    "Run the workflow and review the returned results.",
    "Clean the results before exporting or saving.",
    "Sign in when you want history, saved projects, alerts, and profile settings.",
  ];
}

function getBestFor(tool) {
  const category = tool.category.toLowerCase();

  if (category.includes("lead")) {
    return "Best for building prospect lists, finding business records, and preparing outreach research from public sources.";
  }

  if (category.includes("search")) {
    return "Best for collecting public page, search, product, document, image, or website data into a structured workspace.";
  }

  if (category.includes("verification")) {
    return "Best for checking data quality before you rely on it, export it, or use it in another workflow.";
  }

  if (category.includes("social")) {
    return "Best for reviewing public social or ad signals with source context and human judgment.";
  }

  return "Best for company, job, enquiry, and research workflows where source quality matters.";
}

function getInputHint(tool) {
  const name = tool.name.toLowerCase();

  if (name.includes("maps")) return "Business type and location";
  if (name.includes("search engine")) return "Keyword, engine, and region";
  if (name.includes("job")) return "Role, skill, location, and company mix";
  if (name.includes("website") || name.includes("live") || name.includes("image") || name.includes("document")) return "Public website URL";
  if (name.includes("email")) return "Email, domain, URL, or list";
  if (name.includes("phone") || name.includes("whatsapp")) return "Phone number or list";
  if (name.includes("domain") || name.includes("whois") || name.includes("url")) return "Domain or URL list";
  if (name.includes("translator")) return "Text and target language";
  return "Keyword, URL, source, or list";
}

function getResultHint(tool) {
  const name = tool.name.toLowerCase();

  if (name.includes("job")) return "Verified job links, companies, locations, and trust signals";
  if (name.includes("verifier") || name.includes("checker") || name.includes("whois")) return "Validation status, warnings, and source details";
  if (name.includes("scraper")) return "Structured rows ready for review and export";
  if (name.includes("translator")) return "Translated text ready for review";
  return "Clean records for review, export, or saving";
}

export default function MoreInfoClient({ tools }) {
  const [query, setQuery] = useState("");
  const [activePath, setActivePath] = useState(tools[0]?.path || "");

  const activeTool = tools.find((tool) => tool.path === activePath) || tools[0];

  const filteredTools = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return tools;

    return tools.filter((tool) => {
      const haystack = [
        tool.name,
        tool.category,
        tool.description,
        ...(tool.answers || []),
      ]
        .join(" ")
        .toLowerCase();

      return haystack.includes(normalized);
    });
  }, [query, tools]);

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-5 pb-12 sm:px-8 lg:grid-cols-[320px_minmax(0,1fr)] lg:px-10">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <div className="rounded-md border border-slate-200 bg-white p-4 shadow-sm">
          <label htmlFor="tool-search" className="text-sm font-bold text-slate-950">
            Search tools
          </label>
          <input
            id="tool-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Job, email, website..."
            className="mt-3 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
          />

          <div className="mt-4 max-h-[62vh] space-y-2 overflow-y-auto pr-1">
            {filteredTools.map((tool) => {
              const isActive = activeTool?.path === tool.path;

              return (
                <button
                  key={tool.path}
                  type="button"
                  onClick={() => setActivePath(tool.path)}
                  className={`flex w-full items-center gap-3 rounded-md border px-3 py-3 text-left transition ${
                    isActive
                      ? "border-orange-500 bg-orange-50 text-slate-950"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  <Image src={getIcon(tool)} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold">{tool.name}</span>
                    <span className="block truncate text-xs text-slate-500">{tool.category}</span>
                  </span>
                </button>
              );
            })}
          </div>

          {!filteredTools.length ? (
            <p className="mt-4 rounded-md bg-slate-50 px-3 py-3 text-sm text-slate-600">
              No matching tools yet. Try a broader word like website, email, jobs, leads, or verify.
            </p>
          ) : null}
        </div>
      </aside>

      {activeTool ? (
        <article className="rounded-md border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 p-5 sm:p-7">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
                  <Image src={getIcon(activeTool)} alt="" width={52} height={52} className="h-13 w-13 object-contain" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-orange-700">{activeTool.category}</p>
                  <h2 className="mt-1 text-3xl font-bold tracking-normal text-slate-950">
                    {activeTool.name}
                  </h2>
                </div>
              </div>

              <Link
                href={activeTool.path}
                className="inline-flex items-center justify-center rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-orange-700"
              >
                Open this tool
              </Link>
            </div>

            <p className="mt-6 max-w-3xl text-base leading-7 text-slate-700">
              {activeTool.description}
            </p>
          </div>

          <div className="grid gap-6 p-5 sm:p-7 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-6">
              <section>
                <h3 className="text-lg font-bold text-slate-950">When to use it</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">{getBestFor(activeTool)}</p>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-950">How to use it</h3>
                <ol className="mt-3 space-y-3">
                  {getUsage(activeTool).map((step, index) => (
                    <li key={step} className="flex gap-3 text-sm leading-6 text-slate-700">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-orange-100 text-sm font-bold text-orange-800">
                        {index + 1}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section>
                <h3 className="text-lg font-bold text-slate-950">Important note</h3>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  Guest users can test the workflow. Sign in when you want saved history, saved scrapes, projects, alerts, or profile settings tied to your account.
                </p>
              </section>
            </div>

            <aside className="space-y-4">
              <div className="rounded-md border border-slate-200 bg-[#f7f8f4] p-4">
                <h3 className="text-sm font-bold text-slate-950">UI reference</h3>
                <div className="mt-4 space-y-3">
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-normal text-slate-500">Input area</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{getInputHint(activeTool)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-normal text-slate-500">Results area</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">{getResultHint(activeTool)}</p>
                  </div>
                  <div className="rounded-md border border-slate-200 bg-white p-3">
                    <p className="text-xs font-bold uppercase tracking-normal text-slate-500">Actions</p>
                    <p className="mt-1 text-sm font-semibold text-slate-950">Review, export, save, or open source links</p>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-slate-200 bg-white p-4">
                <h3 className="text-sm font-bold text-slate-950">Common searches</h3>
                <div className="mt-3 flex flex-wrap gap-2">
                  {activeTool.answers.map((answer) => (
                    <span key={answer} className="rounded-md bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                      {answer}
                    </span>
                  ))}
                </div>
              </div>
            </aside>
          </div>
        </article>
      ) : null}
    </section>
  );
}
