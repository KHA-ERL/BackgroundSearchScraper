import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { chromium } from "../_chromium.js";

async function scrapeChannel(page, url) {
  // Normalize to /videos tab for recent videos
  const channelUrl = url.replace(/\/?$/, "") + "/videos";
  await page.goto(channelUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
  try { await page.waitForSelector("ytd-channel-name, #channel-name, yt-formatted-string", { timeout: 10000 }); } catch {}
  await page.waitForTimeout(2000);

  // Scroll to load videos
  for (let i = 0; i < 3; i++) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(600);
  }

  return page.evaluate(() => {
    const name =
      document.querySelector("#channel-name yt-formatted-string, ytd-channel-name yt-formatted-string, #text.ytd-channel-name")?.innerText?.trim() ||
      document.querySelector("meta[name='title']")?.content ||
      document.title?.replace(" - YouTube", "") ||
      "N/A";

    const subscribers =
      document.querySelector("#subscriber-count, yt-formatted-string#subscriber-count")?.innerText?.trim() || "N/A";

    const video_count =
      document.querySelector(".yt-tab-shape-wiz__tab-title, #videos-count")?.innerText?.trim() || "N/A";

    const description =
      document.querySelector("#description-container, #description .yt-formatted-string, #snippet")?.innerText?.trim() || "N/A";

    const avatar =
      document.querySelector("#avatar img, #channel-header img, img#img")?.src || null;

    // Recent videos
    const videoEls = document.querySelectorAll("ytd-rich-item-renderer, ytd-grid-video-renderer");
    const recent_videos = [];
    videoEls.forEach((el) => {
      const titleEl = el.querySelector("#video-title, a#video-title");
      const title = titleEl?.innerText?.trim() || titleEl?.getAttribute("title") || "";
      const href = titleEl?.href || "";
      const url = href.includes("youtube.com") ? href : (href ? "https://www.youtube.com" + href : "");
      const views = el.querySelector("span.ytd-video-meta-block, #metadata-line span:first-child")?.innerText?.trim() || "";
      const date = el.querySelector("span.ytd-video-meta-block + span, #metadata-line span:last-child")?.innerText?.trim() || "";
      if (title && url) recent_videos.push({ title, url, views, date, type: "recent_video" });
    });

    return [{
      type: "channel",
      name,
      subscribers,
      video_count,
      description,
      avatar,
      recent_videos: recent_videos.slice(0, 9),
    }];
  });
}

async function scrapeVideo(page, url) {
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  try { await page.waitForSelector("h1.ytd-video-primary-info-renderer, #title h1, ytd-watch-metadata", { timeout: 10000 }); } catch {}
  await page.waitForTimeout(2000);

  return page.evaluate(() => {
    const title =
      document.querySelector("h1.ytd-video-primary-info-renderer yt-formatted-string, #title h1 yt-formatted-string, h1.ytd-watch-metadata yt-formatted-string")?.innerText?.trim() ||
      document.querySelector("meta[name='title']")?.content ||
      document.title?.replace(" - YouTube", "") ||
      "N/A";

    const views =
      document.querySelector(".view-count, ytd-video-view-count-renderer .view-count")?.innerText?.trim() ||
      document.querySelector("span.short-view-count")?.innerText?.trim() ||
      "N/A";

    const likes =
      document.querySelector("ytd-toggle-button-renderer:first-child yt-formatted-string#text")?.innerText?.trim() ||
      "N/A";

    const channel =
      document.querySelector("#channel-name .ytd-channel-name yt-formatted-string, ytd-video-owner-renderer #channel-name")?.innerText?.trim() ||
      document.querySelector("#owner-name a")?.innerText?.trim() ||
      "N/A";

    const upload_date =
      document.querySelector("#info-strings yt-formatted-string, ytd-video-primary-info-renderer .date")?.innerText?.trim() ||
      document.querySelector("meta[itemprop='uploadDate']")?.content ||
      "N/A";

    const description =
      document.querySelector("ytd-text-inline-expander #description-inline-expander, #meta #description")?.innerText?.trim() ||
      document.querySelector("meta[name='description']")?.content ||
      "N/A";

    return [{ type: "video", title, views, likes, channel, upload_date, description }];
  });
}

async function scrapeSearch(page, query) {
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  try { await page.waitForSelector("ytd-video-renderer, ytd-search", { timeout: 10000 }); } catch {}
  await page.waitForTimeout(2000);

  return page.evaluate(() => {
    const results = [];
    document.querySelectorAll("ytd-video-renderer").forEach((el) => {
      const titleEl = el.querySelector("#video-title");
      const title = titleEl?.innerText?.trim() || titleEl?.getAttribute("title") || "";
      const href = titleEl?.href || "";
      const videoUrl = href.startsWith("http") ? href : (href ? "https://www.youtube.com" + href : "");
      const channel = el.querySelector("#channel-name .yt-formatted-string, ytd-channel-name a")?.innerText?.trim() || "";
      const views = el.querySelector("#metadata-line span:first-child")?.innerText?.trim() || "";
      const duration = el.querySelector("ytd-thumbnail-overlay-time-status-renderer span, .ytd-thumbnail-overlay-time-status-renderer")?.innerText?.trim() || "";
      if (title && videoUrl) {
        results.push({ type: "search_result", title, url: videoUrl, channel, views, duration });
      }
    });
    return results;
  });
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { url, query } = await request.json();
    if (!url && !query) {
      return NextResponse.json({ error: "Provide a YouTube URL or search query" }, { status: 400 });
    }

    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 800 },
      locale: "en-US",
    });

    const page = await context.newPage();

    // Block ads and heavy resources
    await page.route("**/*", (route) => {
      const rt = route.request().resourceType();
      const reqUrl = route.request().url();
      if (rt === "media") return route.abort();
      if (reqUrl.includes("googlevideo.com") || reqUrl.includes("doubleclick.net")) return route.abort();
      route.continue();
    });

    let results = [];

    if (query && !url) {
      results = await scrapeSearch(page, query);
    } else if (url) {
      const cleanUrl = url.trim();
      const isVideo =
        cleanUrl.includes("/watch?") ||
        cleanUrl.includes("youtu.be/") ||
        cleanUrl.includes("/shorts/");
      const isChannel =
        cleanUrl.includes("/@") ||
        cleanUrl.includes("/channel/") ||
        cleanUrl.includes("/c/") ||
        cleanUrl.includes("/user/");

      if (isVideo) {
        results = await scrapeVideo(page, cleanUrl);
      } else if (isChannel) {
        results = await scrapeChannel(page, cleanUrl);
      } else {
        // Try as channel fallback
        results = await scrapeChannel(page, cleanUrl);
      }
    }

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results });
  } catch (err) {
    console.error("YouTube scraper error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
