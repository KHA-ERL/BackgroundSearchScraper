import { SITE_URL, seoTools } from "../lib/seo/tools";

const routes = [
  "",
  "/llms.txt",
  "/dashboard/home",
  ...seoTools.map((tool) => tool.path),
];

export default function sitemap() {
  const now = new Date();
  return routes.map((route) => ({
    url: `${SITE_URL}${route}`,
    lastModified: now,
    changeFrequency: route === "" ? "weekly" : "monthly",
    priority: route === "" ? 1 : route === "/llms.txt" ? 0.5 : 0.75,
  }));
}
