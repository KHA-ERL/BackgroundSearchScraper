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

    // --disable-http2 forces HTTP/1.1, preventing ERR_HTTP2_PROTOCOL_ERROR on Myntra
    browser = await stealthChromium.launch({
      headless: true,
      args: ["--disable-http2"],
    });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Linux; Android 11; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Mobile Safari/537.36",
      viewport: { width: 390, height: 844 },
      locale: "en-IN",
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });
    const page = await context.newPage();

    // Block media resources to speed up load
    await page.route("**/*", (route) => {
      const rt = route.request().resourceType();
      if (["media", "font"].includes(rt)) return route.abort();
      route.continue();
    });

    const slug = query.trim().toLowerCase().replace(/\s+/g, "-");
    // Try both URL formats
    const searchUrl = `https://www.myntra.com/${encodeURIComponent(slug)}`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(4000);

    // Scroll to load more products
    const scrollCount = Math.ceil(limit / 10);
    for (let i = 0; i < scrollCount; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await page.waitForTimeout(1200);
    }

    const results = await page.evaluate((limitVal) => {
      const items = [];

      // Primary desktop selectors
      const cards = document.querySelectorAll(".product-base, li.product-base, [class*='product-base']");

      cards.forEach((card) => {
        if (items.length >= limitVal) return;
        try {
          const name =
            card.querySelector(".product-product, [class*='product-product']")?.innerText?.trim() ||
            card.querySelector("h4, .product-productMetaInfo h4")?.innerText?.trim() ||
            "";
          const brand =
            card.querySelector(".product-brand, [class*='product-brand']")?.innerText?.trim() || "";
          const discounted_price =
            card
              .querySelector(".product-discountedPrice, [class*='discountedPrice']")
              ?.innerText?.trim() || "";
          const price =
            card.querySelector(".product-strike, [class*='strike']")?.innerText?.trim() ||
            discounted_price;
          const discount =
            card
              .querySelector(".product-discountPercentage, [class*='discountPercentage']")
              ?.innerText?.trim() || "";
          const ratingEl = card.querySelector(".product-ratingsContainer, [class*='ratingsContainer']");
          const rating = ratingEl ? ratingEl.querySelector("span")?.innerText?.trim() || "" : "";
          const reviews = ratingEl
            ? ratingEl.querySelectorAll("span")[1]?.innerText?.trim() || ""
            : "";
          const linkEl = card.querySelector("a[href]") || card.closest("a[href]");
          const url = linkEl
            ? linkEl.href.startsWith("http")
              ? linkEl.href
              : "https://www.myntra.com" + linkEl.getAttribute("href")
            : "";

          if (name || brand) {
            items.push({ name, brand, price, discounted_price, discount, rating, reviews, url });
          }
        } catch (_) {}
      });

      // Fallback for alternate layouts
      if (items.length === 0) {
        const altCards = document.querySelectorAll(
          ".search-searchProductsContainer > ul > li, .results-base > ul > li, li[class*='product']"
        );
        altCards.forEach((card) => {
          if (items.length >= limitVal) return;
          try {
            const name = card.querySelector("h3, h4, [class*='name']")?.innerText?.trim() || "";
            const brand = card.querySelector("[class*='brand']")?.innerText?.trim() || "";
            const price =
              card.querySelector("[class*='price'], [class*='Price']")?.innerText?.trim() || "";
            const url = card.querySelector("a[href]")?.href || "";
            if (name || brand) {
              items.push({
                name,
                brand,
                price,
                discounted_price: price,
                discount: "",
                rating: "",
                reviews: "",
                url,
              });
            }
          } catch (_) {}
        });
      }

      return items.slice(0, limitVal);
    }, limit);

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results, total: results.length });
  } catch (err) {
    console.error("Myntra scraper error:", err);
    return NextResponse.json({ error: err.message || "Failed to scrape Myntra" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
