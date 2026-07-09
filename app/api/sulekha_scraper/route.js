import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";
import fs from "fs";
import path from "path";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query, city = "india" } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const safeName = `${query}_${city}`.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const cacheDir = path.resolve(process.cwd(), "..", "data", "sulekha_data");
    const cacheFile = path.join(cacheDir, `${safeName}.json`);
    if (fs.existsSync(cacheFile)) {
      const cached = JSON.parse(fs.readFileSync(cacheFile, "utf-8"));
      return NextResponse.json({ data: cached, cached: true });
    }

    browser = await stealthChromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      locale: "en-IN",
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        Referer: "https://www.google.com/",
      },
    });
    const page = await context.newPage();

    await page.route("**/*", (route) => {
      const rt = route.request().resourceType();
      if (["image", "media", "font"].includes(rt)) return route.abort();
      route.continue();
    });

    // Sulekha uses plural slug: "plumber" → "plumbers", "electrician" → "electricians"
    const rawSlug = query.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const slug = rawSlug.endsWith("s") ? rawSlug : rawSlug + "s";
    const citySlug = city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Sulekha URL format: /{slug}/{citySlug}
    const url =
      citySlug === "india"
        ? `https://www.sulekha.com/${slug}/india`
        : `https://www.sulekha.com/${slug}/${citySlug}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(5000);

    try {
      await page.waitForSelector(
        ".sk-card, .spcard, .sp-profile, [class*='sp-card'], [class*='service-provider'], .vendor-card, [class*='vendor']",
        { timeout: 12000 }
      );
    } catch (_) {}

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 700));
      await page.waitForTimeout(800);
    }

    const results = await page.evaluate(() => {
      const data = [];

      // Strategy 1: Sulekha sk-card (current design)
      const selectors = [
        ".sk-card",
        ".spcard",
        ".sp-profile",
        "[class*='sp-card']",
        "[class*='service-provider']",
        ".vendor-card",
        "[class*='vendorCard']",
        "[class*='sp_list']",
        "article[class*='sp']",
      ];

      let cards = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) { cards = Array.from(found); break; }
      }

      cards.forEach((card) => {
        try {
          const name =
            card.querySelector("h2, h3, [class*='name'], [class*='title'], a[class*='sp']")
              ?.innerText?.trim() || "";
          if (!name || name.length < 2) return;

          const phone =
            card.querySelector("a[href^='tel']")?.innerText?.trim() ||
            card.querySelector("[class*='phone'], [class*='contact'], [class*='mobile']")
              ?.innerText?.trim() ||
            "N/A";

          const address =
            card.querySelector("[class*='address'], [class*='location'], [class*='area'], [class*='city']")
              ?.innerText?.trim() || "N/A";

          const category =
            card.querySelector("[class*='category'], [class*='tag'], [class*='service']")
              ?.innerText?.trim() || "N/A";

          const rating =
            card.querySelector("[class*='rating'], [class*='star'], [class*='review']")
              ?.innerText?.trim() || "N/A";

          const experience =
            card.querySelector("[class*='exp'], [class*='year'], [class*='since']")
              ?.innerText?.trim() || "N/A";

          data.push({ name, phone, address, category, rating, experience });
        } catch (_) {}
      });

      // Fallback: generic card elements
      if (data.length === 0) {
        document.querySelectorAll("div[class*='card'], li[class*='provider']").forEach((card) => {
          try {
            const name = card.querySelector("h2, h3, a")?.innerText?.trim() || "";
            if (!name || name.length < 2 || name.length > 120) return;
            data.push({
              name,
              phone: card.querySelector("a[href^='tel']")?.innerText?.trim() || "N/A",
              address: "N/A",
              category: "N/A",
              rating: "N/A",
              experience: "N/A",
            });
          } catch (_) {}
        });
      }

      return data;
    });

    await browser.close();
    browser = null;

    if (results.length > 0) {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2));
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Sulekha scraper error:", err);
    return NextResponse.json({ error: "Failed to scrape Sulekha" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
