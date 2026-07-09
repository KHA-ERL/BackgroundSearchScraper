import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

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

    // Block non-essential resources to speed up page load
    await page.route("**/*.{css,woff,woff2,ttf,eot,mp4,webm,ogg,mp3,wav,pdf}", (r) => r.abort());

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);

    // Scroll to trigger lazy loading
    await page.evaluate(() => {
      return new Promise((resolve) => {
        let totalHeight = 0;
        const distance = 300;
        const timer = setInterval(() => {
          window.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= document.body.scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 100);
      });
    });
    await page.waitForTimeout(1000);

    const results = await page.evaluate(() => {
      const seen = new Set();
      const data = [];

      document.querySelectorAll("img").forEach((img) => {
        const src = img.src || img.getAttribute("data-src") || img.getAttribute("data-lazy-src") || "";
        if (!src || seen.has(src)) return;

        // Try to get real dimensions
        const w = img.naturalWidth || img.width || 0;
        const h = img.naturalHeight || img.height || 0;

        // Filter out tiny images
        if (w < 50 && h < 50 && w !== 0 && h !== 0) return;

        seen.add(src);
        data.push({
          src,
          alt: img.alt || "",
          width: img.width || 0,
          height: img.height || 0,
          naturalWidth: img.naturalWidth || 0,
          naturalHeight: img.naturalHeight || 0,
        });
      });

      return data;
    });

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Image scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
