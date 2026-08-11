import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";
import {
  verifyConfirmationToken,
  checkRateLimit,
  inspectPayloadSecurity,
  validateRecipients,
} from "../_whatsapp_security.js";

/**
 * Bulk WhatsApp Sender via WhatsApp Web.
 * Opens WhatsApp Web and sends a message to each phone number.
 * Requires human approval token, payload inspection, and rate limiting validation.
 */
export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const clientIp = request.headers.get("x-forwarded-for") || "local_client";
    const body = await request.json();
    const {
      phones,
      message,
      country_code = "91",
      delay_seconds = 5,
      confirmation_token,
    } = body;

    // 1. Enforce Rate Limiting (max 3 bulk send batches per 15 minutes)
    const rateCheck = checkRateLimit(`send_${clientIp}`, 3, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
    }

    // 2. Enforce Human Approval Confirmation Token Verification
    const tokenCheck = verifyConfirmationToken(confirmation_token, {
      phoneCount: Array.isArray(phones) ? phones.length : 0,
      messageSnippet: message,
    });
    if (!tokenCheck.valid) {
      return NextResponse.json(
        { error: `Human Approval Required: ${tokenCheck.error}` },
        { status: 403 }
      );
    }

    // 3. Pre-flight Security Inspection on Payload
    const inspection = inspectPayloadSecurity(message);
    if (!inspection.safe) {
      return NextResponse.json({ error: inspection.error }, { status: 400 });
    }

    // 4. Validate & Sanitize Recipients
    const recipientCheck = validateRecipients(phones, country_code);
    if (!recipientCheck.valid) {
      return NextResponse.json({ error: recipientCheck.error }, { status: 400 });
    }

    const delayMs = Math.max(2000, Math.min(30000, Number(delay_seconds) * 1000));
    const targetPhones = recipientCheck.sanitized;

    // Use persistent browser context in user data directory so WA Web login session is preserved
    const path = await import("path");
    const userDataDir = path.default.resolve(process.cwd(), ".whatsapp_session");

    const context = await chromium.launchPersistentContext(userDataDir, {
      headless: false, // Must be visible for WhatsApp Web session
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    // Reuse existing page or create one
    const mainPage = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    // Check if logged in. Go to web.whatsapp.com and wait if QR code is present
    await mainPage.goto("https://web.whatsapp.com", { waitUntil: "domcontentloaded", timeout: 60000 });
    
    // Check if QR code canvas / login screen is present
    const qrCanvas = await mainPage.$('canvas[aria-label="Scan this QR code to link a device"], div[data-ref]');
    if (qrCanvas) {
      console.log("WhatsApp Web not logged in. Waiting up to 60 seconds for QR code scan...");
      // Wait for chat list or search bar to appear after user scans QR code
      await mainPage.waitForSelector('div[contenteditable="true"][data-tab="3"], div[id="pane-side"]', {
        timeout: 60000,
      }).catch(() => {});
    }

    const results = [];
    const encodedMsg = encodeURIComponent(message.trim());

    for (let i = 0; i < targetPhones.length; i++) {
      const phone = targetPhones[i];
      try {
        const page = i === 0 ? mainPage : await context.newPage();
        const url = `https://web.whatsapp.com/send?phone=${phone}&text=${encodedMsg}`;
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

        // Wait up to 15s for Send button or QR code / pane-side
        const sendBtn = await page.waitForSelector('button[aria-label="Send"], span[data-icon="send"]', { timeout: 15000 }).catch(() => null);
        let sent = false;
        if (sendBtn) {
          await sendBtn.click();
          await page.waitForTimeout(2000);
          sent = true;
        }

        results.push({
          phone,
          sent,
          status: sent ? "Message sent" : "WhatsApp Web not logged in or number not found",
        });

        if (i > 0) {
          await page.close().catch(() => {});
        }

        // Configurable delay between messages to avoid rate limiting
        await new Promise((r) => setTimeout(r, delayMs));
      } catch (e) {
        results.push({ phone, sent: false, status: "Error", error: e.message });
      }
    }


    await context.close();

    const sent = results.filter((r) => r.sent).length;
    return NextResponse.json({
      data: results,
      summary: { total: results.length, sent, failed: results.length - sent },
    });
  } catch (err) {
    console.error("WhatsApp sender error:", err);
    return NextResponse.json({ error: "Failed to send WhatsApp messages" }, { status: 500 });
  }
});


