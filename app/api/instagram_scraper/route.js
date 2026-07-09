import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";
import fs from "fs";
import path from "path";

const SESSION_FILE = path.resolve(process.cwd(), "..", "data", "sessions", "instagram.json");

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
    await page.goto("https://www.instagram.com/accounts/login/", {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });

    // Wait until the user successfully logs in (URL leaves the login/onetap/challenge pages)
    await page.waitForURL(
      (url) =>
        url.startsWith("https://www.instagram.com/") &&
        !url.includes("/accounts/login") &&
        !url.includes("/accounts/onetap") &&
        !url.includes("/challenge/"),
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

// Check if a loaded page is showing the login wall
function isLoginPage(url) {
  return (
    url.includes("/accounts/login") ||
    url.includes("/accounts/onetap") ||
    url.includes("/challenge/")
  );
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url, query } = await request.json();
    if (!url)
      return NextResponse.json({ error: "Instagram URL is required" }, { status: 400 });

    const cleanUrl = url.startsWith("http")
      ? url
      : `https://www.instagram.com/${url.replace("@", "")}/`;

    // Cache check
    const safeName = (query || url).replace(/[^a-zA-Z0-9]/g, "_").toLowerCase();
    const cacheDir = path.resolve(process.cwd(), "..", "data", "instagram_data");
    const cacheFile = path.join(cacheDir, `${safeName}.json`);
    if (fs.existsSync(cacheFile)) {
      return NextResponse.json(JSON.parse(fs.readFileSync(cacheFile, "utf-8")));
    }

    // ── Ensure we have a valid session ────────────────────────────────────
    if (!fs.existsSync(SESSION_FILE)) {
      // No session saved — open visible browser for user to log in
      try {
        await doLoginFlow();
      } catch (loginErr) {
        return NextResponse.json(
          { error: "Login timed out or was cancelled. Please try again and log in within 2 minutes." },
          { status: 401 }
        );
      }
    }

    // Load saved session
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

    await page.goto(cleanUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForTimeout(2000);

    // Detect if session expired (redirected to login page)
    const currentUrl = page.url();
    if (isLoginPage(currentUrl)) {
      await browser.close();
      browser = null;
      // Clear expired session and ask user to re-login
      fs.unlinkSync(SESSION_FILE);
      try {
        await doLoginFlow();
      } catch {
        return NextResponse.json(
          { error: "Session expired. Login timed out. Please try again." },
          { status: 401 }
        );
      }
      // Re-launch with fresh session
      const freshState = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      browser = await chromium.launch({ headless: true });
      const ctx2 = await browser.newContext({
        storageState: freshState,
        userAgent:
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
        viewport: { width: 1280, height: 800 },
      });
      const page2 = await ctx2.newPage();
      await page2.goto(cleanUrl, { waitUntil: "networkidle", timeout: 60000 });
      await page2.waitForTimeout(2000);
      // Replace page reference for evaluate below
      Object.assign(page, page2);
    }

    const data = await page.evaluate(() => {
      const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || "N/A";

      const profileImg =
        document.querySelector("img.xpdipgo") ||
        document.querySelector("img._aadp") ||
        document.querySelector("header img");
      const profile_image = profileImg?.src || "N/A";

      const profile_name =
        document.querySelector("h2")?.innerText?.trim() ||
        document.querySelector("header h2")?.innerText?.trim() ||
        "N/A";

      const full_name =
        document.querySelector("header span span")?.innerText?.trim() ||
        document.querySelector("._aacl._aaco._aacu._aacx._aad6._aade")?.innerText?.trim() ||
        "N/A";

      const bio =
        document.querySelector("header section > div:nth-child(3) span")?.innerText?.trim() ||
        "N/A";

      const statEls = document.querySelectorAll("header ul li");
      let posts = "N/A", followers = "N/A", following = "N/A";
      statEls.forEach((li, i) => {
        const val =
          li.querySelector("span[title], span span")?.innerText?.trim() ||
          li.querySelector("span")?.title ||
          li.innerText?.split("\n")[0] ||
          "N/A";
        if (i === 0) posts = val;
        if (i === 1) followers = val;
        if (i === 2) following = val;
      });

      const external_link =
        document.querySelector("header a[target='_blank']")?.href ||
        document.querySelector("header a[rel='me nofollow noopener noreferrer external']")?.href ||
        "N/A";

      const postEls = document.querySelectorAll("article img, div[role='button'] img");
      const recent_posts = Array.from(postEls).slice(0, 12).map((img) => ({
        thumbnail: img.src || "",
        alt: img.alt || "",
      }));

      return {
        social_type: "instagram",
        profile_name,
        full_name,
        bio,
        profile_image,
        posts,
        followers,
        following,
        external_link,
        recent_posts,
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
    console.error("Instagram scraper error:", err);
    return NextResponse.json({ error: "Failed to scrape Instagram" }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
