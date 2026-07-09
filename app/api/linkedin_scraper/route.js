import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";
import fs from "fs";
import path from "path";

const SESSION_FILE = path.resolve(process.cwd(), "..", "data", "sessions", "linkedin.json");

// Launch a VISIBLE browser so the user can log in manually.
// Blocks until login is detected (up to 2 minutes), then saves the session.
async function doLoginFlow() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent:
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();

  try {
    await page.goto("https://www.linkedin.com/login", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait until the user successfully logs in (URL leaves login pages)
    await page.waitForURL(
      (url) =>
        (url.includes("linkedin.com/feed") ||
          url.includes("linkedin.com/mynetwork") ||
          url.includes("linkedin.com/in/") ||
          url.includes("linkedin.com/company/")) &&
        !url.includes("/login") &&
        !url.includes("/checkpoint/"),
      { timeout: 120000 }
    );

    // Let the page settle after redirect
    await page.waitForTimeout(2000);

    // Save session (cookies + localStorage)
    const storageState = await context.storageState();
    fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });
    fs.writeFileSync(SESSION_FILE, JSON.stringify(storageState));
    return true;
  } finally {
    await browser.close();
  }
}

function isLoginPage(url) {
  return url.includes("/login") || url.includes("/checkpoint/") || url.includes("/authwall");
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url, query } = await request.json();
    if (!url)
      return NextResponse.json({ error: "LinkedIn URL is required" }, { status: 400 });

    const cleanUrl = url.startsWith("http")
      ? url
      : `https://www.linkedin.com/company/${url}/`;

    // Cache check
    const safeName = (query || url).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const cacheDir = path.resolve(process.cwd(), "..", "data", "linkedin_data");
    const cacheFile = path.join(cacheDir, `${safeName}.json`);
    if (fs.existsSync(cacheFile)) {
      return NextResponse.json(JSON.parse(fs.readFileSync(cacheFile, "utf-8")));
    }

    // ── Ensure we have a valid session ────────────────────────────────────
    if (!fs.existsSync(SESSION_FILE)) {
      try {
        await doLoginFlow();
      } catch (loginErr) {
        return NextResponse.json(
          { error: "Login timed out or was cancelled. Please try again and log in within 2 minutes." },
          { status: 401 }
        );
      }
    }

    const storageState = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));

    // ── Scrape with saved session ─────────────────────────────────────────
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      storageState,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();

    await page.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(3000);

    // Detect session expiry (redirected to login/authwall)
    const currentUrl = page.url();
    if (isLoginPage(currentUrl)) {
      await browser.close();
      browser = null;
      fs.unlinkSync(SESSION_FILE);
      try {
        await doLoginFlow();
      } catch {
        return NextResponse.json(
          { error: "Session expired. Login timed out. Please try again." },
          { status: 401 }
        );
      }
      const freshState = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      browser = await chromium.launch({ headless: true });
      const ctx2 = await browser.newContext({
        storageState: freshState,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
      });
      const page2 = await ctx2.newPage();
      await page2.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page2.waitForTimeout(3000);
      Object.assign(page, page2);
    }

    // Scroll to load more content
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 600));
      await page.waitForTimeout(700);
    }

    const data = await page.evaluate(() => {
      const profile_name =
        document.querySelector("h1")?.innerText?.trim() ||
        document.querySelector(".top-card-layout__title")?.innerText?.trim() ||
        "N/A";

      const tagline =
        document.querySelector(".top-card-layout__first-subline")?.innerText?.trim() ||
        document.querySelector("h4")?.innerText?.trim() ||
        "N/A";

      const profile_image =
        document.querySelector("img.top-card-layout__entity-image")?.src ||
        document.querySelector("img[class*='entity-image']")?.src ||
        document.querySelector("header img")?.src ||
        "N/A";

      const followers =
        document.querySelector(".top-card-layout__third-subline")?.innerText?.trim() ||
        "N/A";

      const about =
        document.querySelector(".core-section-container__content p")?.innerText?.trim() ||
        document.querySelector("[data-test-id='about-us__description']")?.innerText?.trim() ||
        "N/A";

      const detailObj = {};
      const detailItems = document.querySelectorAll(
        ".core-section-container .description__text, .data-container__item"
      );
      detailItems.forEach((item) => {
        const label = item.querySelector("dt, span:first-child, h3")?.innerText?.trim();
        const value = item.querySelector("dd, span:last-child, p")?.innerText?.trim();
        if (label && value) detailObj[label.toLowerCase().replace(/\s+/g, "_")] = value;
      });

      const employees = [];
      document.querySelectorAll("section ul li").forEach((li) => {
        const name = li.querySelector("h3, h4, span[class*='name']")?.innerText?.trim();
        const role = li.querySelector("p, span[class*='subtitle']")?.innerText?.trim();
        const link = li.querySelector("a")?.href;
        if (name && name !== "N/A") {
          employees.push({ name, role: role || "N/A", profile_link: link || "N/A" });
        }
      });

      const posts = [];
      document.querySelectorAll("article, .feed-item, [data-urn*='activity']").forEach((post) => {
        const text = post.querySelector("p, span[dir='ltr']")?.innerText?.trim();
        const time = post.querySelector("time, span[class*='time']")?.innerText?.trim();
        const media = post.querySelector("img")?.src;
        if (text) posts.push({ text: text.slice(0, 300), time: time || "N/A", media: media || "N/A" });
      });

      const website =
        document.querySelector("a[data-tracking-control-name*='website']")?.href ||
        document.querySelector(".link-without-visited-state[target='_blank']")?.href ||
        "N/A";

      return {
        social_type: "linkedin",
        profile_name,
        tagline,
        profile_image,
        followers,
        about,
        website,
        details: detailObj,
        employees: employees.slice(0, 10),
        recent_posts: posts.slice(0, 5),
      };
    });

    data.url = cleanUrl;
    await browser.close();
    browser = null;

    if (data.profile_name !== "N/A") {
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, JSON.stringify(data, null, 2));
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error("LinkedIn scraper error:", err);
    return NextResponse.json({ error: "Failed to scrape LinkedIn" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
