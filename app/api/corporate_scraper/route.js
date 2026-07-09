import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Company name is required" }, { status: 400 });
    }

    browser = await stealthChromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      locale: "en-IN",
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        Referer: "https://www.google.com/",
      },
    });
    const page = await context.newPage();

    const searchUrl = `https://www.zaubacorp.com/company-search/q-${encodeURIComponent(
      query.trim().replace(/ /g, "-")
    )}`;

    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    // Scroll to load more
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(800);
    }

    const results = await page.evaluate(() => {
      const rows = [];

      // Try table-based results first (zaubacorp uses a table)
      const tableRows = document.querySelectorAll("table tbody tr");
      if (tableRows && tableRows.length > 0) {
        tableRows.forEach((tr) => {
          try {
            const tds = tr.querySelectorAll("td");
            if (tds.length < 3) return;

            const companyLinkEl = tr.querySelector("a");
            const company_name = companyLinkEl?.innerText?.trim() || tds[0]?.innerText?.trim() || "";
            if (!company_name) return;

            const cin = tds[1]?.innerText?.trim() || "";
            const roc = tds[2]?.innerText?.trim() || "";
            const incorporation_date = tds[3]?.innerText?.trim() || "";
            const status = tds[4]?.innerText?.trim() || "";
            const state = tds[5]?.innerText?.trim() || "";
            const authorized_capital = tds[6]?.innerText?.trim() || "";
            const paidup_capital = tds[7]?.innerText?.trim() || "";

            rows.push({
              company_name,
              cin,
              roc,
              incorporation_date,
              status,
              state,
              authorized_capital,
              paidup_capital,
            });
          } catch (_) {}
        });
      }

      // Fallback: card-based layout
      if (rows.length === 0) {
        const cards = document.querySelectorAll(".company-item, .result-item, [class*='company']");
        cards.forEach((card) => {
          try {
            const company_name =
              card.querySelector("h3, h4, .company-name, a")?.innerText?.trim() || "";
            if (!company_name) return;
            const cin =
              card.querySelector("[class*='cin'], [data-cin]")?.innerText?.trim() || "";
            const status =
              card.querySelector("[class*='status']")?.innerText?.trim() || "";
            const state =
              card.querySelector("[class*='state']")?.innerText?.trim() || "";
            const incorporation_date =
              card.querySelector("[class*='date'], [class*='incorp']")?.innerText?.trim() || "";
            rows.push({
              company_name,
              cin,
              roc: "",
              incorporation_date,
              status,
              state,
              authorized_capital: "",
              paidup_capital: "",
            });
          } catch (_) {}
        });
      }

      return rows.slice(0, 20);
    });

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Corporate scraper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape corporate data" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
