import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query, city = "", maxResults = 20 } = await request.json();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const limit = Math.min(Number(maxResults) || 20, 50);
    const searchTerm = encodeURIComponent(query + (city ? " " + city : ""));

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await page.goto(`https://www.google.com/maps/search/${searchTerm}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    // Bypass Google Consent (EU/UK overlay)
    try {
      const consentButton = await page.$('form[action*="consent"] button, button[aria-label="Accept all"], button[aria-label="Reject all"]');
      if (consentButton) {
        await consentButton.click();
        await page.waitForTimeout(2000);
      }
    } catch (e) {}

    // Wait for results feed. We look for 'role="feed"' or 'a[href*="/maps/place/"]'
    await page.waitForSelector('div[role="feed"], a[href*="/maps/place/"]', { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(2000);

    // Scroll the feed to load more results
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollTop += 1500;
      });
      await page.waitForTimeout(1500);
    }

    // Get all result cards (feed links or directly mapped links if generic search bypassed feed)
    const cardLinks = await page.$$('div[role="feed"] a[href*="/maps/place/"], a[aria-label][href*="/maps/place/"]');
    const results = [];

    for (let i = 0; i < Math.min(cardLinks.length, limit); i++) {
      try {
        await cardLinks[i].click();
        await page.waitForTimeout(2000);

        const data = await page.evaluate(() => {
          const name = document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')?.innerText?.trim() || "N/A";
          const ratingEl = document.querySelector('div.F7nice span[aria-hidden="true"]');
          const rating = ratingEl?.innerText?.trim() || "N/A";
          const reviewEl = document.querySelector('div.F7nice span[aria-label*="review"]');
          const review_count = reviewEl?.innerText?.trim()?.replace(/[()]/g, "") || "0";
          const phone = document.querySelector('button[data-item-id*="phone"] div.Io6YTe')?.innerText?.trim() ||
            document.querySelector('[data-tooltip="Copy phone number"] .Io6YTe')?.innerText?.trim() || "N/A";
          const address = document.querySelector('button[data-item-id="address"] div.Io6YTe')?.innerText?.trim() ||
            document.querySelector('[data-item-id*="address"] .Io6YTe')?.innerText?.trim() || "N/A";
          const website = document.querySelector('a[data-item-id="authority"]')?.href ||
            document.querySelector('a[href*="http"][data-tooltip="Open website"]')?.href || "N/A";
          const category = document.querySelector('button.DkEaL')?.innerText?.trim() ||
            document.querySelector('[jsaction*="category"]')?.innerText?.trim() || "N/A";
          return { name, rating, review_count, phone, address, website, category };
        });

        if (data.name && data.name !== "N/A") {
          results.push(data);
        }
      } catch (_) {}
    }

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Google Maps scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
