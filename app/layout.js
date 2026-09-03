import "../public/assets/css/style.min.css";
import "./globals.css";
import Providers from "../components/Providers";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://bubblescraper.app").replace(/\/$/, "");

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Bubble Scraper | Web Scraping and Data Intelligence",
    template: "%s | Bubble Scraper",
  },
  description: "Bubble Scraper helps teams collect, verify, enrich, and analyze web data from direct sources with faster workflows and cleaner exports.",
  applicationName: "Bubble Scraper",
  alternates: {
    canonical: "/",
  },
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/apple-touch-icon.svg",
  },
  openGraph: {
    type: "website",
    url: siteUrl,
    siteName: "Bubble Scraper",
    title: "Bubble Scraper | Web Scraping and Data Intelligence",
    description: "Search, scrape, verify, enrich, and analyze direct-source web data from one production-ready dashboard.",
    images: [{ url: "/social-share.svg", width: 1200, height: 630, alt: "Bubble Scraper data intelligence dashboard preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bubble Scraper | Web Scraping and Data Intelligence",
    description: "A premium dashboard for source-verified scraping, enrichment, and analysis workflows.",
    images: ["/social-share.svg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light dark",
  themeColor: "#fff8ef",
};

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Bubble Scraper",
      url: siteUrl,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "A web scraping and data intelligence platform for direct-source discovery, verification, enrichment, and AI-assisted analysis.",
    },
    {
      "@type": "LocalBusiness",
      name: "Bubble Scraper",
      url: siteUrl,
      description: "Data intelligence software for organizations that need faster public web discovery and source-backed scraping workflows.",
      areaServed: "Worldwide",
      sameAs: [siteUrl],
    },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-gray-100 dark:bg-bodybg text-defaulttextcolor">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
