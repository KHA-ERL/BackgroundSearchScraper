import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

/**
 * Extract WhatsApp numbers from a page using multiple strategies:
 * 1. wa.me/<number> links
 * 2. whatsapp://send?phone=<number>
 * 3. api.whatsapp.com/send?phone=<number>
 * 4. Text-based regex after "WhatsApp" keyword
 */
async function extractWhatsAppNumbers(page) {
  return await page.evaluate(() => {
    const numbersSet = new Set();

    // Strategy 1: wa.me/<number> links
    const waLinks = document.querySelectorAll('a[href*="wa.me/"]');
    waLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const match = href.match(/wa\.me\/(\+?[\d]{7,15})/);
      if (match) {
        const num = match[1].replace(/\D/g, "");
        if (num.length >= 7 && num.length <= 15) numbersSet.add("+" + num);
      }
    });

    // Strategy 2: whatsapp://send?phone=<number>
    const waUriLinks = document.querySelectorAll('a[href*="whatsapp://"]');
    waUriLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const match = href.match(/phone=(\+?[\d]{7,15})/);
      if (match) {
        const num = match[1].replace(/\D/g, "");
        if (num.length >= 7 && num.length <= 15) numbersSet.add("+" + num);
      }
    });

    // Strategy 3: api.whatsapp.com/send?phone=<number>
    const apiLinks = document.querySelectorAll('a[href*="api.whatsapp.com"]');
    apiLinks.forEach((link) => {
      const href = link.getAttribute("href") || "";
      const match = href.match(/phone=(\+?[\d]{7,15})/);
      if (match) {
        const num = match[1].replace(/\D/g, "");
        if (num.length >= 7 && num.length <= 15) numbersSet.add("+" + num);
      }
    });

    // Strategy 4: Search all href attributes for wa.me patterns (covers onclick, data-href, etc.)
    const allElements = document.querySelectorAll("[href], [data-href], [onclick]");
    allElements.forEach((el) => {
      const attrs = [
        el.getAttribute("href"),
        el.getAttribute("data-href"),
        el.getAttribute("onclick"),
        el.getAttribute("data-url"),
      ].filter(Boolean);
      attrs.forEach((attr) => {
        // wa.me pattern
        const waMatch = attr.match(/wa\.me\/(\+?[\d]{7,15})/g);
        if (waMatch) {
          waMatch.forEach((m) => {
            const numMatch = m.match(/wa\.me\/(\+?[\d]{7,15})/);
            if (numMatch) {
              const num = numMatch[1].replace(/\D/g, "");
              if (num.length >= 7 && num.length <= 15) numbersSet.add("+" + num);
            }
          });
        }
        // phone= pattern
        const phoneMatch = attr.match(/phone=(\+?[\d]{7,15})/g);
        if (phoneMatch) {
          phoneMatch.forEach((m) => {
            const numMatch = m.match(/phone=(\+?[\d]{7,15})/);
            if (numMatch) {
              const num = numMatch[1].replace(/\D/g, "");
              if (num.length >= 7 && num.length <= 15) numbersSet.add("+" + num);
            }
          });
        }
      });
    });

    // Strategy 5: Search page text near "WhatsApp" keyword for phone numbers
    const bodyText = document.body?.innerText || "";
    const waTextSections = bodyText.match(
      /whatsapp[^\n]{0,60}/gi
    );
    if (waTextSections) {
      waTextSections.forEach((section) => {
        // Match international phone formats near WhatsApp mentions
        const phoneMatches = section.match(
          /(\+?\d{1,3}[\s\-.]?\(?\d{1,4}\)?[\s\-.]?\d{1,4}[\s\-.]?\d{1,9})/g
        );
        if (phoneMatches) {
          phoneMatches.forEach((num) => {
            const cleaned = num.replace(/[\s\-.()\+]/g, "");
            if (cleaned.length >= 7 && cleaned.length <= 15) {
              numbersSet.add("+" + cleaned);
            }
          });
        }
      });
    }

    // Strategy 6: Check script tags for wa.me or phone data embedded in JS
    const scripts = document.querySelectorAll("script");
    scripts.forEach((script) => {
      const content = script.innerText || script.textContent || "";
      if (content.includes("wa.me") || content.includes("whatsapp")) {
        const waMatches = content.match(/wa\.me\/(\+?[\d]{7,15})/g);
        if (waMatches) {
          waMatches.forEach((m) => {
            const numMatch = m.match(/wa\.me\/(\+?[\d]{7,15})/);
            if (numMatch) {
              const num = numMatch[1].replace(/\D/g, "");
              if (num.length >= 7 && num.length <= 15) numbersSet.add("+" + num);
            }
          });
        }
      }
    });

    return Array.from(numbersSet);
  });
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { urls } = await request.json();
    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: "At least one URL is required" }, { status: 400 });
    }

    const validUrls = urls
      .map((u) => (u || "").trim())
      .filter((u) => u.startsWith("http://") || u.startsWith("https://"))
      .slice(0, 20);

    if (validUrls.length === 0) {
      return NextResponse.json(
        { error: "No valid URLs provided. URLs must start with http:// or https://" },
        { status: 400 }
      );
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
    });

    const results = [];

    for (const url of validUrls) {
      const page = await context.newPage();
      let numbers = [];
      try {
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(2500);

        // Scroll to trigger lazy-loaded content
        await page.evaluate(() => {
          window.scrollBy(0, 500);
        });
        await page.waitForTimeout(1000);

        numbers = await extractWhatsAppNumbers(page);
      } catch (pageErr) {
        console.error(`Failed to scrape ${url}:`, pageErr.message);
      } finally {
        await page.close().catch(() => {});
      }

      results.push({
        url,
        numbers,
        count: numbers.length,
      });
    }

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("WhatsApp number scraper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape WhatsApp numbers" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
