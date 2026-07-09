import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { category, state, city, dataType, maxResults = 20 } = await request.json();
    const limit = Math.min(Number(maxResults) || 20, 50);
    const location = city || (state === "All India" ? "" : state);
    const results = [];

    browser = await chromium.launch({ headless: true });

    if (dataType === "Consumer Contacts" || dataType === "consumer_contacts") {
      // Use Google Maps — same approach as the working google_map_scraper
      const searchTerm = encodeURIComponent(`${category} in ${location || "India"}`);
      const page = await browser.newPage();
      await page.setExtraHTTPHeaders({
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      try {
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
        for (let i = 0; i < Math.min(cardLinks.length, limit); i++) {
          try {
            await cardLinks[i].click();
            await page.waitForTimeout(2000);
            const data = await page.evaluate(() => {
              const name = document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')?.innerText?.trim() || "";
              const phone = document.querySelector('button[data-item-id*="phone"] div.Io6YTe')?.innerText?.trim() ||
                document.querySelector('[data-tooltip="Copy phone number"] .Io6YTe')?.innerText?.trim() || "";
              const address = document.querySelector('button[data-item-id="address"] div.Io6YTe')?.innerText?.trim() || "";
              return { name, phone, address };
            });
            if (data.name) {
              results.push({ name: data.name, phone: data.phone, email: "", city: city || "", state, category, source: "Google Maps" });
            }
          } catch (_) {}
          if (results.length >= limit) break;
        }
      } catch (_) {}
      await page.close();

    } else if (dataType === "Product Reviews" || dataType === "product_reviews") {
      const searchQuery = encodeURIComponent(`${category} India`);
      const url = `https://www.amazon.in/s?k=${searchQuery}`;
      const page = await browser.newPage();
      await page.route("**/*.{png,jpg,jpeg,gif,webp,svg,mp4,woff,woff2,ttf,eot}", (r) => r.abort());
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1500);
        const firstProductHref = await page.$eval("h2.a-size-mini a.a-link-normal", (a) => a.href).catch(() => null);
        if (firstProductHref) {
          await page.goto(firstProductHref + "#customerReviews", { waitUntil: "domcontentloaded", timeout: 20000 });
          await page.waitForTimeout(1500);
          const reviews = await page.$$eval("[data-hook='review']", (els) =>
            els.slice(0, 30).map((el) => ({
              name: el.querySelector(".a-profile-name")?.textContent?.trim() || "Anonymous",
              rating: el.querySelector("[data-hook='review-star-rating'] span")?.textContent?.trim() || "",
              date: el.querySelector("[data-hook='review-date']")?.textContent?.trim() || "",
            }))
          ).catch(() => []);
          for (const rev of reviews) {
            results.push({ name: rev.name, phone: "", email: "", city: city || "", state, category, source: `Amazon — ${rev.rating} — ${rev.date}` });
            if (results.length >= limit) break;
          }
        }
      } catch (_) {}
      await page.close();

    } else {
      const hashtagQuery = category.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
      const url = `https://www.instagram.com/explore/tags/${hashtagQuery}/`;
      const page = await browser.newPage();
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(2000);
        const handles = await page.$$eval("a[href*='/p/']", (links) => [...new Set(links.map((l) => l.href))].slice(0, 10)).catch(() => []);
        for (const postUrl of handles) {
          results.push({ name: "Instagram Post", phone: "", email: "", city: city || "", state, category, source: postUrl });
          if (results.length >= limit) break;
        }
      } catch (_) {}
      await page.close();
    }

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("B2C data error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
