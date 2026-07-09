
/**@type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  trailingSlash: true,
  swcMinify: true,
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
};

module.exports = nextConfig;
