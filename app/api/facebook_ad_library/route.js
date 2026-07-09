import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const {
      query,
      country = "IN",
      adType = "ALL",
      maxResults = 20,
    } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Search query is required" },
        { status: 400 }
      );
    }

    const url = `https://www.facebook.com/ads/library/?active_status=all&ad_type=${adType}&country=${country}&q=${encodeURIComponent(query)}&search_type=keyword_unordered`;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
    });

    const page = await context.newPage();

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

    // Wait for main content or login wall
    try {
      await page.waitForSelector(
        'div[data-testid="collection-search-results"], div[role="main"], [class*="xrvj5dj"]',
        { timeout: 15000 }
      );
    } catch (_) {
      // Proceed anyway
    }

    // Scroll to load more ads
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 900));
      await page.waitForTimeout(800);
    }

    const results = await page.evaluate((max) => {
      const ads = [];

      // Try multiple selectors to find ad cards
      const selectors = [
        '[data-testid="collection-search-results"] > div > div',
        'div[class*="x1dr75xp"] > div[class*="x78zum5"]',
        'div[role="main"] > div > div > div > div',
      ];

      let adCards = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 1) {
          adCards = Array.from(found);
          break;
        }
      }

      // Fallback: look for divs containing advertiser-like structure
      if (adCards.length === 0) {
        adCards = Array.from(document.querySelectorAll("div")).filter((el) => {
          const text = el.innerText || "";
          return (
            text.length > 50 &&
            text.length < 2000 &&
            el.children.length > 1 &&
            el.children.length < 20
          );
        });
      }

      for (const card of adCards) {
        if (ads.length >= max) break;

        try {
          const text = card.innerText || "";
          if (!text || text.length < 20) continue;

          // Advertiser name: look for strong/bold or heading-like elements
          let advertiser = "";
          const headings = card.querySelectorAll("h3, h4, strong, b, [class*='advertiser'], [class*='page-name']");
          for (const h of headings) {
            const t = h.innerText?.trim();
            if (t && t.length > 1 && t.length < 100) {
              advertiser = t;
              break;
            }
          }

          // Ad body text
          let adText = "";
          const paragraphs = card.querySelectorAll("p, [class*='ad-body'], [class*='message'], span");
          for (const p of paragraphs) {
            const t = p.innerText?.trim();
            if (t && t.length > 20 && t !== advertiser) {
              adText = t.substring(0, 200);
              break;
            }
          }

          if (!advertiser && !adText) continue;

          // Status
          const statusText = text.toLowerCase();
          const status =
            statusText.includes("active") ? "Active" : "Inactive";

          // Start date
          let startDate = "";
          const dateMatch = text.match(
            /started\s+(?:running\s+)?(?:on\s+)?([\w\s,]+\d{4})/i
          );
          if (dateMatch) startDate = dateMatch[1].trim();

          // Platforms
          let platforms = "";
          const platformMatch = text.match(/(?:runs?\s+on|platforms?)[:\s]+([\w,\s]+)/i);
          if (platformMatch) {
            platforms = platformMatch[1].trim().substring(0, 60);
          } else {
            const platKeywords = ["Facebook", "Instagram", "Messenger", "WhatsApp", "Audience Network"];
            platforms = platKeywords.filter((p) => text.includes(p)).join(", ");
          }

          // Spend / impressions
          let spend = "";
          const spendMatch = text.match(/(?:spent|spend)[:\s]*([<>≤≥\d,\s$€£₹]+)/i);
          if (spendMatch) spend = spendMatch[1].trim().substring(0, 30);

          let impressions = "";
          const impMatch = text.match(/impressions[:\s]*([<>≤≥\d,\s\w]+)/i);
          if (impMatch) impressions = impMatch[1].trim().substring(0, 40);

          // Link - look for anchor tags
          const linkEl = card.querySelector("a[href]");
          const adUrl = linkEl ? linkEl.href : "";

          if (advertiser || adText.length > 10) {
            ads.push({
              advertiser: advertiser || "Unknown Advertiser",
              ad_text: adText || text.substring(0, 200),
              status,
              start_date: startDate || "",
              platforms: platforms || "Facebook",
              spend: spend || "Not disclosed",
              impressions: impressions || "Not disclosed",
              url: adUrl || "",
            });
          }
        } catch (_) {}
      }

      return ads;
    }, maxResults);

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Facebook Ad Library scraper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape Facebook Ad Library" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
