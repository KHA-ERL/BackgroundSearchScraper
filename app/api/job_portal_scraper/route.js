import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";

async function scrapeNaukri(page, query, location, pageNum) {
  const querySlug = query.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  const locationSlug = location
    ? location.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")
    : "";
  const baseUrl = locationSlug
    ? `https://www.naukri.com/${querySlug}-jobs-in-${locationSlug}`
    : `https://www.naukri.com/${querySlug}-jobs`;
  const url = pageNum > 1 ? `${baseUrl}-${pageNum}` : baseUrl;

  await page.route("**/*", (route) => {
    const rt = route.request().resourceType();
    if (["image", "media", "font"].includes(rt)) return route.abort();
    route.continue();
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3500);

  try {
    await page.waitForSelector(
      ".srp-jobtuple-wrapper, article.jobTuple, [class*='jobTuple-wrapper'], .job-list-container",
      { timeout: 12000 }
    );
  } catch (_) {}

  return await page.evaluate(() => {
    const jobs = [];
    const cards = document.querySelectorAll(
      ".srp-jobtuple-wrapper, article.jobTuple, [class*='jobTuple-wrapper'], [class*='job-tuple']"
    );
    cards.forEach((card) => {
      try {
        const title =
          card.querySelector(".title, a.title, [class*='job-title'], .jobTitle")?.innerText?.trim() ||
          card.querySelector("a[title]")?.getAttribute("title")?.trim() ||
          "";
        const company =
          card
            .querySelector(".comp-name, .companyInfo a, [class*='comp-name'], .company-name")
            ?.innerText?.trim() || "";
        const loc =
          card
            .querySelector(".locWdth, .loc-wrap, [class*='loc'], .job-location")
            ?.innerText?.trim() || "";
        const experience =
          card.querySelector(".exp-wrap, [class*='exp'], .experience")?.innerText?.trim() || "";
        const salary =
          card.querySelector(".sal-wrap, [class*='sal'], .salary")?.innerText?.trim() || "";
        const skills = Array.from(
          card.querySelectorAll(".tags-gt li, [class*='skill-tag'], [class*='tag'] li")
        )
          .map((el) => el.innerText.trim())
          .filter(Boolean)
          .join(", ");
        const posted =
          card
            .querySelector(".job-post-day, [class*='date'], [class*='posted']")
            ?.innerText?.trim() || "";
        const linkEl = card.querySelector("a.title, a[href*='naukri.com/'], a[href]");
        const jobUrl = linkEl?.href || "";
        if (title) {
          jobs.push({ title, company, location: loc, salary, experience, skills, posted, url: jobUrl });
        }
      } catch (_) {}
    });
    return jobs;
  });
}

async function scrapeIndeed(page, query, location, pageNum) {
  const start = (pageNum - 1) * 15;
  const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(
    location || ""
  )}&start=${start}`;

  await page.route("**/*", (route) => {
    const rt = route.request().resourceType();
    if (["image", "media", "font"].includes(rt)) return route.abort();
    route.continue();
  });

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);

  try {
    await page.waitForSelector("#mosaic-provider-jobcards, .jobsearch-ResultsList", { timeout: 10000 });
  } catch (_) {}

  return await page.evaluate(() => {
    const jobs = [];
    const cards = document.querySelectorAll(
      ".job_seen_beacon, .tapItem, [class*='job_seen'], li[class*='css']"
    );
    cards.forEach((card) => {
      try {
        const titleEl = card.querySelector(".jobTitle a, h2.jobTitle a, [id^='job-'] a");
        const title =
          titleEl?.innerText?.trim() || card.querySelector(".jobTitle")?.innerText?.trim() || "";
        const company =
          card
            .querySelector(".companyName, [class*='company-name'], .css-1h7lukg")
            ?.innerText?.trim() || "";
        const loc =
          card.querySelector(".companyLocation, [class*='location']")?.innerText?.trim() || "";
        const salary =
          card
            .querySelector(
              ".salary-snippet-container, .metadataContainer .salary-snippet, [class*='salary']"
            )
            ?.innerText?.trim() || "";
        const posted = card.querySelector(".date, span[class*='date']")?.innerText?.trim() || "";
        const href = titleEl?.getAttribute("href") || "";
        const jobUrl = href ? (href.startsWith("http") ? href : `https://www.indeed.com${href}`) : "";
        if (title) {
          jobs.push({
            title,
            company,
            location: loc,
            salary,
            experience: "",
            skills: "",
            posted,
            url: jobUrl,
          });
        }
      } catch (_) {}
    });
    return jobs;
  });
}

async function scrapeLinkedIn(page, query, location, pageNum) {
  const start = (pageNum - 1) * 25;
  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(
    query
  )}&location=${encodeURIComponent(location || "")}&start=${start}`;

  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(4000);

  try {
    await page.waitForSelector(
      ".jobs-search__results-list, .base-card, ul.jobs-search__results-list",
      { timeout: 10000 }
    );
  } catch (_) {}

  await page.evaluate(() => window.scrollBy(0, 800));
  await page.waitForTimeout(1500);

  return await page.evaluate(() => {
    const jobs = [];
    const cards = document.querySelectorAll(
      "li.jobs-search-results__list-item, .base-card, li[class*='result']"
    );
    cards.forEach((card) => {
      try {
        const title =
          card
            .querySelector(
              ".base-search-card__title, h3.base-search-card__title, [class*='job-title']"
            )
            ?.innerText?.trim() || "";
        const company =
          card
            .querySelector(
              ".base-search-card__subtitle, h4.base-search-card__subtitle, [class*='company']"
            )
            ?.innerText?.trim() || "";
        const loc =
          card
            .querySelector(".job-search-card__location, [class*='location']")
            ?.innerText?.trim() || "";
        const posted =
          card
            .querySelector("time, .job-search-card__listdate, [class*='date']")
            ?.innerText?.trim() ||
          card.querySelector("time")?.getAttribute("datetime") ||
          "";
        const linkEl = card.querySelector(
          "a.base-card__full-link, a[href*='/jobs/view/'], a[href*='linkedin.com/jobs']"
        );
        const jobUrl = linkEl?.href || "";
        if (title) {
          jobs.push({
            title,
            company,
            location: loc,
            salary: "",
            experience: "",
            skills: "",
            posted,
            url: jobUrl,
          });
        }
      } catch (_) {}
    });
    return jobs;
  });
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { portal = "naukri", query, location = "", pages = 1 } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Job title / keywords are required" }, { status: 400 });
    }

    const pageCount = Math.min(Math.max(Number(pages) || 1, 1), 3);

    browser = await stealthChromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
      viewport: { width: 1366, height: 768 },
      locale: "en-IN",
      extraHTTPHeaders: {
        "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
    });
    const page = await context.newPage();

    const allResults = [];

    for (let p = 1; p <= pageCount; p++) {
      try {
        let pageResults = [];
        if (portal === "naukri") {
          pageResults = await scrapeNaukri(page, query.trim(), location.trim(), p);
        } else if (portal === "indeed") {
          pageResults = await scrapeIndeed(page, query.trim(), location.trim(), p);
        } else if (portal === "linkedin") {
          pageResults = await scrapeLinkedIn(page, query.trim(), location.trim(), p);
        }
        allResults.push(...pageResults);
      } catch (pageErr) {
        console.error(`Error on page ${p}:`, pageErr.message);
      }
    }

    await browser.close();
    browser = null;

    const seen = new Set();
    const unique = allResults.filter((job) => {
      const key = `${job.title}|${job.company}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    return NextResponse.json({ data: unique });
  } catch (err) {
    console.error("Job portal scraper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape job portal" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
