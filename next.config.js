
/**@type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  swcMinify: true,
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  compress: true,
  experimental: {
    optimizePackageImports: [
      "@mui/material",
      "@mui/icons-material",
      "@fortawesome/react-fontawesome",
      "date-fns",
      "lodash",
      "lucide-react",
      "react-icons",
    ],
  },
  basePath: "",
  assetPrefix: "",
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  async redirects() {
    return [
      // v14 — old individual search scrapers → combined
      { source: "/dashboard/google-search-scraper", destination: "/dashboard/search-engine-scraper", permanent: true },
      { source: "/dashboard/bing-search-scraper",   destination: "/dashboard/search-engine-scraper", permanent: true },
      { source: "/dashboard/yahoo-search-scraper",  destination: "/dashboard/search-engine-scraper", permanent: true },
      { source: "/dashboard/duckduckgo-search-scraper", destination: "/dashboard/search-engine-scraper", permanent: true },
      // v14 — old individual social scrapers → combined
      { source: "/dashboard/facebook-scraper",  destination: "/dashboard/social-media-scraper", permanent: true },
      { source: "/dashboard/youtube-scraper",   destination: "/dashboard/social-media-scraper", permanent: true },
      { source: "/dashboard/instagram-scraper", destination: "/dashboard/social-media-scraper", permanent: true },
      { source: "/dashboard/linkedin-scraper",  destination: "/dashboard/social-media-scraper", permanent: true },
    ];
  },
  async headers() {
    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      {
        key: "Content-Security-Policy",
        value: [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
          "style-src 'self' 'unsafe-inline' https:",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data: https:",
          "connect-src 'self' https:",
          "frame-ancestors 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join("; "),
      },
    ];
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

module.exports = nextConfig;
