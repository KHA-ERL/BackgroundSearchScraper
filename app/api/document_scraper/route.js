import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

const DOC_EXTENSIONS = ["pdf", "doc", "docx", "xlsx", "xls", "ppt", "pptx", "csv"];

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url } = await request.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    // Scroll to load lazy content
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);

    const results = await page.evaluate((extensions) => {
      const data = [];
      const seen = new Set();

      const addLink = (href, text) => {
        if (!href || seen.has(href)) return;
        // Check extension
        const lower = href.toLowerCase().split("?")[0];
        const ext = lower.split(".").pop();
        if (!extensions.includes(ext)) return;

        seen.add(href);
        // Get filename from URL
        const parts = lower.split("/");
        const filename = decodeURIComponent(parts[parts.length - 1] || href);
        const displayName = text?.trim() || filename;

        data.push({
          name: displayName.length > 100 ? displayName.slice(0, 100) : displayName,
          url: href,
          type: ext.toUpperCase(),
        });
      };

      // Collect all anchor tags
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.href;
        addLink(href, a.innerText || a.getAttribute("download") || "");
      });

      // Also check data attributes that might hold document URLs
      document.querySelectorAll("[data-src],[data-href],[data-url]").forEach((el) => {
        const href = el.getAttribute("data-src") || el.getAttribute("data-href") || el.getAttribute("data-url");
        if (href) addLink(href, el.innerText || "");
      });

      return data;
    }, DOC_EXTENSIONS);

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Document scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
