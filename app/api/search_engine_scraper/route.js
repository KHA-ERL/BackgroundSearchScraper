import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";
import axios from "axios";
import * as cheerio from "cheerio";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

// ── DuckDuckGo HTML via axios+cheerio (no browser needed) ─────────────────
// Used for engines: "google" and "duckduckgo"
async function scrapeDDGHtml(query, pageNum, engineLabel) {
  const params = { q: query };
  if (pageNum > 1) params.s = String((pageNum - 1) * 30);

  const resp = await axios.get("https://html.duckduckgo.com/html/", {
    params,
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
    },
    timeout: 20000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(resp.data);
  const results = [];

  $("a.result__a").each((_, el) => {
    const title = $(el).text().trim();
    let url = $(el).attr("href") || "";
    // DDG wraps links in a redirect URL — extract the real destination
    try {
      const parsed = new URL(url, "https://html.duckduckgo.com");
      url = parsed.searchParams.get("uddg") || url;
    } catch {}
    const description = $(el).closest(".result").find(".result__snippet").text().trim();
    if (title && url && url.startsWith("http")) {
      results.push({ title, url, description, engine: engineLabel, page: pageNum });
    }
  });

  return results;
}

// ── Yahoo HTML via axios+cheerio (no browser needed) ──────────────────────
async function scrapeYahooHtml(query, pageNum) {
  const resp = await axios.get("https://search.yahoo.com/search", {
    params: { p: query, b: String((pageNum - 1) * 10 + 1) },
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 20000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(resp.data);
  const results = [];

  // Primary selectors for Yahoo SERP
  $(".algo h3 a, .dd.algo h3 a, ol.reg li h3 a").each((_, el) => {
    const title = $(el).text().trim();
    let url = $(el).attr("href") || "";
    // Yahoo wraps URLs in RU= redirect params — extract real URL
    try {
      const parsed = new URL(url);
      const ru = parsed.searchParams.get("RU");
      if (ru) url = decodeURIComponent(ru);
    } catch {}
    const description = $(el)
      .closest(".algo, li")
      .find(".compText p, p.lh-16, .dd p, .compText")
      .first()
      .text()
      .trim();
    if (title && url && url.startsWith("http")) {
      results.push({ title, url, description, engine: "yahoo", page: pageNum });
    }
  });

  return results;
}

// ── Bing via Playwright ────────────────────────────────────────────────────
async function scrapeBing(page, query, pageNum) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${(pageNum - 1) * 10 + 1}`;
  await page.route("**/*", (route) => {
    if (["image", "media", "font"].includes(route.request().resourceType())) return route.abort();
    route.continue();
  });
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
  try { await page.waitForSelector("#b_results", { timeout: 8000 }); } catch {}

  return page.evaluate((pageNum) => {
    const results = [];
    document.querySelectorAll("li.b_algo").forEach((item) => {
      const titleEl = item.querySelector("h2 a");
      const descEl = item.querySelector("p.b_lineclamp2, p.b_paractl, p");
      const title = titleEl?.innerText?.trim();
      const url = titleEl?.href || "";
      const description = descEl?.innerText?.trim() || "";
      if (title && url && url.startsWith("http")) {
        results.push({ title, url, description, engine: "bing", page: pageNum });
      }
    });
    return results;
  }, pageNum);
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { engine = "google", query, pages = 1 } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Search query is required" }, { status: 400 });
    }
    const maxPages = Math.min(5, Math.max(1, Number(pages)));
    const results = [];

    if (engine === "google" || engine === "duckduckgo") {
      // axios+cheerio via DuckDuckGo HTML — no browser, not blocked
      for (let p = 1; p <= maxPages; p++) {
        try {
          results.push(...await scrapeDDGHtml(query, p, engine));
        } catch (err) {
          console.error(`DDG HTML page ${p}:`, err.message);
        }
      }
    } else if (engine === "yahoo") {
      // axios+cheerio via Yahoo HTML — no browser
      for (let p = 1; p <= maxPages; p++) {
        try {
          results.push(...await scrapeYahooHtml(query, p));
        } catch (err) {
          console.error(`Yahoo HTML page ${p}:`, err.message);
        }
      }
    } else {
      // bing → Playwright
      browser = await chromium.launch({ headless: true });
      const context = await browser.newContext({
        userAgent: BROWSER_UA,
        viewport: { width: 1280, height: 800 },
        locale: "en-US",
      });
      for (let p = 1; p <= maxPages; p++) {
        const page = await context.newPage();
        try {
          results.push(...await scrapeBing(page, query, p));
        } catch (err) {
          console.error(`Bing page ${p}:`, err.message);
        } finally {
          await page.close();
        }
      }
      await browser.close();
      browser = null;
    }

    return NextResponse.json({ data: results, engine, query, total: results.length });
  } catch (err) {
    console.error("Search engine scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
