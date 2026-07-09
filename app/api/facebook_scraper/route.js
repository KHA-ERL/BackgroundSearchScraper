import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url } = await request.json();
    if (!url || !url.trim()) {
      return NextResponse.json({ error: "Facebook page URL is required" }, { status: 400 });
    }

    const cleanUrl = url.startsWith("http") ? url : `https://www.facebook.com/${url}`;

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const page = await context.newPage();

    // Block heavy resources
    await page.route("**/*", (route) => {
      const rt = route.request().resourceType();
      if (["media", "font"].includes(rt)) return route.abort();
      route.continue();
    });

    await page.goto(cleanUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(3000);

    // Check if redirected to login
    const currentUrl = page.url();
    const isLoginWall = currentUrl.includes("login") || currentUrl.includes("checkpoint");

    // Scroll to load some content
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 800));
      await page.waitForTimeout(700);
    }

    const data = await page.evaluate((isLoginWall) => {
      const getText = (sel) => document.querySelector(sel)?.innerText?.trim() || "N/A";

      // Page name - try multiple selectors
      const page_name =
        document.querySelector("h1")?.innerText?.trim() ||
        document.querySelector("h2")?.innerText?.trim() ||
        document.querySelector('[role="main"] h1')?.innerText?.trim() ||
        document.title?.replace(" | Facebook", "")?.trim() ||
        "N/A";

      // Category
      const category =
        document.querySelector('[role="main"] div[class] span:nth-child(2)')?.innerText?.trim() ||
        document.querySelector('.x1lliihq.x6ikm8r span')?.innerText?.trim() ||
        "N/A";

      // Followers / Likes
      let followers = "N/A";
      document.querySelectorAll("span, div").forEach((el) => {
        const text = el.innerText?.trim() || "";
        if (
          (text.includes("follower") || text.includes("like") || text.includes("Follower") || text.includes("Like")) &&
          text.length < 60 &&
          /[\d,KMk]+/.test(text)
        ) {
          if (followers === "N/A") followers = text;
        }
      });

      // About text
      const about =
        document.querySelector('[data-testid="page_intro_card"] span')?.innerText?.trim() ||
        document.querySelector('div[class*="intro"] span')?.innerText?.trim() ||
        "N/A";

      // Website
      let website = "N/A";
      document.querySelectorAll("a[href]").forEach((a) => {
        const href = a.href || "";
        if (
          href.includes("l.facebook.com/l.php") ||
          href.includes("l.instagram.com/l.php")
        ) {
          try {
            const u = new URL(href);
            const target = u.searchParams.get("u") || u.searchParams.get("next");
            if (target && !target.includes("facebook.com") && website === "N/A") {
              website = decodeURIComponent(target);
            }
          } catch {}
        }
      });

      // Recent posts
      const posts = [];
      const postEls = document.querySelectorAll(
        '[data-pagelet*="ProfileTimeline"] [role="article"], div[class*="userContent"], [data-testid="post_message"]'
      );
      postEls.forEach((el) => {
        const text = el.innerText?.trim();
        if (text && text.length > 10 && posts.length < 5) {
          posts.push({ text: text.slice(0, 300) });
        }
      });

      return {
        social_type: "facebook",
        page_name,
        category,
        followers,
        about,
        website,
        recent_posts: posts,
        login_wall: isLoginWall,
      };
    }, isLoginWall);

    data.url = cleanUrl;
    await browser.close();
    browser = null;

    return NextResponse.json({ data: [data] });
  } catch (err) {
    console.error("Facebook scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
