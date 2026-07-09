import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url } = await request.json();

    if (!url || !url.includes("indiamart.com")) {
      return NextResponse.json(
        { error: "A valid Indiamart URL is required" },
        { status: 400 }
      );
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-IN",
    });

    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(3000);

    // Dismiss any popups
    try {
      const closeBtn = page.locator(
        'button[aria-label="Close"], .close, [class*="close-btn"], [id*="close"]'
      ).first();
      if (await closeBtn.isVisible({ timeout: 2000 })) {
        await closeBtn.click();
      }
    } catch (_) {}

    // Scroll to load content
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(700);
    }

    // Detect page type: product listing, seller profile, or search results
    const pageType = await page.evaluate(() => {
      if (document.querySelector('[class*="product-detail"], [class*="prodDetail"]'))
        return "product";
      if (document.querySelector('[class*="company-profile"], [class*="sellerProfile"]'))
        return "seller";
      return "other";
    });

    // Extract product name / category from the page
    const pageContext = await page.evaluate(() => {
      const product =
        document.querySelector("h1, [class*='prod-name'], [class*='product-title']")
          ?.innerText?.trim() || "";
      const category =
        document.querySelector('[class*="category"], [class*="breadcrumb"] li:last-child')
          ?.innerText?.trim() || "";
      return { product, category };
    });

    // Extract buyer enquiries / reviews
    const leads = await page.evaluate((ctx) => {
      const results = [];

      // Selectors for enquiry / review items on Indiamart
      const selectors = [
        '[class*="enquiry-item"]',
        '[class*="buyer-review"]',
        '[class*="review-item"]',
        '[class*="buyerEnquiry"]',
        '[class*="feedback-item"]',
        ".buyer-feedback li",
        '[class*="testimonial"]',
        "[itemprop='review']",
      ];

      let cards = [];
      for (const sel of selectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
          cards = Array.from(found);
          break;
        }
      }

      // Fallback: look for review-like containers
      if (cards.length === 0) {
        cards = Array.from(
          document.querySelectorAll("li, div[class]")
        ).filter((el) => {
          const text = el.innerText || "";
          return (
            text.length > 20 &&
            text.length < 800 &&
            (el.querySelector('[class*="buyer"]') ||
              el.querySelector('[class*="reviewer"]') ||
              el.querySelector('[class*="user"]') ||
              (text.toLowerCase().includes("buyer") &&
                el.children.length < 12))
          );
        });
      }

      for (const card of cards) {
        try {
          // Buyer name
          const nameEl =
            card.querySelector(
              '[class*="buyer-name"], [class*="buyerName"], [class*="reviewer-name"], strong, b'
            ) || card.querySelector("h4, h5");
          const buyer_name = nameEl?.innerText?.trim() || "";
          if (!buyer_name || buyer_name.length < 2) continue;

          // Company
          const companyEl =
            card.querySelector('[class*="company"], [class*="org"]') ||
            card.querySelector("span.company, .firm");
          const company = companyEl?.innerText?.trim() || "";

          // Phone
          const phoneEl =
            card.querySelector('[class*="phone"], a[href^="tel:"]');
          const phone =
            phoneEl?.getAttribute("href")?.replace("tel:", "") ||
            phoneEl?.innerText?.trim() ||
            card.innerText.match(/[\+]?[0-9\s\-\(\)]{10,14}/)?.[0]?.trim() ||
            "";

          // Email
          const emailEl = card.querySelector(
            'a[href^="mailto:"], [class*="email"]'
          );
          const email =
            emailEl?.getAttribute("href")?.replace("mailto:", "") ||
            emailEl?.innerText?.trim() ||
            card.innerText.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/)?.[0] ||
            "";

          // Product interest
          const productEl = card.querySelector(
            '[class*="product"], [class*="item-name"]'
          );
          const product =
            productEl?.innerText?.trim() || ctx.product || "";

          // Quantity
          const quantityEl = card.querySelector('[class*="qty"], [class*="quantity"]');
          const quantity = quantityEl?.innerText?.trim() ||
            card.innerText.match(/(?:qty|quantity)[:\s]+([0-9,\s\w]+)/i)?.[1]?.trim() || "";

          // Date
          const dateEl =
            card.querySelector('[class*="date"], time') ||
            card.querySelector("small, .time");
          const date =
            dateEl?.getAttribute("datetime") ||
            dateEl?.innerText?.trim() ||
            "";

          results.push({
            buyer_name,
            company,
            phone,
            email,
            product: product.substring(0, 100),
            quantity,
            date,
          });
        } catch (_) {}
      }

      return results;
    }, pageContext);

    await browser.close();
    browser = null;

    return NextResponse.json({ data: leads });
  } catch (err) {
    console.error("Indiamart enquiry scraper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape Indiamart enquiries" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
