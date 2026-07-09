import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

/**
 * Checks if a phone number has WhatsApp (and optionally WhatsApp Business).
 * Uses the wa.me link approach which redirects if the number exists.
 */
export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { phones } = await request.json();
    if (!phones || !Array.isArray(phones) || phones.length === 0)
      return NextResponse.json({ error: "phones array is required" }, { status: 400 });

    browser = await chromium.launch({ headless: true });
    const results = [];

    for (const rawPhone of phones.slice(0, 50)) {
      const phone = rawPhone.toString().replace(/[\s\-\(\)\+]/g, "");
      let page;
      try {
        page = await browser.newPage();
        const waUrl = `https://wa.me/${phone}`;
        const response = await page.goto(waUrl, { waitUntil: "domcontentloaded", timeout: 20000 });
        const finalUrl = page.url();
        const html = await page.content();

        // WhatsApp web shows a "send message" button if the number is valid
        const hasWhatsApp =
          finalUrl.includes("web.whatsapp.com") ||
          html.includes("open.whatsapp.com") ||
          html.includes("_next/static") === false && html.includes("whatsapp") ||
          response?.status() === 200 && (
            html.includes("wa-btn") ||
            html.includes("href=\"whatsapp://") ||
            html.toLowerCase().includes("send message")
          );

        // Business account detection (WhatsApp business badge/description)
        const isBusiness =
          html.toLowerCase().includes("business") &&
          html.toLowerCase().includes("whatsapp") &&
          hasWhatsApp;

        results.push({
          phone: rawPhone,
          has_whatsapp: hasWhatsApp,
          is_business: isBusiness,
          status: hasWhatsApp ? (isBusiness ? "WhatsApp Business" : "WhatsApp") : "Not Found",
        });
        await page.close();
      } catch (e) {
        if (page) await page.close().catch(() => {});
        results.push({ phone: rawPhone, has_whatsapp: false, is_business: false, status: "Error", error: e.message });
      }
    }

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("WhatsApp checker error:", err);
    return NextResponse.json({ error: "Failed to check WhatsApp" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
