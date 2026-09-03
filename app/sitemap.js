const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bubblescraper.app").replace(/\/$/, "");

const routes = [
  "",
  "/dashboard/home",
  "/dashboard/job-portal-scraper",
  "/dashboard/social-background-analysis",
  "/dashboard/profile",
  "/dashboard/search-engine-scraper",
  "/dashboard/social-media-scraper",
  "/dashboard/business-directory-scraper",
  "/dashboard/global-directory-scraper",
  "/dashboard/website-data-scraper",
  "/dashboard/website-urls-checker",
  "/dashboard/email-scraper",
  "/dashboard/email-verifier",
  "/dashboard/phone-number-scraper",
  "/dashboard/phone-verifier",
  "/dashboard/image-data-scraper",
  "/dashboard/document-data-scraper",
];

export default function sitemap() {
  const now = new Date();
  return routes.map((route) => ({
    url: `${siteUrl}${route}`,
    lastModified: now,
    changeFrequency: route.includes("dashboard") ? "weekly" : "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
