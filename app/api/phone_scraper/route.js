import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

const PHONE_REGEX = /\+?\d{1,4}?[-.\s]?\(?\d{2,5}\)?[-.\s]?\d{3,4}[-.\s]?\d{4,9}/g;

function filterPhones(raw) {
  return [
    ...new Set(
      raw.filter((p) => {
        const digits = p.replace(/[^\d+]/g, "");
        return (
          digits.length >= 7 &&
          digits.length <= 15 &&
          !/^\d+$/.test(digits) || (digits.length >= 10 && digits.length <= 14)
        );
      })
    ),
  ].map((p) => p.replace(/[\s()\-]/g, ""));
}

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

        const html = (await page.content()).slice(0, 500_000); // cap size
        const raw = html.match(PHONE_REGEX) || [];
        const phones = filterPhones(raw);
        const title = await page.title().catch(() => url);

        results.push({ url, title, phones, count: phones.length });
        await page.close();
      } catch (e) {
        if (page) await page.close().catch(() => {});
        results.push({ url, title: "Error", phones: [], count: 0, error: e.message });
      }
    }

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Phone scraper error:", err);
    return NextResponse.json({ error: "Failed to scrape phones" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
