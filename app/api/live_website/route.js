import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "urls array required" }, { status: 400 });
    }

    const limitedUrls = urls.slice(0, 20);
    browser = await chromium.launch({ headless: true });
    const results = [];

    for (const rawUrl of limitedUrls) {
      let url = rawUrl.trim();
      if (!url) continue;
      if (!/^https?:\/\//i.test(url)) url = "https://" + url;

      const context = await browser.newContext({
        userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });

      // Block images and fonts to speed up
      await context.route("**/*.{png,jpg,jpeg,gif,webp,svg,ico,woff,woff2,ttf,otf}", (route) => route.abort());

      const page = await context.newPage();
      let status = "error";

      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        status = response ? String(response.status()) : "error";

        const data = await page.evaluate(() => {
          const title = document.title || "";
          const metaDesc = document.querySelector('meta[name="description"]')?.content ||
            document.querySelector('meta[property="og:description"]')?.content || "";
          const h1Els = Array.from(document.querySelectorAll("h1")).slice(0, 3).map((el) => el.innerText.trim()).filter(Boolean);
          const linksCount = document.querySelectorAll("a[href]").length;
          const imagesCount = document.querySelectorAll("img").length;
          return { title, meta_description: metaDesc, h1s: h1Els, links_count: linksCount, images_count: imagesCount };
        });

        results.push({ url, ...data, status });
      } catch (err) {
        results.push({ url, title: "", meta_description: "", h1s: [], links_count: 0, images_count: 0, status: "error: " + (err.message || "timeout").slice(0, 60) });
      } finally {
        await context.close();
      }
    }

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Live website scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
