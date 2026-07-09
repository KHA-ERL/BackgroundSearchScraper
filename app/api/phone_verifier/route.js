import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { parsePhoneNumberFromString, isValidPhoneNumber } from "libphonenumber-js";

export const POST = requireLicense(async (request) => {
  try {
    const { phones, country = "IN" } = await request.json();
    if (!phones || !Array.isArray(phones) || phones.length === 0)
      return NextResponse.json({ error: "phones array is required" }, { status: 400 });

    const results = phones.slice(0, 500).map((rawPhone) => {
      const phone = rawPhone.toString().trim();
      try {
        // Try with country code first, then without
        let parsed = parsePhoneNumberFromString(phone, country);
        if (!parsed) parsed = parsePhoneNumberFromString(`+${phone}`);

        if (!parsed) {
          return {
            input: phone,
            valid: false,
            formatted: phone,
            country_code: "N/A",
            national: phone,
            international: phone,
            type: "UNKNOWN",
            carrier: "N/A",
          };
        }

        return {
          input: phone,
          valid: parsed.isValid(),
          formatted: parsed.formatInternational(),
          country_code: parsed.country || "N/A",
          national: parsed.formatNational(),
          international: parsed.formatInternational(),
          type: parsed.getType() || "UNKNOWN",
          carrier: "N/A", // carrier lookup requires a paid API
        };
      } catch {
        return {
          input: phone,
          valid: false,
          formatted: phone,
          country_code: "N/A",
          national: phone,
          international: phone,
          type: "UNKNOWN",
          carrier: "N/A",
        };
      }
    });

    const valid = results.filter((r) => r.valid).length;
    const invalid = results.length - valid;

    return NextResponse.json({ data: results, summary: { total: results.length, valid, invalid } });
  } catch (err) {
    console.error("Phone verifier error:", err);
    return NextResponse.json({ error: "Failed to verify phones" }, { status: 500 });
  }
});
