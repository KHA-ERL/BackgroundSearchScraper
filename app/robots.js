import { SITE_URL } from "../lib/seo/tools";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/dashboard/"],
        disallow: ["/api/", "/dashboard/auth/", "/dashboard/profile/"],
      },
      {
        userAgent: "bingbot",
        allow: ["/", "/dashboard/"],
        disallow: ["/api/", "/dashboard/auth/", "/dashboard/profile/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
