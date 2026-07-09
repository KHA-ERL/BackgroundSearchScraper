import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0)
      return NextResponse.json({ error: "URLs array is required" }, { status: 400 });

    browser = await chromium.launch({ headless: true });
    const results = [];

    for (const rawUrl of urls.slice(0, 30)) {
      const url = rawUrl.startsWith("http") ? rawUrl : `https://${rawUrl}`;
      let page;
      try {
        page = await browser.newPage();
        await page.route("**/*", (route) => {
          const rt = route.request().resourceType();
          if (["image", "media", "font"].includes(rt)) return route.abort();
          route.continue();
        });
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(1500);

        const html = await page.content();
        const emailRegex = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;
        const found = [...new Set(html.match(emailRegex) || [])].filter(
          (e) =>
            !e.includes(".png") &&
            !e.includes(".jpg") &&
            !e.includes(".gif") &&
            !e.endsWith(".css") &&
            !e.endsWith(".js")
        );

        const title = await page.title().catch(() => url);
        results.push({ url, title, emails: found, count: found.length });
        await page.close();
      } catch (e) {
        if (page) await page.close().catch(() => {});
        results.push({ url, title: "Error", emails: [], count: 0, error: e.message });
      }
    }

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Email scraper error:", err);
    return NextResponse.json({ error: "Failed to scrape emails" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
