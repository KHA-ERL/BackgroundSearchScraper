import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";

async function scrapeAmazon(page, query, maxResults) {
  const url = `https://www.amazon.in/s?k=${encodeURIComponent(query)}`;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);

  try {
    await page.waitForSelector('[data-component-type="s-search-result"]', { timeout: 15000 });
  } catch {}

  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
  }

  return page.evaluate((maxResults) => {
    const results = [];
    const cards = document.querySelectorAll('[data-component-type="s-search-result"]');
    cards.forEach((card) => {
      if (results.length >= maxResults) return;

      const nameEl = card.querySelector("h2 span.a-text-normal, h2 a span");
      const name = nameEl?.innerText?.trim() || "N/A";

      const urlEl = card.querySelector("h2 a.a-link-normal[href]");
      let productUrl = urlEl?.href || "N/A";
      if (productUrl !== "N/A" && !productUrl.startsWith("http")) {
        productUrl = "https://www.amazon.in" + productUrl;
      }

      const priceEl = card.querySelector(".a-price-whole");
      const priceFrac = card.querySelector(".a-price-fraction");
      let price = "N/A";
      if (priceEl) {
        price = "₹" + priceEl.innerText.replace(/,/g, "").trim();
        if (priceFrac) price += "." + priceFrac.innerText.trim();
      }

      const ratingEl =
        card.querySelector(".a-icon-star-small .a-icon-alt") ||
        card.querySelector(".a-icon-alt") ||
        card.querySelector("span[aria-label*='stars']");
      const rating =
        ratingEl?.innerText?.trim() || ratingEl?.getAttribute("aria-label") || "N/A";

      const reviewsEl = card.querySelector(
        ".a-size-small.s-underline-text, .a-size-base.s-underline-text"
      );
      const reviews = reviewsEl?.innerText?.trim() || "N/A";

      const imageEl = card.querySelector("img.s-image");
      const image = imageEl?.src || imageEl?.getAttribute("data-src") || "N/A";

      const sellerEl = card.querySelector(".a-size-small .a-color-secondary");
      const seller = sellerEl?.innerText?.trim() || "Amazon.in";

      if (name !== "N/A") {
        results.push({
          name,
          price,
          rating,
          reviews,
          seller,
          url: productUrl,
          image,
          platform: "amazon",
        });
      }
    });
    return results;
  }, maxResults);
}

async function scrapeFlipkart(page, query, maxResults) {
  const url = `https://www.flipkart.com/search?q=${encodeURIComponent(query)}`;

  await page.setExtraHTTPHeaders({
    "Accept-Language": "en-US,en;q=0.9",
    Accept:
      "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3500);

  // Close login popup if it appears
  try {
    const closeBtn = await page.$(
      'button._2KpZ6l._2doB4z, button[class*="close"], button._2KpZ6l'
    );
    if (closeBtn) await closeBtn.click();
  } catch {}

  try {
    await page.waitForSelector('div[data-id], ._1AtVbE, .DOjaWF, ._4ddWXP', { timeout: 12000 });
  } catch {}

  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollBy(0, 800));
    await page.waitForTimeout(500);
  }

  return page.evaluate((maxResults) => {
    const results = [];

    const selectors = ["div[data-id]", "._1AtVbE", ".DOjaWF", "._4ddWXP", "._2kHMtA"];
    let cards = [];
    for (const sel of selectors) {
      const found = document.querySelectorAll(sel);
      if (found.length > 2) {
        cards = Array.from(found);
        break;
      }
    }

    cards.forEach((card) => {
      if (results.length >= maxResults) return;

      const nameEl =
        card.querySelector(".KzDlHZ, ._4rR01T, .s1Q9rs, .IRpwTa, [class*='name'], a[title]") ||
        card.querySelector('a[class*="title"]');
      const name =
        nameEl?.innerText?.trim() || nameEl?.getAttribute("title") || "";
      if (!name || name.length < 3) return;

      const linkEl =
        card.querySelector('a[href*="/p/"], a[href*="flipkart.com"]') ||
        card.querySelector("a[href]");
      let productUrl = linkEl?.href || "N/A";
      if (productUrl !== "N/A" && !productUrl.startsWith("http")) {
        productUrl = "https://www.flipkart.com" + productUrl;
      }

      const priceEl =
        card.querySelector("._30jeq3, .Nx9bqj, [class*='price'] ._30jeq3") ||
        card.querySelector('[class*="Price"]');
      const price = priceEl?.innerText?.trim() || "N/A";

      const ratingEl =
        card.querySelector("._3LWZlK, .XQDdHH, div[class*='rating'] span") ||
        card.querySelector("[class*='rating']");
      const rating = ratingEl?.innerText?.trim() || "N/A";

      const reviewEl =
        card.querySelector("._2_R_DZ, span[class*='rating'] + span") ||
        card.querySelector("._13vcmD");
      const reviews = reviewEl?.innerText?.trim() || "N/A";

      const imgEl = card.querySelector(
        'img[src*="rukminim"], img[src*="flipkart"], img'
      );
      const image = imgEl?.src || "N/A";

      results.push({
        name,
        price,
        rating,
        reviews,
        seller: "Flipkart",
        url: productUrl,
        image,
        platform: "flipkart",
      });
    });

    return results;
  }, maxResults);
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { platform = "amazon", query, maxResults = 20 } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }

    const clampedMax = Math.min(50, Math.max(1, Number(maxResults)));

    browser = await stealthChromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-IN",
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
      },
    });

    const page = await context.newPage();

    // Block media but allow images (we extract img src)
    await page.route("**/*", (route) => {
      const rt = route.request().resourceType();
      if (["media", "font"].includes(rt)) return route.abort();
      const url = route.request().url();
      if (
        url.includes("doubleclick.net") ||
        url.includes("amazon-adsystem.com")
      )
        return route.abort();
      route.continue();
    });

    let results = [];
    if (platform === "amazon") {
      results = await scrapeAmazon(page, query, clampedMax);
    } else if (platform === "flipkart") {
      results = await scrapeFlipkart(page, query, clampedMax);
    } else {
      return NextResponse.json(
        { error: "Invalid platform. Use 'amazon' or 'flipkart'" },
        { status: 400 }
      );
    }

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results, platform, query, total: results.length });
  } catch (err) {
    console.error("eCommerce scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
