import { NextResponse } from "next/server";
import { requireLicense } from "../_license";
import { stealthChromium } from "../_stealth.js";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

async function scrapeGoogleMaps(context, query, location, maxResults) {
  // Open a fresh page so there's no state from any previous navigation
  const page = await context.newPage();
  try {
    const searchTerm = encodeURIComponent(location ? `${query} ${location}` : query);
    await page.goto(`https://www.google.com/maps/search/${searchTerm}`, {
      waitUntil: "domcontentloaded",
      timeout: 60000,
    });
    await page.waitForSelector('div[role="feed"]', { timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(2000);

    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const feed = document.querySelector('div[role="feed"]');
        if (feed) feed.scrollTop += 1500;
      });
      await page.waitForTimeout(1200);
    }

    const cardLinks = await page.$$('div[role="feed"] a[href*="/maps/place/"]');
    const results = [];

    for (let i = 0; i < Math.min(cardLinks.length, maxResults); i++) {
      try {
        await cardLinks[i].click();
        await page.waitForTimeout(1800);
        const data = await page.evaluate(() => {
          const name =
            document.querySelector('h1.DUwDvf, h1[class*="fontHeadlineLarge"]')?.innerText?.trim() ||
            "";
          if (!name) return null;
          const phone =
            document.querySelector('button[data-item-id*="phone"] div.Io6YTe')?.innerText?.trim() ||
            document.querySelector('[data-tooltip="Copy phone number"] .Io6YTe')?.innerText?.trim() ||
            "";
          const address =
            document.querySelector('button[data-item-id="address"] div.Io6YTe')?.innerText?.trim() ||
            document.querySelector('[data-item-id*="address"] .Io6YTe')?.innerText?.trim() ||
            "";
          const rating =
            document.querySelector('div.F7nice span[aria-hidden="true"]')?.innerText?.trim() || "";
          const category = document.querySelector("button.DkEaL")?.innerText?.trim() || "";
          const website = document.querySelector('a[data-item-id="authority"]')?.href || "";
          return { name, phone, address, website, rating, category, source: "google_maps" };
        });
        if (data) results.push(data);
      } catch (_) {}
    }
    return results;
  } finally {
    await page.close().catch(() => {});
  }
}

async function scrapeYellowPages(page, query, location, maxResults) {
  const url = `https://www.yellowpages.com/search?search_terms=${encodeURIComponent(
    query
  )}&geo_location_terms=${encodeURIComponent(location || "")}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);

  try {
    await page.waitForSelector(".search-results, .organic, .result", { timeout: 12000 });
  } catch (_) {}

  await page.waitForTimeout(1500);

  return page.evaluate((max) => {
    const results = [];
    const cards = document.querySelectorAll(".result, .organic .result, .srp-listing");

    for (const card of cards) {
      if (results.length >= max) break;
      try {
        const name =
          card.querySelector("h2.n a, .business-name a, h2 a")?.innerText?.trim() ||
          card.querySelector("h2, h3")?.innerText?.trim() ||
          "";
        if (!name) continue;

        const phone =
          card.querySelector(".phones.phone.primary, .phone, [class*='phone']")
            ?.innerText?.trim() || "";

        const addrParts = [];
        const street = card.querySelector(".street-address")?.innerText?.trim();
        const city = card.querySelector(".locality")?.innerText?.trim();
        const region = card.querySelector(".region")?.innerText?.trim();
        if (street) addrParts.push(street);
        if (city) addrParts.push(city);
        if (region) addrParts.push(region);
        const address =
          addrParts.join(", ") ||
          card.querySelector(".adr, .address")?.innerText?.trim() ||
          "";

        const website =
          card.querySelector(
            "a.track-visit-website[href], a[href*='http']:not([href*='yellowpages'])"
          )?.href || "";

        const category =
          card.querySelector(".categories a, .category a")?.innerText?.trim() || "";
        const rating =
          card.querySelector(".ratings .count, .result-rating, [class*='rating']")
            ?.innerText?.trim() || "";

        results.push({ name, phone, address, website, rating, category, source: "yellowpages" });
      } catch (_) {}
    }
    return results;
  }, maxResults);
}

async function scrapeYelp(page, query, location, maxResults) {
  const url = `https://www.yelp.com/search?find_desc=${encodeURIComponent(
    query
  )}&find_loc=${encodeURIComponent(location || "")}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);

  try {
    await page.waitForSelector(
      '[data-testid="serp-ia-card"], .businessName, li[class*="businessListItem"]',
      { timeout: 12000 }
    );
  } catch (_) {}

  await page.waitForTimeout(1500);

  return page.evaluate((max) => {
    const results = [];
    const cards = document.querySelectorAll(
      '[data-testid="serp-ia-card"], li[class*="businessListItem"], .businessListItem'
    );

    for (const card of cards) {
      if (results.length >= max) break;
      try {
        const nameEl =
          card.querySelector(".businessName a, h3 a, h4 a, [class*='businessName'] a") ||
          card.querySelector("h3, h4");
        const name = nameEl?.innerText?.trim() || "";
        if (!name) continue;

        const rating =
          card
            .querySelector("[aria-label*='star'], [class*='rating']")
            ?.getAttribute("aria-label")
            ?.match(/[\d.]+/)?.[0] ||
          card.querySelector("[class*='stars']")?.innerText?.trim() ||
          "";
        const category =
          card.querySelector("[class*='category'] a, [class*='priceRange']")?.innerText?.trim() ||
          "";
        const address =
          card.querySelector("address, [class*='secondaryAttributes'] p")?.innerText?.trim() || "";
        const phone =
          card.querySelector("[class*='phone'], p[class*='phone']")?.innerText?.trim() || "";
        const linkEl = card.querySelector("a[href*='/biz/']");
        const website = linkEl ? "https://www.yelp.com" + linkEl.getAttribute("href") : "";

        results.push({ name, phone, address, website, rating, category, source: "yelp" });
      } catch (_) {}
    }
    return results;
  }, maxResults);
}

