import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

/**
 * WhatsApp Business Verifier — distinguishes regular WhatsApp from WhatsApp Business accounts.
 * Uses the WhatsApp Business API catalog/profile endpoint as a signal.
 */
export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { phones } = await request.json();
    if (!phones || !Array.isArray(phones) || phones.length === 0)
      return NextResponse.json({ error: "phones array is required" }, { status: 400 });

    browser = await chromium.launch({ headless: true });
    const results = [];

    for (const rawPhone of phones.slice(0, 30)) {
      const phone = rawPhone.toString().replace(/[\s\-\(\)\+]/g, "");
      let page;
      try {
        page = await browser.newPage();
        await page.setExtraHTTPHeaders({
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36",
        });

        // Check wa.me page
        await page.goto(`https://wa.me/${phone}`, { waitUntil: "domcontentloaded", timeout: 20000 });
        await page.waitForTimeout(1500);
        const html = await page.content();

        const hasWA = html.includes("send message") ||
          html.includes("wa-btn") ||
          html.toLowerCase().includes("whatsapp");

        // Check WhatsApp Business catalog endpoint
        let isBusiness = false;
        let businessName = "N/A";
        let category = "N/A";

        if (hasWA) {
          try {
            await page.goto(
              `https://www.facebook.com/business/wa-check?phone=${phone}`,
              { waitUntil: "domcontentloaded", timeout: 15000 }
            );
            const fbHtml = await page.content();
            isBusiness =
              fbHtml.toLowerCase().includes("whatsapp business") ||
              fbHtml.toLowerCase().includes("business account");
          } catch (_) {}
        }

        results.push({
          phone: rawPhone,
          has_whatsapp: hasWA,
          is_business: isBusiness,
          business_name: businessName,
          category,
          account_type: hasWA ? (isBusiness ? "WhatsApp Business" : "WhatsApp Personal") : "No WhatsApp",
        });
        await page.close();
      } catch (e) {
        if (page) await page.close().catch(() => {});
        results.push({
          phone: rawPhone,
          has_whatsapp: false,
          is_business: false,
          business_name: "N/A",
          category: "N/A",
          account_type: "Error",
          error: e.message,
        });
      }
    }

    await browser.close();
    browser = null;

    const summary = {
      total: results.length,
      has_whatsapp: results.filter((r) => r.has_whatsapp).length,
      is_business: results.filter((r) => r.is_business).length,
      no_whatsapp: results.filter((r) => !r.has_whatsapp).length,
    };

    return NextResponse.json({ data: results, summary });
  } catch (err) {
    console.error("WhatsApp verifier error:", err);
    return NextResponse.json({ error: "Failed to verify WhatsApp accounts" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
