import crypto from "crypto";

// Secret key dynamic resolver (checks process.env, global fallback, or auto-generated runtime secret)
function getSecretKey() {
  if (process.env.WA_SECURITY_SECRET) return process.env.WA_SECURITY_SECRET;
  if (!global.__WA_SECURITY_SECRET) {
    global.__WA_SECURITY_SECRET = crypto.randomBytes(32).toString("hex");
  }
  return global.__WA_SECURITY_SECRET;
}

// In-memory rate limiting store (IP / identifier -> timestamp array)
const rateLimitMap = new Map();

// Tokens cache (token -> expiration time) to enforce single-use tokens
const usedTokensSet = new Set();


/**
 * Clean up expired rate limits and tokens periodically
 */
function cleanupExpired() {
  const now = Date.now();
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < 15 * 60 * 1000);
    if (valid.length === 0) rateLimitMap.delete(key);
    else rateLimitMap.set(key, valid);
  }
}
setInterval(cleanupExpired, 5 * 60 * 1000).unref?.();

/**
 * Generate a signed human-approval confirmation token.
 * Token is valid for 5 minutes.
 */
export function generateConfirmationToken({ phoneCount, messageSnippet }) {
  const expiresAt = Date.now() + 5 * 60 * 1000; // 5 min TTL
  const nonce = crypto.randomBytes(16).toString("hex");
  const msgHash = crypto.createHash("sha256").update(messageSnippet || "").digest("hex").slice(0, 16);

  const payload = `${expiresAt}:${phoneCount}:${msgHash}:${nonce}`;
  const signature = crypto.createHmac("sha256", getSecretKey()).update(payload).digest("hex");

  return `${payload}.${signature}`;
}

/**
 * Verify a human-approval confirmation token.
 * Returns { valid: boolean, error?: string }
 */
export function verifyConfirmationToken(token, { phoneCount, messageSnippet }) {
  if (!token || typeof token !== "string") {
    return { valid: false, error: "Human approval confirmation token is missing." };
  }

  if (usedTokensSet.has(token)) {
    return { valid: false, error: "Confirmation token has already been used." };
  }

  const parts = token.split(".");
  if (parts.length !== 2) {
    return { valid: false, error: "Malformed confirmation token." };
  }

  const [payload, signature] = parts;
  const expectedSignature = crypto.createHmac("sha256", getSecretKey()).update(payload).digest("hex");

  const sigBuf = Buffer.from(signature, "hex");
  const expBuf = Buffer.from(expectedSignature, "hex");

  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return { valid: false, error: "Invalid confirmation token signature." };
  }



  const [expiresAtStr, countStr, msgHashStr] = payload.split(":");
  const expiresAt = Number(expiresAtStr);
  const tokenPhoneCount = Number(countStr);

  if (Date.now() > expiresAt) {
    return { valid: false, error: "Confirmation token has expired. Please re-confirm." };
  }

  if (phoneCount && tokenPhoneCount !== phoneCount) {
    return { valid: false, error: "Confirmation token parameter mismatch (phone count changed)." };
  }

  const currentMsgHash = crypto.createHash("sha256").update(messageSnippet || "").digest("hex").slice(0, 16);
  if (msgHashStr && currentMsgHash !== msgHashStr) {
    return { valid: false, error: "Confirmation token parameter mismatch (message content changed)." };
  }

  // Mark token as used
  usedTokensSet.add(token);
  setTimeout(() => usedTokensSet.delete(token), 10 * 60 * 1000).unref?.();

  return { valid: true };
}

/**
 * Check rate limits for WhatsApp sending actions.
 * Limits to maxRequests (default 3) per windowMs (default 15 min).
 */
export function checkRateLimit(identifier, maxRequests = 3, windowMs = 15 * 60 * 1000) {
  const now = Date.now();
  const timestamps = rateLimitMap.get(identifier) || [];
  const recent = timestamps.filter((t) => now - t < windowMs);

  if (recent.length >= maxRequests) {
    const oldest = recent[0];
    const retryAfterSec = Math.ceil((oldest + windowMs - now) / 1000);
    return {
      allowed: false,
      error: `Rate limit exceeded. Please wait ${retryAfterSec} seconds before sending another batch.`,
      retryAfterSec,
    };
  }

  recent.push(now);
  rateLimitMap.set(identifier, recent);
  return { allowed: true };
}

/**
 * Pre-flight security inspection for payload & message text.
 * Detects prompt injections, malicious macro tags, and suspicious links.
 */
export function inspectPayloadSecurity(message) {
  if (!message || typeof message !== "string") {
    return { safe: false, error: "Invalid message payload." };
  }

  // Suspicious patterns (Prompt injection tags, system overrides, script tags)
  const suspiciousPatterns = [
    /\[system\s*instruction\]/i,
    /\[system\s*prompt\]/i,
    /ignore\s+previous\s+instructions/i,
    /disregard\s+all\s+prior/i,
    /<script[\s>]/i,
    /javascript:/i,
    /data:text\/html/i,
    /execCommand/i,
  ];

  for (const pattern of suspiciousPatterns) {
    if (pattern.test(message)) {
      return {
        safe: false,
        error: "Security Violation: Message payload contains disallowed instructions or suspicious patterns.",
      };
    }
  }

  return { safe: true };
}

/**
 * Validate phone number format and country allowlist.
 */
export function validateRecipients(phones, countryCode = "91") {
  if (!Array.isArray(phones) || phones.length === 0) {
    return { valid: false, error: "Recipient phone array cannot be empty." };
  }

  if (phones.length > 50) {
    return { valid: false, error: "Maximum batch limit exceeded (max 50 phone numbers per request)." };
  }

  const cleanCountryCode = String(countryCode).replace(/\D/g, "") || "91";
  const sanitized = [];
  for (const raw of phones) {
    if (!raw) continue;
    // Strip everything except numeric digits
    let digitsOnly = String(raw).replace(/\D/g, "");

    // Strip leading zero if 11 digits starting with 0 (e.g. 09035924044)
    if (digitsOnly.length === 11 && digitsOnly.startsWith("0")) {
      digitsOnly = digitsOnly.slice(1);
    }

    if (digitsOnly.length < 7 || digitsOnly.length > 15) {
      return { valid: false, error: `Invalid phone number format: ${raw}` };
    }

    // Prepend country code if user provided local 10-digit number (e.g., 9035924044 -> 919035924044)
    const fullPhone = (digitsOnly.length <= 10 && !digitsOnly.startsWith(cleanCountryCode))
      ? `${cleanCountryCode}${digitsOnly}`
      : digitsOnly;

    sanitized.push(fullPhone);
  }




  // Optional environment allowlist check
  if (process.env.WA_ALLOWED_COUNTRY_CODES) {
    const allowedCCs = process.env.WA_ALLOWED_COUNTRY_CODES.split(",").map((c) => c.trim());
    const invalidCC = sanitized.find((p) => !allowedCCs.some((cc) => p.startsWith(cc)));
    if (invalidCC) {
      return {
        valid: false,
        error: `Phone number ${invalidCC} is outside permitted country code allowlist (${allowedCCs.join(", ")}).`,
      };
    }
  }

  return { valid: true, sanitized };
}
