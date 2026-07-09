import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";
import fs from "fs";
import path from "path";

// Fallback: Google Maps scraping (known to work)
async function scrapeGoogleMaps(browser, query, city, limit) {
  const page = await browser.newPage();
  try {
    const searchTerm = encodeURIComponent(`${query} ${city || "India"}`);
    await page.goto(`https://www.google.com/maps/search/${searchTerm}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('div[role="feed"]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollTop += 1500;
      });
      await page.waitForTimeout(1200);
    }

    const cardLinks = await page.$$('div[role="feed"] a[href*="/maps/place/"]');
    const results = [];

    for (let i = 0; i < Math.min(cardLinks.length, limit); i++) {
      try {
        await cardLinks[i].click();
        await page.waitForTimeout(1800);
        const data = await page.evaluate(() => {
          const name =
            document
              .querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')
              ?.innerText?.trim() || "N/A";
          const phone =
            document
              .querySelector('button[data-item-id*="phone"] div.Io6YTe')
              ?.innerText?.trim() ||
            document
              .querySelector('[data-tooltip="Copy phone number"] .Io6YTe')
              ?.innerText?.trim() ||
            "N/A";
          const address =
            document
              .querySelector('button[data-item-id="address"] div.Io6YTe')
              ?.innerText?.trim() ||
            document
              .querySelector('[data-item-id*="address"] .Io6YTe')
              ?.innerText?.trim() ||
            "N/A";
          const rating =
            document.querySelector('div.F7nice span[aria-hidden="true"]')?.innerText?.trim() || "N/A";
          const category =
            document.querySelector("button.DkEaL")?.innerText?.trim() || "N/A";
          const website =
            document.querySelector('a[data-item-id="authority"]')?.href || "N/A";
          return { name, phone, address, rating, category, website };
        });
        if (data.name && data.name !== "N/A") results.push(data);
      } catch (_) {}
    }
    return results;
  } finally {
    await page.close().catch(() => {});
  }
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query, city = "India" } = await request.json();
    if (!query) return NextResponse.json({ error: "Query is required" }, { status: 400 });

    // Check cache
    const safeName = `${query}_${city}`.replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const cacheDir = path.resolve(process.cwd(), "..", "data", "justdial_data");
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

    // Try JustDial first
    let results = [];
    try {
      const searchUrl = `https://www.justdial.com/${encodeURIComponent(city)}/${encodeURIComponent(query)}`;
      await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
      await page.waitForTimeout(3500);

      for (let i = 0; i < 4; i++) {
        await page.evaluate(() => window.scrollBy(0, 800));
        await page.waitForTimeout(900);
      }

      results = await page.evaluate(() => {
        const data = [];
        // Try multiple selector strategies for JustDial 2024+
        const selectors = [
          'li[class*="cntanr"]',
          '[class*="rsList"]',
          '.resultbox_info',
          '[class*="resultcell"]',
          '[class*="store-details"]',
          'article[class*="comp"]',
        ];
        let cards = [];
        for (const sel of selectors) {
          const found = document.querySelectorAll(sel);
          if (found.length > 0) { cards = Array.from(found); break; }
        }

        cards.forEach((card) => {
          try {
            const name =
              card.querySelector('[class*="lng_cont_name"], [class*="store-name"], h2')?.innerText?.trim() ||
              card.querySelector("a[class*='business']")?.innerText?.trim() ||
              "";
            if (!name || name.length < 2) return;

            const phoneEl =
              card.querySelector('a[class*="contact-info"], p[class*="contact-info"], [class*="mobilesv"]');
            const phone =
              phoneEl?.dataset?.phone || phoneEl?.innerText?.trim() || "N/A";

            const address =
              card.querySelector('[class*="address-info"], [class*="cont_fl_addr"]')?.innerText?.trim() ||
              "N/A";
            const rating =
              card.querySelector('[class*="star_m"], [class*="rating"]')?.innerText?.trim() || "N/A";
            const category =
              card.querySelector('[class*="catname"], [class*="category"]')?.innerText?.trim() || "N/A";
            const website =
              card.querySelector('a[href*="http"]:not([href*="justdial"])')?.href || "N/A";

            data.push({ name, phone, address, rating, category, website });
          } catch (_) {}
        });
        return data;
      });
    } catch (jdErr) {
      console.log("JustDial blocked, falling back to Google Maps:", jdErr.message);
    }

    // Fallback to Google Maps if JustDial returned nothing
    if (results.length === 0) {
      results = await scrapeGoogleMaps(context, query, city, 20);
    }

    await browser.close();
    browser = null;

    if (results.length > 0) {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(results, null, 2));
    }

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Justdial scraper error:", err);
    return NextResponse.json({ error: "Failed to scrape" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
