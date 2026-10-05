import Link from "next/link";
import Image from "next/image";
import { SITE_NAME, SITE_URL, absoluteUrl, seoTools } from "../lib/seo/tools";

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
    <main className="min-h-screen overflow-hidden bg-[#f6f7f2] text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      <section className="relative min-h-screen bg-[url('/assets/img/landing/1.jpg')] bg-cover bg-center">
        <div className="absolute inset-0 bg-[#f6f7f2]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_22%,rgba(249,115,22,0.22),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(15,23,42,0.12),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.8),rgba(255,247,237,0.45))]" />

        <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 py-6 sm:px-8 lg:px-10">
          <nav className="flex items-center justify-between gap-4" aria-label="Primary">
            <Link href="/" className="text-base font-bold tracking-normal text-slate-950">
              Bubble Scraper
            </Link>
            <Link
              href="/dashboard/home"
              className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700"
            >
              Open app
            </Link>
          </nav>

          <div className="flex flex-1 items-center py-14">
            <div className="max-w-3xl">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/70 px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm backdrop-blur">
                <span className="h-2 w-2 rounded-full bg-orange-600" />
                AI-ready data intelligence
              </div>

              <h1 className="max-w-4xl text-5xl font-bold tracking-normal text-slate-950 sm:text-6xl lg:text-7xl">
                Turn public web data into useful answers.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-700 sm:text-xl">
                Bubble Scraper helps teams discover, verify, and organize public web data for leads, research, websites, contacts, and trusted job discovery from one clean workspace.
              </p>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/dashboard/home"
                  className="inline-flex items-center justify-center rounded-md bg-orange-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-orange-600/20 transition hover:bg-orange-700"
                >
                  Open app
                </Link>
                <Link
                  href="/more-info"
                  className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white/70 px-6 py-3 text-sm font-bold text-slate-950 shadow-sm backdrop-blur transition hover:border-slate-950 hover:bg-white"
                >
                  More information
                </Link>
              </div>

              <p className="mt-8 text-sm font-semibold text-slate-600">
                Contact us:{" "}
                <a className="text-slate-950 underline decoration-orange-500 underline-offset-4" href="mailto:contact@ourcribhub.com">
                  contact@ourcribhub.com
                </a>
              </p>
            </div>
          </div>

          <div className="pb-6">
            <div className="grid max-w-2xl grid-cols-3 gap-3" aria-hidden="true">
              <Image
                src="/assets/iconfonts/dashboard-icon/bing.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg border border-white/80 bg-white/70 p-2 shadow-sm backdrop-blur"
              />
              <Image
                src="/assets/iconfonts/dashboard-icon/verify.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg border border-white/80 bg-white/70 p-2 shadow-sm backdrop-blur"
              />
              <Image
                src="/assets/iconfonts/dashboard-icon/website.png"
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 rounded-lg border border-white/80 bg-white/70 p-2 shadow-sm backdrop-blur"
              />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
