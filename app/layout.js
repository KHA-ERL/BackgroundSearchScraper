import "../public/assets/css/style.min.css";
import "./globals.css";
import Providers from "../components/Providers";
import { SITE_URL, seoTools } from "../lib/seo/tools";

const bingVerification = process.env.BING_SITE_VERIFICATION;

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bubble Scraper | AI-Ready Web Scraping and Data Intelligence",
    template: "%s | Bubble Scraper",
  },
  description: "Bubble Scraper helps teams scrape public web data, collect leads, verify contacts, enrich records, search direct career pages, and analyze source-backed data from one dashboard.",
  applicationName: "Bubble Scraper",
  keywords: [
    "Bubble Scraper",
    "web scraping dashboard",
    "AI search optimization",
    "Bing scraper",
    "lead generation scraper",
    "email verifier",
    "phone verifier",
    "WhatsApp checker",
    "Google Maps scraper",
    "job portal scraper",
  ],
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
    url: SITE_URL,
    siteName: "Bubble Scraper",
    title: "Bubble Scraper | AI-Ready Web Scraping and Data Intelligence",
    description: "Search, scrape, verify, enrich, and analyze public web data from one production-ready dashboard.",
    images: [{ url: "/social-share.svg", width: 1200, height: 630, alt: "Bubble Scraper data intelligence dashboard preview" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Bubble Scraper | AI-Ready Web Scraping and Data Intelligence",
    description: "A dashboard for source-verified scraping, enrichment, verification, and analysis workflows.",
    images: ["/social-share.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  ...(bingVerification
    ? {
        verification: {
          other: {
            "msvalidate.01": bingVerification,
          },
        },
      }
    : {}),
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
      url: SITE_URL,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description: "A web scraping and data intelligence platform for public web discovery, lead generation, verification, enrichment, and AI-assisted analysis.",
      featureList: seoTools.map((tool) => tool.name),
    },
    {
      "@type": "Organization",
      name: "Bubble Scraper",
      url: SITE_URL,
      description: "Data intelligence software for organizations that need faster public web discovery and source-backed scraping workflows.",
      areaServed: "Worldwide",
      sameAs: [SITE_URL],
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
