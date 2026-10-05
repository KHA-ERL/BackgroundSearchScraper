import Link from "next/link";
import MoreInfoClient from "./MoreInfoClient";
import { seoTools, SITE_NAME } from "../../lib/seo/tools";

export const metadata = {
  title: `More Info | ${SITE_NAME} Documentation`,
  description:
    "Simple Bubble Scraper documentation with searchable tool guides, usage steps, and interface references.",
  alternates: {
    canonical: "/more-info",
  },
};

export default function MoreInfoPage() {
  return (
    <main className="min-h-screen bg-[#f7f8f4] text-slate-950">
      <header className="border-b border-slate-200 bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4 sm:px-8 lg:px-10">
          <Link href="/" className="text-base font-bold text-slate-950">
            Bubble Scraper
          </Link>
          <Link
            href="/dashboard/home"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700"
          >
            Open app
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-5 py-8 sm:px-8 lg:px-10">
        <div className="max-w-3xl">
          <p className="text-sm font-semibold uppercase tracking-normal text-orange-700">
            Platform documentation
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-normal text-slate-950 sm:text-5xl">
            Find the tool you need, then read only that guide.
          </h1>
          <p className="mt-4 text-base leading-7 text-slate-700 sm:text-lg">
            Search or choose a tool on the left. Each guide explains what the tool does, when to use it, and the basic workflow without making you read the whole platform manual.
          </p>
        </div>
      </section>

      <MoreInfoClient tools={seoTools} />
    </main>
  );
}
