import { NextResponse } from "next/server";
import { generateConfirmationToken, checkRateLimit, inspectPayloadSecurity, validateRecipients } from "../../_whatsapp_security.js";

/**
 * Human Approval Token Generator for WhatsApp Bulk Sender.
 * Generates a signed single-use confirmation token for interactive UI workflow.
 */
export async function POST(request) {
  try {
    const clientIp = request.headers.get("x-forwarded-for") || "local_client";

    // Enforce rate limit on token creation requests (max 10 requests per 15 minutes)
    const rateCheck = checkRateLimit(`token_${clientIp}`, 10, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return NextResponse.json({ error: rateCheck.error }, { status: 429 });
    }

    const { phones, message, country_code = "91" } = await request.json();

    // 1. Inspect Payload Security
    const inspection = inspectPayloadSecurity(message);
    if (!inspection.safe) {
      return NextResponse.json({ error: inspection.error }, { status: 400 });
    }

    // 2. Validate Recipients
    const recValidation = validateRecipients(phones, country_code);
    if (!recValidation.valid) {
      return NextResponse.json({ error: recValidation.error }, { status: 400 });
    }

    // 3. Issue Confirmation Token
    const confirmationToken = generateConfirmationToken({
      phoneCount: phones.length,
      messageSnippet: message,
    });

    return NextResponse.json({
      success: true,
      confirmation_token: confirmationToken,
      expires_in_seconds: 300,
    });
  } catch (err) {
    console.error("Token generation error:", err);
    return NextResponse.json({ error: "Failed to generate approval token." }, { status: 500 });
  }
}
