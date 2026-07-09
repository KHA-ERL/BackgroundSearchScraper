import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url } = await request.json();

    if (!url || !url.includes("justdial.com")) {
      return NextResponse.json(
        { error: "A valid JustDial URL is required" },
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

    // Try to dismiss popups / cookie banners
    try {
      const closeBtn = page.locator(
        'button[aria-label="Close"], .close-btn, [class*="close"], [class*="popup"] button'
      ).first();
      if (await closeBtn.isVisible({ timeout: 2000 })) {
        await closeBtn.click();
      }
    } catch (_) {}

    // Scroll to load reviews/enquiries
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(700);
    }

    // Extract business category from the listing page
    const businessCategory = await page.evaluate(() => {
      const catEl =
        document.querySelector('[class*="catname"]') ||
        document.querySelector('[class*="category"]') ||
        document.querySelector(".jd_cat");
      return catEl?.innerText?.trim() || "";
    });

    // Extract reviews/enquiries
    const leads = await page.evaluate((category) => {
      const results = [];

      // Selectors for review cards on JustDial
      const reviewSelectors = [
        '[class*="rev_user"]',
        '[class*="reviewCard"]',
        '[class*="review-item"]',
        '[class*="userReview"]',
        ".rev_star",
        '[class*="raterev"]',
        "[itemprop='review']",
        ".review-listing li",
        '[class*="rev_lst"] li',
      ];

      let reviewCards = [];
      for (const sel of reviewSelectors) {
        const found = document.querySelectorAll(sel);
        if (found.length > 0) {
          reviewCards = Array.from(found);
          break;
        }
      }

      // Fallback: look for containers with user-name + review-text
      if (reviewCards.length === 0) {
        const allDivs = Array.from(document.querySelectorAll("li, div"));
        reviewCards = allDivs.filter((el) => {
          const text = el.innerText || "";
          return (
            text.length > 30 &&
            text.length < 1000 &&
            el.children.length >= 1 &&
            el.children.length < 15 &&
            (el.querySelector('[class*="username"]') ||
              el.querySelector('[class*="user_name"]') ||
              el.querySelector('[class*="reviewer"]') ||
              el.querySelector('[class*="revname"]'))
          );
        });
      }

      for (const card of reviewCards) {
        try {
          const nameEl =
            card.querySelector('[class*="username"]') ||
            card.querySelector('[class*="user_name"]') ||
            card.querySelector('[class*="revname"]') ||
            card.querySelector('[class*="reviewer"]') ||
            card.querySelector("strong, b");
          const name = nameEl?.innerText?.trim() || "";
          if (!name || name.length < 2) continue;

          // Phone - often masked on JustDial
          const phoneEl =
            card.querySelector('[class*="phone"]') ||
            card.querySelector('a[href^="tel:"]');
          let phone =
            phoneEl?.getAttribute("href")?.replace("tel:", "") ||
            phoneEl?.innerText?.trim() ||
            card.innerText.match(/[\+]?[0-9\s\-\(\)]{10,14}/)?.[0]?.trim() ||
            "";

          // Message / review text
          const messageEl =
            card.querySelector('[class*="rev_text"]') ||
            card.querySelector('[class*="reviewText"]') ||
            card.querySelector('[class*="review-text"]') ||
            card.querySelector("p");
          const message = messageEl?.innerText?.trim() || "";

          // Date
          const dateEl =
            card.querySelector('[class*="date"]') ||
            card.querySelector("time") ||
            card.querySelector('[class*="rev_date"]');
          const date =
            dateEl?.getAttribute("datetime") ||
            dateEl?.innerText?.trim() ||
            "";

          results.push({
            name,
            phone,
            message: message.substring(0, 300),
            date,
            category,
          });
        } catch (_) {}
      }

      return results;
    }, businessCategory);

    await browser.close();
    browser = null;

    return NextResponse.json({ data: leads });
  } catch (err) {
    console.error("JustDial enquiry scraper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape JustDial enquiries" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