async function scrapeFoursquare(page, query, location, maxResults) {
  const near = encodeURIComponent(location || "New York");
  const q = encodeURIComponent(query);
  const url = `https://foursquare.com/explore?near=${near}&q=${q}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(3000);

  try {
    await page.waitForSelector(
      '.venueCard, [class*="venueCard"], [class*="venue-card"], [data-testid="venue"]',
      { timeout: 12000 }
    );
  } catch (_) {}

  await page.waitForTimeout(1500);

  return page.evaluate((max) => {
    const results = [];
    const cards = document.querySelectorAll(
      '.venueCard, [class*="venueCard"], [class*="VenueCard"], [class*="venue-item"]'
    );

    for (const card of cards) {
      if (results.length >= max) break;
      try {
        const name =
          card.querySelector("h2, h3, [class*='venueName'], [class*='venue-name']")
            ?.innerText?.trim() || "";
        if (!name) continue;

        const category =
          card.querySelector("[class*='category'], [class*='venueCategory']")?.innerText?.trim() ||
          "";
        const address =
          card.querySelector("[class*='address'], address")?.innerText?.trim() || "";
        const rating =
          card.querySelector("[class*='rating'], [class*='score']")?.innerText?.trim() || "";
        const linkEl = card.querySelector("a[href]");
        const website = linkEl ? linkEl.href : "";

        results.push({ name, phone: "", address, website, rating, category, source: "foursquare" });
      } catch (_) {}
    }
    return results;
  }, maxResults);
}

async function scrapeHotfrog(page, query, location, maxResults) {
  const loc = encodeURIComponent(location || "usa");
  const q = encodeURIComponent(query);
  const url = `https://www.hotfrog.com/search/${loc}/${q}`;
  await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

  try {
    await page.waitForSelector(
      ".business-list, .search-result, [class*='businessCard'], article",
      { timeout: 12000 }
    );
  } catch (_) {}

  await page.waitForTimeout(2000);

  return page.evaluate((max) => {
    const results = [];
    const cards = document.querySelectorAll(
      ".business-list .listing, .search-result, [class*='businessCard'], article.business"
    );

    for (const card of cards) {
      if (results.length >= max) break;
      try {
        const name =
          card.querySelector("h2 a, h3 a, .business-name, [class*='businessName']")
            ?.innerText?.trim() || "";
        if (!name) continue;

        const phone =
          card.querySelector(".phone, [class*='phone'], [itemprop='telephone']")
            ?.innerText?.trim() || "";
        const address =
          card.querySelector("address, .address, [itemprop='address']")?.innerText?.trim() || "";
        const website =
          card.querySelector("a[href*='http']:not([href*='hotfrog'])")?.href || "";
        const category =
          card.querySelector(".category, [class*='category']")?.innerText?.trim() || "";

        results.push({ name, phone, address, website, rating: "", category, source: "hotfrog" });
      } catch (_) {}
    }
    return results;
  }, maxResults);
}

export const POST = requireLicense(async (request) => {
  let browser;
  try {
    const { directory = "yellowpages", query, location = "", maxResults = 20 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: "Business type or keyword is required" },
        { status: 400 }
      );
    }

    browser = await stealthChromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent: USER_AGENT,
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        Referer: "https://www.google.com/",
      },
    });
    const page = await context.newPage();

    // Block heavy resources
    await page.route("**/*", (route) => {
      const rt = route.request().resourceType();
      if (["image", "media", "font"].includes(rt)) return route.abort();
      route.continue();
    });

    let results = [];

    // Wrap directory scraping so DNS failures / blocks fall through to Google Maps
    try {
      switch (directory) {
        case "yellowpages":
          results = await scrapeYellowPages(page, query, location, maxResults);
          break;
        case "yelp":
          results = await scrapeYelp(page, query, location, maxResults);
          break;
        case "foursquare":
          results = await scrapeFoursquare(page, query, location, maxResults);
          break;
        case "hotfrog":
          results = await scrapeHotfrog(page, query, location, maxResults);
          break;
        default:
          results = await scrapeYellowPages(page, query, location, maxResults);
      }
    } catch (dirErr) {
      console.log(`Directory "${directory}" failed (${dirErr.message?.slice(0, 60)}), falling back to Google Maps`);
    }

    // Fallback to Google Maps when the selected directory returns nothing or errors
    if (results.length === 0) {
      results = await scrapeGoogleMaps(context, query, location, maxResults);
    }

    await browser.close();
    browser = null;

    return NextResponse.json({ data: results.slice(0, maxResults) });
  } catch (err) {
    console.error("Global directory scraper error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to scrape directory" },
      { status: 500 }
    );
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
});
