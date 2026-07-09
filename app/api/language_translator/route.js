import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import https from "https";
import dns from "dns";

// Force IPv4 — translate.googleapis.com has an IPv6 address that is unreachable
// on many networks, causing Node.js to hang. IPv4 always works.
dns.setDefaultResultOrder("ipv4first");

const CHUNK_SIZE = 1000; // stay well under URL length limits

// Promisify https.get for use with await
function httpsGet(url) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Request timed out")), 12000);
    https.get(url, {
      family: 4,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
          "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      },
    }, (res) => {
      let raw = "";
      res.on("data", (c) => (raw += c));
      res.on("end", () => {
        clearTimeout(timer);
        try { resolve(JSON.parse(raw)); }
        catch { reject(new Error("Invalid JSON response")); }
      });
    }).on("error", (err) => { clearTimeout(timer); reject(err); });
  });
}

export const POST = requireLicense(async (request) => {
  try {
    const { text, from = "auto", to } = await request.json();

    if (!text || !text.trim()) {
      return NextResponse.json({ error: "text is required" }, { status: 400 });
    }
    if (!to) {
      return NextResponse.json({ error: "to language is required" }, { status: 400 });
    }

    const fromCode = from || "auto";
    const toCode = to;

    if (fromCode !== "auto" && fromCode === toCode) {
      return NextResponse.json({
        data: { translated: text, from: fromCode, to: toCode, original: text },
      });
    }

    const trimmedText = text.slice(0, 5000);
    const chunks = [];
    for (let i = 0; i < trimmedText.length; i += CHUNK_SIZE) {
      chunks.push(trimmedText.slice(i, i + CHUNK_SIZE));
    }

    const translatedChunks = [];
    let detectedLang = fromCode;

    for (const chunk of chunks) {
      const url =
        `https://translate.googleapis.com/translate_a/single` +
        `?client=gtx&sl=${encodeURIComponent(fromCode)}&tl=${encodeURIComponent(toCode)}&dt=t` +
        `&q=${encodeURIComponent(chunk)}`;

      try {
        const data = await httpsGet(url);

        // data[0] = [[translatedSegment, originalSegment, ...], ...]
        // data[2] = detected source language code
        const translated = (data[0] || [])
          .map((seg) => (seg && seg[0]) || "")
          .join("");

        translatedChunks.push(translated || chunk);

        if (fromCode === "auto" && data[2]) {
          detectedLang = data[2];
        }
      } catch (chunkErr) {
        console.error("Google Translate chunk error:", chunkErr.message);
        translatedChunks.push(chunk);
      }
    }

    const translated = translatedChunks.join("");

    return NextResponse.json({
      data: {
        translated,
        from: detectedLang,
        to: toCode,
        original: trimmedText,
        source: "google",
      },
    });
  } catch (err) {
    console.error("Language translator error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
});
