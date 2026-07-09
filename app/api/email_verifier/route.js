import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import dns from "dns/promises";
import axios from "axios";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com","guerrillamail.com","tempmail.com","throwaway.email",
  "yopmail.com","sharklasers.com","guerrillamailblock.com","grr.la",
  "guerrillamail.info","spam4.me","trashmail.com","maildrop.cc",
  "dispostable.com","fakeinbox.com","spamgourmet.com","mailnull.com",
  "mailexpire.com","spamex.com","trashmail.me","discard.email",
]);

// ── Fallback: local syntax + MX + disposable check ─────────────────────────
async function checkMX(domain) {
  try {
    const records = await dns.resolveMx(domain);
    return records && records.length > 0;
  } catch {
    return false;
  }
}

async function verifyLocal(rawEmail) {
  const email = rawEmail.toString().trim().toLowerCase();
  const syntaxValid = EMAIL_REGEX.test(email);

  if (!syntaxValid) {
    return { input: email, valid: false, syntax: false, mx: false, disposable: false, reason: "Invalid syntax", source: "local" };
  }

  const domain = email.split("@")[1];
  const disposable = DISPOSABLE_DOMAINS.has(domain);
  const hasMX = await checkMX(domain);

  const valid = syntaxValid && hasMX && !disposable;
  let reason = "OK";
  if (!hasMX) reason = "No MX records (domain likely invalid)";
  else if (disposable) reason = "Disposable email domain";

  return { input: email, valid, syntax: true, mx: hasMX, disposable, domain, reason, source: "local" };
}

// ── ListClean API verification ──────────────────────────────────────────────
// API docs: GET https://api.listclean.xyz/verify/email/{email}
//           Header: X-Auth-Token: {api_key}
// Status values: "valid" | "catch-all" | "invalid" | "disposable" | "risky" | "dirty" | "unknown"
async function verifyWithListClean(emails, apiKey) {
  const LISTCLEAN_BASE = "https://api.listclean.xyz";

  if (emails.length === 1) {
    // Single email — use GET endpoint
    const email = emails[0].toString().trim().toLowerCase();
    try {
      const { data } = await axios.get(
        `${LISTCLEAN_BASE}/verify/email/${encodeURIComponent(email)}`,
        {
          headers: { "X-Auth-Token": apiKey },
          timeout: 15000,
        }
      );
      return [mapListCleanResult(email, data)];
    } catch (err) {
      console.error("ListClean single verify error:", err.message);
      // Fall back to local check for this email
      return [await verifyLocal(email)];
    }
  }

  // Batch — POST endpoint
  const batch = emails.map((e) => e.toString().trim().toLowerCase());
  try {
    const { data } = await axios.post(
      `${LISTCLEAN_BASE}/verify/email/batch`,
      { emails: batch },
      {
        headers: {
          "X-Auth-Token": apiKey,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );
    // data.data is an array of individual results
    const items = Array.isArray(data.data) ? data.data : [];
    return items.map((item) => mapListCleanResult(item.email || "", item));
  } catch (err) {
    console.error("ListClean batch verify error:", err.message);
    // Fall back to local checks for all
    return Promise.all(batch.map(verifyLocal));
  }
}

function mapListCleanResult(email, item) {
  // item may be the top-level response or the .data sub-object
  const d = item.data || item;
  const status = (d.status || "unknown").toLowerCase();
  const remarks = d.remarks || item.message || "";

  // "valid" and "catch-all" are acceptable; everything else is not
  const valid = status === "valid" || status === "catch-all";
  const disposable = status === "disposable";

  return {
    input: email || d.email || "",
    valid,
    syntax: true,
    mx: valid || status === "catch-all",
    disposable,
    domain: (email || d.email || "").split("@")[1] || "",
    reason: remarks || status,
    status,
    source: "listclean",
  };
}

// ── Main handler ────────────────────────────────────────────────────────────
export const POST = requireLicense(async (request) => {
  try {
    const { emails } = await request.json();
    if (!emails || !Array.isArray(emails) || emails.length === 0)
      return NextResponse.json({ error: "emails array is required" }, { status: 400 });

    const batch = emails.slice(0, 200);
    const apiKey = process.env.LISTCLEAN_API_KEY || "";
    let results;

    if (apiKey) {
      results = await verifyWithListClean(batch, apiKey);
    } else {
      results = await Promise.all(batch.map(verifyLocal));
    }

    const valid = results.filter((r) => r.valid).length;
    const invalid = results.length - valid;

    return NextResponse.json({
      data: results,
      summary: {
        total: results.length,
        valid,
        invalid,
        disposable: results.filter((r) => r.disposable).length,
      },
      provider: apiKey ? "listclean" : "local",
    });
  } catch (err) {
    console.error("Email verifier error:", err);
    return NextResponse.json({ error: "Failed to verify emails" }, { status: 500 });
  }
});
