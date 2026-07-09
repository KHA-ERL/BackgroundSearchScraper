import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

/**
 * Bulk WhatsApp Sender via WhatsApp Web.
 * Opens WhatsApp Web and sends a message to each phone number.
 * Requires WhatsApp Web to be logged in (first use shows QR code).
 *
 * NOTE: This uses the wa.me URL trick (no login required for sending).
 * For full WhatsApp Web automation with login, use the /session endpoint.
 */
export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { phones, message, country_code = "91", delay_seconds = 5 } = await request.json();
    const delayMs = Math.max(2000, Math.min(30000, Number(delay_seconds) * 1000));
    if (!phones || !Array.isArray(phones) || phones.length === 0)
      return NextResponse.json({ error: "phones array is required" }, { status: 400 });
    if (!message || !message.trim())
      return NextResponse.json({ error: "message is required" }, { status: 400 });

    browser = await chromium.launch({
      headless: false, // Must be visible for WhatsApp Web session
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const results = [];
    const encodedMsg = encodeURIComponent(message.trim());

    for (const rawPhone of phones.slice(0, 50)) {
      const phone = rawPhone.toString().replace(/[\s\-\(\)\+]/g, "");
      const fullPhone = phone.startsWith("0") ? `${country_code}${phone.slice(1)}` : phone;
      let page;
      try {
        page = await browser.newPage();
        // Use WhatsApp API click-to-chat (opens WA app or web)
        const url = `https://web.whatsapp.com/send?phone=${fullPhone}&text=${encodedMsg}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
        await page.waitForTimeout(5000);

        // Check if send button exists (only if WA Web is logged in)
        const sendBtn = await page.$('button[aria-label="Send"], span[data-icon="send"]');
        let sent = false;
        if (sendBtn) {
          await sendBtn.click();
          await page.waitForTimeout(2000);
          sent = true;
        }

        results.push({
          phone: rawPhone,
          sent,
          status: sent ? "Message sent" : "WhatsApp Web not logged in or number not found",
        });
        await page.close();

        // Configurable delay between messages to avoid rate limiting
        await new Promise((r) => setTimeout(r, delayMs));
      } catch (e) {
        if (page) await page.close().catch(() => {});
        results.push({ phone: rawPhone, sent: false, status: "Error", error: e.message });
      }
    }

    await browser.close();
    browser = null;

    const sent = results.filter((r) => r.sent).length;
    return NextResponse.json({
      data: results,
      summary: { total: results.length, sent, failed: results.length - sent },
    });
  } catch (err) {
    console.error("WhatsApp sender error:", err);
    return NextResponse.json({ error: "Failed to send WhatsApp messages" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
