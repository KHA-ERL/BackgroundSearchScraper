import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";
import fs from "fs";
import path from "path";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query, pages = 2 } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    const safeName = `${query}_p${pages}`.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const cacheDir = path.resolve(process.cwd(), "..", "data", "indiamart_data");
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
      },
    });
    const page = await context.newPage();

    await page.route("**/*", (route) => {
      const rt = route.request().resourceType();
      if (["image", "media", "font"].includes(rt)) return route.abort();
      route.continue();
    });

    const allResults = [];

    for (let p = 1; p <= Math.min(pages, 5); p++) {
      const url = `https://dir.indiamart.com/search.mp?ss=${encodeURIComponent(query)}&page=${p}`;
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        await page.waitForTimeout(3000);

        try {
          await page.waitForSelector("div.bsrData, .LC1 .pc, .cardItem, [class*='card']", {
            timeout: 10000,
          });
        } catch (_) {}

        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => window.scrollBy(0, 700));
          await page.waitForTimeout(700);
        }

        const pageResults = await page.evaluate(() => {
          const items = [];

          // Strategy 1: bsrData (IndiaMART listing cards)
          const listings = document.querySelectorAll("div.bsrData, div[class*='b-srData']");
          listings.forEach((card) => {
            try {
              const name =
                card.querySelector("span.bname, a.bname, .bname")?.innerText?.trim() ||
                card.querySelector("h3, h2")?.innerText?.trim() ||
                "";
              if (!name || name.length < 2) return;

              const phone =
                card.querySelector("[class*='tel'], a[href^='tel']")?.innerText?.trim() || "N/A";
              const address =
                card.querySelector("[class*='loc'], [class*='address']")?.innerText?.trim() || "N/A";
              const product =
                card.querySelector("[class*='prod'], [class*='product']")?.innerText?.trim() || "N/A";
              const website =
                card.querySelector("a[href^='http']:not([href*='indiamart'])")?.href || "N/A";

              items.push({ name, phone, address, product, website, min_order: "N/A" });
            } catch (_) {}
          });

          // Strategy 2: LC1 cards (newer IndiaMART layout)
          if (items.length === 0) {
            document.querySelectorAll(".LC1, .prd-deatils, .cardItem, [class*='cardItem']").forEach((card) => {
              try {
                const name =
                  card.querySelector("a.prd-detail-comp-name, a[class*='comp-name'], h3, h2")
                    ?.innerText?.trim() || "";
                if (!name || name.length < 2) return;
                const phone =
                  card.querySelector("a[href^='tel'], [class*='tel']")?.innerText?.trim() || "N/A";
                const address =
                  card.querySelector("[class*='address'], [class*='city']")?.innerText?.trim() || "N/A";
                const product =
                  card.querySelector("[class*='item'], a[title]")?.innerText?.trim() || "N/A";
                const website =
                  card.querySelector("a[href^='http']:not([href*='indiamart'])")?.href || "N/A";
                items.push({ name, phone, address, product, website, min_order: "N/A" });
              } catch (_) {}
            });
          }

          // Strategy 3: Generic card fallback
          if (items.length === 0) {
            document.querySelectorAll("div[class*='card'], div[class*='list-item']").forEach((card) => {
              try {
                const name =
                  card.querySelector("a, h3, h2, h4")?.innerText?.trim() || "";
                if (!name || name.length < 3 || name.length > 100) return;
                const phone =
                  card.querySelector("a[href^='tel']")?.innerText?.trim() || "N/A";
                items.push({ name, phone, address: "N/A", product: "N/A", website: "N/A", min_order: "N/A" });
              } catch (_) {}
            });
          }

          return items;
        });

        allResults.push(...pageResults);
      } catch (pageErr) {
        console.error(`IndiaMART page ${p} error:`, pageErr.message);
      }

      if (p < Math.min(pages, 5)) {
        await page.waitForTimeout(1500 + Math.random() * 1000);
      }
    }

    await browser.close();
    browser = null;

    const unique = allResults.filter(
      (r, i, self) => i === self.findIndex((t) => t.name === r.name)
    );

    if (unique.length > 0) {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(unique, null, 2));
    }

    return NextResponse.json({ data: unique });
  } catch (err) {
    console.error("Indiamart scraper error:", err);
    return NextResponse.json({ error: "Failed to scrape Indiamart" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
