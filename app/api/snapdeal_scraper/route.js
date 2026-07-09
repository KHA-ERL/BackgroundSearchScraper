import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query, maxResults = 20 } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const limit = Math.min(Number(maxResults) || 20, 50);

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
      if (["media", "font"].includes(rt)) return route.abort();
      const url = route.request().url();
      if (url.includes("doubleclick") || url.includes("googlesyndication")) return route.abort();
      route.continue();
    });

    const searchUrl = `https://www.snapdeal.com/search?keyword=${encodeURIComponent(
      query.trim()
    )}&sort=rlvncy`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    try {
      await page.waitForSelector(".product-tuple-listing, .col-xs-6, .product-tuple-description", {
        timeout: 12000,
      });
    } catch (_) {}

    const scrollCount = Math.ceil(limit / 8);
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(1000);
    }

    const results = await page.evaluate((limitVal) => {
      const items = [];

      const cards = document.querySelectorAll(
        ".product-tuple-listing, [class*='product-tuple-listing']"
      );

      cards.forEach((card) => {
        if (items.length >= limitVal) return;
        try {
          const name =
            card.querySelector(".product-title, [class*='product-title']")?.innerText?.trim() ||
            card.querySelector("p[class*='title']")?.innerText?.trim() ||
            "";
          if (!name) return;

          const brand =
            card
              .querySelector(".product-brand, [class*='product-brand'], .product-brand-name")
              ?.innerText?.trim() || "";

          const price =
            card
              .querySelector(".payBlkBig, [class*='payBlkBig'], .lfloat.product-price")
              ?.innerText?.trim() ||
            card
              .querySelector("[class*='sale-price'], .product-price")
              ?.innerText?.trim() ||
            "";

          const original_price =
            card
              .querySelector(".product-desc-price.strike, [class*='product-desc-price'], .strike")
              ?.innerText?.trim() || "";

          const discount =
            card.querySelector(".product-discount, [class*='product-discount']")?.innerText?.trim() ||
            "";

          let rating = "";
          const ratingEl = card.querySelector(".product-ratings, [class*='product-ratings']");
          if (ratingEl) {
            const filledStars = ratingEl.querySelector(".filled-stars, [class*='filled-stars']");
            if (filledStars) {
              const width = filledStars.style.width;
              if (width) {
                const pct = parseFloat(width);
                rating = (pct / 20).toFixed(1);
              }
            }
            if (!rating) rating = ratingEl.innerText?.trim()?.split("\n")[0] || "";
          }

          const linkEl = card.querySelector("a[href]");
          const url = linkEl
            ? linkEl.href.startsWith("http")
              ? linkEl.href
              : "https://www.snapdeal.com" + linkEl.getAttribute("href")
            : "";

          items.push({ name, brand, price, original_price, discount, rating, url });
        } catch (_) {}
      });

      // Fallback
      if (items.length === 0) {
        const altCards = document.querySelectorAll(".col-xs-6.col-sm-4.col-md-3");
        altCards.forEach((card) => {
          if (items.length >= limitVal) return;
          try {
            const name =
              card.querySelector("p[class*='title'], .product-title, h5")?.innerText?.trim() || "";
            if (!name) return;
            const price =
              card.querySelector("[class*='price'], .price")?.innerText?.trim() || "";
            const original_price =
              card.querySelector(".strike, [class*='strike']")?.innerText?.trim() || "";
            const discount =
              card.querySelector("[class*='discount']")?.innerText?.trim() || "";
            const url = card.querySelector("a[href]")?.href || "";
            items.push({ name, brand: "", price, original_price, discount, rating: "", url });
          } catch (_) {}
        });
      }

      return items.slice(0, limitVal);
    }, limit);

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results, total: results.length });
  } catch (err) {
    console.error("Snapdeal scraper error:", err);
    return NextResponse.json({ error: err.message || "Failed to scrape Snapdeal" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
