import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url, selector = "", attribute = "text" } = await request.json();
    if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) targetUrl = "https://" + targetUrl;

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    await page.setExtraHTTPHeaders({
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });

    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(1500);

    const results = await page.evaluate(({ sel, attr }) => {
      const data = [];

      if (sel) {
        // Use provided selector
        const els = document.querySelectorAll(sel);
        els.forEach((el, i) => {
          let value = "";
          if (attr === "href") value = el.href || el.getAttribute("href") || "";
          else if (attr === "src") value = el.src || el.getAttribute("src") || "";
          else value = el.innerText?.trim() || el.textContent?.trim() || "";

          data.push({
            index: i + 1,
            element: el.tagName.toLowerCase(),
            text: attr === "text" ? value : el.innerText?.trim() || "",
            url: attr === "href" ? value : (attr === "src" ? value : ""),
          });
        });
      } else {
        // No selector: extract all text blocks, links, and metadata
        let idx = 1;

        // Meta info
        const title = document.title;
        if (title) data.push({ index: idx++, element: "title", text: title, url: "" });

        const metaDesc = document.querySelector('meta[name="description"]')?.content;
        if (metaDesc) data.push({ index: idx++, element: "meta[description]", text: metaDesc, url: "" });

        // All headings
        document.querySelectorAll("h1,h2,h3,h4,h5,h6").forEach((h) => {
          const t = h.innerText?.trim();
          if (t) data.push({ index: idx++, element: h.tagName.toLowerCase(), text: t, url: "" });
        });

        // All links
        document.querySelectorAll("a[href]").forEach((a) => {
          const t = a.innerText?.trim();
          const href = a.href;
          if (href) data.push({ index: idx++, element: "a", text: t || "", url: href });
        });

        // Paragraphs
        document.querySelectorAll("p").forEach((p) => {
          const t = p.innerText?.trim();
          if (t && t.length > 20) data.push({ index: idx++, element: "p", text: t.slice(0, 300), url: "" });
        });
      }

      return data;
    }, { sel: selector, attr: attribute });

    await browser.close();
    browser = null;
    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("Website data scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
