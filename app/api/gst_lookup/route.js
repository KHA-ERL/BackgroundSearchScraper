import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { query } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "GSTIN is required" }, { status: 400 });
    }

    const gstin = query.trim().toUpperCase();

    // Basic GSTIN format validation (15 chars alphanumeric)
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(gstin)) {
      return NextResponse.json(
        { error: "Invalid GSTIN format. It must be a 15-character alphanumeric code." },
        { status: 400 }
      );
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    const page = await context.newPage();

    const lookupUrl = `https://www.knowyourgst.com/gst-number-search/by-gstin/?gstin=${encodeURIComponent(
      gstin
    )}`;

    await page.goto(lookupUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    // Wait for result content
    try {
      await page.waitForSelector(".result-box, table, .gst-result, #result", { timeout: 8000 });
    } catch (_) {}

    const result = await page.evaluate((gstinVal) => {
      // Try to find structured result table
      const allRows = document.querySelectorAll("table tr");
      const data = {};
      allRows.forEach((tr) => {
        const tds = tr.querySelectorAll("td, th");
        if (tds.length >= 2) {
          const key = tds[0]?.innerText?.trim().toLowerCase().replace(/\s+/g, "_") || "";
          const value = tds[1]?.innerText?.trim() || "";
          if (key && value) data[key] = value;
        }
      });

      // Map common keys to our schema
      const legal_name =
        data["legal_name_of_business"] ||
        data["legal_name"] ||
        data["taxpayer_name"] ||
        document.querySelector("[class*='legal-name'], .legal_name")?.innerText?.trim() ||
        "";
      const trade_name =
        data["trade_name"] ||
        data["trade_name_of_business"] ||
        document.querySelector("[class*='trade-name'], .trade_name")?.innerText?.trim() ||
        "";
      const state =
        data["state"] ||
        data["state_jurisdiction"] ||
        document.querySelector("[class*='state']")?.innerText?.trim() ||
        "";
      const status =
        data["taxpayer_type"] ||
        data["status"] ||
        data["gstin_status"] ||
        document.querySelector("[class*='status']")?.innerText?.trim() ||
        "";
      const registration_type =
        data["constitution_of_business"] ||
        data["registration_type"] ||
        data["type"] ||
        "";
      const registration_date =
        data["date_of_registration"] ||
        data["registration_date"] ||
        data["date"] ||
        document.querySelector("[class*='date']")?.innerText?.trim() ||
        "";

      // Try result-box fallback
      const resultBox = document.querySelector(".result-box, #result, .gst-result");
      let boxText = resultBox ? resultBox.innerText : "";

      // Try to extract from plain text if structured failed
      const extractLine = (label) => {
        const regex = new RegExp(`${label}[:\\s]+([^\\n]+)`, "i");
        const match = boxText.match(regex);
        return match ? match[1].trim() : "";
      };

      return {
        gstin: gstinVal,
        legal_name: legal_name || extractLine("Legal Name") || extractLine("Taxpayer Name"),
        trade_name: trade_name || extractLine("Trade Name"),
        state: state || extractLine("State"),
        status: status || extractLine("Status") || extractLine("GSTIN Status"),
        registration_type: registration_type || extractLine("Constitution") || extractLine("Registration Type"),
        registration_date: registration_date || extractLine("Date of Registration"),
      };
    }, gstin);

    await browser.close();
    browser = null;

    // If we got meaningful data, return it
    const hasData = result.legal_name || result.trade_name || result.state;
    if (!hasData) {
      // Try alternate source
      browser = await chromium.launch({ headless: true });
      const ctx2 = await browser.newContext({
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      });
      const page2 = await ctx2.newPage();
      const altUrl = `https://gstincheck.co.in/?gstin=${encodeURIComponent(gstin)}`;
      await page2.goto(altUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
      await page2.waitForTimeout(3000);

      const altResult = await page2.evaluate((gstinVal) => {
        const allRows = document.querySelectorAll("table tr, .row, .data-row");
        const data = {};
        allRows.forEach((tr) => {
          const cells = tr.querySelectorAll("td, .label, .value");
          if (cells.length >= 2) {
            const key = cells[0]?.innerText?.trim().toLowerCase().replace(/\s+/g, "_") || "";
            const value = cells[1]?.innerText?.trim() || "";
            if (key && value) data[key] = value;
          }
        });

        return {
          gstin: gstinVal,
          legal_name:
            data["legal_name"] || data["legal_name_of_business"] || data["taxpayer_name"] || "",
          trade_name: data["trade_name"] || "",
          state: data["state"] || data["state_jurisdiction"] || "",
          status: data["status"] || data["gstin_status"] || "",
          registration_type: data["constitution_of_business"] || data["registration_type"] || "",
          registration_date: data["date_of_registration"] || data["registration_date"] || "",
        };
      }, gstin);

      await browser.close();
      browser = null;

      return NextResponse.json({ data: [altResult] });
    }

    return NextResponse.json({ data: [result] });
  } catch (err) {
    console.error("GST lookup error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to lookup GST details" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
