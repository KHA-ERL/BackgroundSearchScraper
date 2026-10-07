import { SITE_URL } from "../lib/seo/tools";

export default function robots() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/dashboard/"],
        disallow: ["/api/", "/dashboard/auth/", "/dashboard/profile/", "/dashboard/admin/"],
      },
      {
        userAgent: "bingbot",
        allow: ["/", "/dashboard/"],
        disallow: ["/api/", "/dashboard/auth/", "/dashboard/profile/", "/dashboard/admin/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
