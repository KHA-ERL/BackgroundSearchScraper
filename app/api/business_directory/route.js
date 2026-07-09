import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query, location = "" } = await request.json();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const searchTerm = encodeURIComponent(location ? `${query} ${location}` : query);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await page.goto(`https://www.google.com/maps/search/${searchTerm}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });

    await page.waitForSelector('div[role="feed"]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollTop += 1500;
      });
      await page.waitForTimeout(1500);
    }

    const cardLinks = await page.$$('div[role="feed"] a[href*="/maps/place/"]');
    const results = [];

    for (let i = 0; i < Math.min(cardLinks.length, 30); i++) {
      try {
        await cardLinks[i].click();
        await page.waitForTimeout(2000);

        const data = await page.evaluate(() => {
          const name =
            document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')?.innerText?.trim() ||
            "N/A";
          const phone =
            document.querySelector('button[data-item-id*="phone"] div.Io6YTe')?.innerText?.trim() ||
            document.querySelector('[data-tooltip="Copy phone number"] .Io6YTe')?.innerText?.trim() ||
            "N/A";
          const address =
            document.querySelector('button[data-item-id="address"] div.Io6YTe')?.innerText?.trim() ||
            document.querySelector('[data-item-id*="address"] .Io6YTe')?.innerText?.trim() ||
            "N/A";
          const rating =
            document.querySelector('div.F7nice span[aria-hidden="true"]')?.innerText?.trim() || "N/A";
          const category =
            document.querySelector("button.DkEaL")?.innerText?.trim() || "N/A";
          const website =
            document.querySelector('a[data-item-id="authority"]')?.href ||
            document.querySelector('a[href*="http"][data-tooltip="Open website"]')?.href ||
            "N/A";
          return { name, phone, email: "N/A", website, address, category, rating };
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
    console.error("Business directory scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
