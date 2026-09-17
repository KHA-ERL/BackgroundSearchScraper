import Link from "next/link";
import { SITE_NAME, SITE_URL, absoluteUrl, seoTools, toolCategories } from "../lib/seo/tools";

export const metadata = {
  title: "Bubble Scraper | AI-Ready Web Scraping, Lead Data, and Verification Tools",
  description:
    "Bubble Scraper is a web scraping and data intelligence app for lead generation, search scraping, website data extraction, email verification, phone verification, WhatsApp checks, and direct career page job search.",
  alternates: {
    canonical: "/",
  },
  keywords: [
    "web scraping app",
    "AI-ready data extraction",
    "Bing search scraper",
    "Google Maps scraper",
    "email scraper",
    "phone number scraper",
    "WhatsApp checker",
    "job portal scraper",
    "website data scraper",
    "lead generation scraper",
  ],
  openGraph: {
    url: SITE_URL,
    title: "Bubble Scraper | AI-Ready Web Scraping and Data Intelligence",
    description:
      "A source-backed scraping dashboard for lead generation, search results, websites, documents, images, verification, and job research.",
  },
};

const featuredTools = seoTools.slice(0, 12);

function questionForTool(tool) {
  return `What is ${tool.answers[0]}?`;
}

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "SoftwareApplication",
      "@id": `${SITE_URL}/#software`,
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: metadata.description,
      offers: {
        "@type": "Offer",
        availability: "https://schema.org/InStock",
        url: SITE_URL,
      },
      featureList: seoTools.map((tool) => tool.name),
    },
    {
      "@type": "ItemList",
      "@id": `${SITE_URL}/#tools`,
      name: "Bubble Scraper tools",
      itemListElement: seoTools.map((tool, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: tool.name,
        url: absoluteUrl(tool.path),
        description: tool.description,
      })),
    },
    {
      "@type": "FAQPage",
      "@id": `${SITE_URL}/#answers`,
      mainEntity: featuredTools.map((tool) => ({
        "@type": "Question",
        name: questionForTool(tool),
        acceptedAnswer: {
          "@type": "Answer",
          text: `${tool.name} in Bubble Scraper helps users ${tool.description.charAt(0).toLowerCase()}${tool.description.slice(1)}`,
        },
      })),
    },
  ],
};

export default function RootPage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex min-h-[92vh] max-w-7xl flex-col justify-between px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between gap-4" aria-label="Primary">
            <Link href="/" className="text-base font-semibold text-slate-950">
              Bubble Scraper
            </Link>
            <Link
              href="/dashboard/home"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open app
            </Link>
          </nav>

          <div className="grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <p className="mb-4 text-sm font-semibold uppercase tracking-normal text-orange-700">
                AI-ready web scraping and data intelligence
              </p>
              <h1 className="max-w-4xl text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl lg:text-6xl">
                Bubble Scraper answers web data, lead generation, verification, and source research needs from one dashboard.
              </h1>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-slate-700">
                Use Bubble Scraper to extract public website data, collect search and directory leads, verify emails and phone numbers, check WhatsApp contacts, analyze public social URLs, and search direct company career pages.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/search-engine-scraper"
                  className="rounded-md bg-orange-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-orange-700"
                >
                  Search scraping
                </Link>
                <Link
                  href="/dashboard/email-verifier"
                  className="rounded-md border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-slate-950"
                >
                  Verify data
                </Link>
              </div>
            </div>

            <aside className="border border-slate-200 bg-slate-50 p-5">
              <h2 className="text-base font-semibold text-slate-950">Direct answers</h2>
              <dl className="mt-4 space-y-4">
                <div>
                  <dt className="text-sm font-semibold text-slate-900">What is Bubble Scraper?</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-700">
                    Bubble Scraper is a browser-based data intelligence app for scraping, verifying, enriching, exporting, and analyzing public web data.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-slate-900">Who uses it?</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-700">
                    Teams that need lead generation, website extraction, source research, job discovery, contact verification, and public social or ad intelligence workflows.
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-semibold text-slate-900">What can it export?</dt>
                  <dd className="mt-1 text-sm leading-6 text-slate-700">
                    Scraped and verified records can be organized for cleaner CSV-style research, prospecting, analysis, and outreach workflows.
                  </dd>
                </div>
              </dl>
            </aside>
          </div>

          <div className="grid gap-3 border-t border-slate-200 pt-5 text-sm text-slate-600 sm:grid-cols-3">
            <p>Search engines: Bing, Google, Yahoo, DuckDuckGo workflows</p>
            <p>Data types: websites, emails, phones, images, documents, domains</p>
            <p>Use cases: leads, verification, social context, jobs, ad research</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <h2 className="text-2xl font-bold text-slate-950">What Bubble Scraper can help with</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {toolCategories.map((category) => (
            <article key={category.name} className="border border-slate-200 bg-white p-5">
              <h3 className="text-base font-semibold text-slate-950">{category.name}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{category.summary}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
          <h2 className="text-2xl font-bold text-slate-950">Feature index for search and AI answers</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {seoTools.map((tool) => (
              <article key={tool.path} className="border border-slate-200 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <h3 className="text-base font-semibold text-slate-950">
                    <Link href={tool.path} className="hover:text-orange-700">
                      {tool.name}
                    </Link>
                  </h3>
                  <span className="rounded-sm bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
                    {tool.category}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">{tool.description}</p>
                <p className="mt-3 text-xs leading-5 text-slate-500">
                  Matches searches for: {tool.answers.join(", ")}.
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10">
        <h2 className="text-2xl font-bold text-slate-950">How Bubble Scraper supports AI search visibility</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <article className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">Crawlable answers</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Public pages use visible text, normal links, metadata, and schema so Bing and answer engines can understand the product without relying only on client-side app screens.
            </p>
          </article>
          <article className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">Source-backed positioning</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              The app is described as a tool for public web discovery, verification, enrichment, and human-reviewed analysis rather than a source of unsupported automated decisions.
            </p>
          </article>
          <article className="border border-slate-200 bg-white p-5">
            <h3 className="text-base font-semibold text-slate-950">Bing discovery signals</h3>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Sitemap, robots, structured data, llms.txt, and IndexNow endpoints help Bing find canonical URLs and refresh changed content faster.
            </p>
          </article>
        </div>
      </section>
    </main>
  );
}
