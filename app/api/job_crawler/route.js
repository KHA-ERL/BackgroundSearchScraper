import { NextResponse } from "next/server";
import crypto from "crypto";
import axios from "axios";
import * as cheerio from "cheerio";
import { isDatabaseConfigured, supabaseRequest } from "@/lib/server/supabaseRest";

export const runtime = "nodejs";
export const maxDuration = 60;

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const DIRECT_COMPANY_BOARDS = [
  { source: "Greenhouse", token: "airbnb", company: "Airbnb" },
  { source: "Greenhouse", token: "stripe", company: "Stripe" },
  { source: "Greenhouse", token: "figma", company: "Figma" },
  { source: "Greenhouse", token: "doordashusa", company: "DoorDash" },
  { source: "Greenhouse", token: "databricks", company: "Databricks" },
  { source: "Greenhouse", token: "discord", company: "Discord" },
  { source: "Greenhouse", token: "reddit", company: "Reddit" },
  { source: "Greenhouse", token: "scaleai", company: "Scale AI" },
  { source: "Greenhouse", token: "webflow", company: "Webflow" },
  { source: "Greenhouse", token: "gitlab", company: "GitLab" },
  { source: "Greenhouse", token: "roblox", company: "Roblox" },
  { source: "Greenhouse", token: "lyft", company: "Lyft" },
  { source: "Greenhouse", token: "coinbase", company: "Coinbase" },
  { source: "Greenhouse", token: "airtable", company: "Airtable" },
  { source: "Greenhouse", token: "chime", company: "Chime" },
  { source: "Greenhouse", token: "affirm", company: "Affirm" },
  { source: "Greenhouse", token: "robinhood", company: "Robinhood" },
  { source: "Greenhouse", token: "cloudflare", company: "Cloudflare" },
  { source: "Lever", token: "spotify", company: "Spotify" },
];

function normalizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function parseJobDate(value) {
  if (!value) return null;
  const date = typeof value === "number" ? new Date(value > 100000000000 ? value : value * 1000) : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function daysOld(value) {
  const date = parseJobDate(value);
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function inferWorkType(text = "") {
  const haystack = text.toLowerCase();
  if (/\b(remote|work from home|wfh|anywhere|distributed|global role)\b/.test(haystack)) return "remote";
  if (/\b(hybrid|part remote|office\/remote|remote\/office)\b/.test(haystack)) return "hybrid";
  if (/\b(on-site|onsite|in office|office-based|relocation)\b/.test(haystack)) return "physical";
  return "not specified";
}

function domainFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function boardUrl(board) {
  if (board.source === "Greenhouse") return `https://boards.greenhouse.io/${board.token}`;
  if (board.source === "Lever") return `https://jobs.lever.co/${board.token}`;
  if (board.source === "Ashby") return `https://jobs.ashbyhq.com/${board.token}`;
  if (board.source === "SmartRecruiters") return `https://jobs.smartrecruiters.com/${board.token}`;
  return "";
}

async function fetchJson(url) {
  const res = await axios.get(url, {
    headers: { "User-Agent": BROWSER_UA, Accept: "application/json,text/plain,*/*" },
    timeout: 18000,
    maxRedirects: 5,
  });
  return res.data;
}

async function fetchBoardJobs(board) {
  if (board.source === "Greenhouse") {
    const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${board.token}/jobs?content=true`);
    return (data.jobs || []).map((job) => ({
      title: job.title,
      company: data.meta?.company || board.company,
      location: job.location?.name || "",
      url: job.absolute_url,
      career_page: boardUrl(board),
      source: board.source,
      company_source: board.source,
      company_token: board.token,
      posted_at: job.updated_at || "",
      description: cheerio.load(job.content || "").text(),
    }));
  }

  if (board.source === "Lever") {
    const data = await fetchJson(`https://api.lever.co/v0/postings/${board.token}?mode=json`);
    return (Array.isArray(data) ? data : []).map((job) => ({
      title: job.text,
      company: board.company,
      location: job.categories?.location || "",
      work_type: inferWorkType(`${job.categories?.commitment || ""} ${job.categories?.location || ""}`),
      url: job.hostedUrl || job.applyUrl,
      career_page: boardUrl(board),
      source: board.source,
      company_source: board.source,
      company_token: board.token,
      posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : "",
      description: normalizeText(`${job.descriptionPlain || ""} ${(job.lists || []).map((list) => list.content || "").join(" ")}`),
    }));
  }

  return [];
}

function dedupeKey(job) {
  const cleanUrl = (job.url || "").split("?")[0].replace(/\/$/, "");
  return crypto.createHash("sha256").update(`${job.title}|${job.company}|${cleanUrl}`.toLowerCase()).digest("hex");
}

function normalizeJob(job) {
  const description = normalizeText(job.description || "");
  const postedAge = daysOld(job.posted_at);
  return {
    dedupe_key: dedupeKey(job),
    title: normalizeText(job.title || ""),
    company_name: normalizeText(job.company || ""),
    company_source: job.company_source || job.source || "",
    company_token: job.company_token || "",
    location: normalizeText(job.location || ""),
    work_type: job.work_type || inferWorkType(`${job.title || ""} ${job.location || ""} ${description}`),
    salary: "",
    experience: "",
    skills: "",
    posted_at: parseJobDate(job.posted_at)?.toISOString() || null,
    posted_age_days: postedAge,
    url: job.url || "",
    career_page: job.career_page || job.url || "",
    source: job.source || "Company career page",
    discovery_source: `${job.source || "Company"} scheduled crawl`,
    confidence: "high",
    is_active: postedAge !== null && postedAge >= 0 && postedAge <= 7,
    raw: { description },
  };
}

async function checkUrlAlive(url) {
  if (!url) return false;
  try {
    const res = await axios.head(url, { headers: { "User-Agent": BROWSER_UA }, timeout: 9000, maxRedirects: 5 });
    return res.status < 400;
  } catch {
    try {
      const res = await axios.get(url, { headers: { "User-Agent": BROWSER_UA }, timeout: 9000, maxRedirects: 5 });
      return res.status < 400;
    } catch {
      return false;
    }
  }
}

async function enrichCompany(board) {
  const url = boardUrl(board);
  let description = "";
  try {
    const res = await axios.get(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
      timeout: 12000,
      maxRedirects: 5,
    });
    const $ = cheerio.load(res.data);
    description = normalizeText($("meta[name='description']").attr("content") || $("title").text() || "");
  } catch {}

  return supabaseRequest("job_companies", {
    method: "POST",
    query: "?on_conflict=source,token",
    body: [{
      source: board.source,
      token: board.token,
      company_name: board.company,
      career_page: url,
      domain: domainFromUrl(url),
      description,
      active: true,
      last_checked_at: new Date().toISOString(),
    }],
    prefer: "resolution=merge-duplicates,return=representation",
  });
}

function tokens(value = "") {
  return value.toLowerCase().split(/[^a-z0-9+#.]+/).filter((token) => token.length > 2);
}

function matchesAlert(alert, job) {
  const text = `${job.title} ${job.company_name} ${job.location} ${job.raw?.description || ""}`.toLowerCase();
  const roleMatch = tokens(alert.query).some((token) => text.includes(token));
  const workMatch = !alert.work_type || alert.work_type === "all" || job.work_type === alert.work_type;
  const locationNeedle = String(alert.location || "").toLowerCase();
  const locationMatch = alert.location_mode !== "country" || !locationNeedle || text.includes(locationNeedle) || text.includes("worldwide") || text.includes("global");
  const freshMatch = job.posted_age_days !== null && job.posted_age_days <= Number(alert.max_age_days || 7);
  return roleMatch && workMatch && locationMatch && freshMatch;
}

async function matchSavedAlerts(savedJobs) {
  const alerts = await supabaseRequest("job_alerts", {
    query: "?enabled=eq.true&select=id,user_key,query,location_mode,location,work_type,max_age_days",
  });
  if (!alerts?.length || !savedJobs.length) return 0;

  const matches = [];
  for (const alert of alerts) {
    for (const job of savedJobs) {
      if (job.id && matchesAlert(alert, job)) {
        matches.push({ alert_id: alert.id, job_id: job.id });
      }
    }
  }
  if (!matches.length) return 0;

  await supabaseRequest("job_alert_matches", {
    method: "POST",
    query: "?on_conflict=alert_id,job_id",
    body: matches,
    prefer: "resolution=merge-duplicates,return=minimal",
  });
  return matches.length;
}

function isAuthorized(request) {
  const secret = process.env.JOB_CRAWLER_SECRET || process.env.CRON_SECRET || "";
  if (!secret) return process.env.NODE_ENV !== "production";
  const url = new URL(request.url);
  return request.headers.get("authorization") === `Bearer ${secret}` || url.searchParams.get("secret") === secret;
}

async function runCrawler(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized crawler request." }, { status: 401 });
  }
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};
  const maxAgeDays = Math.min(Math.max(Number(body.maxAgeDays) || 7, 1), 7);
  const boardLimit = Math.min(Math.max(Number(body.boardsLimit) || DIRECT_COMPANY_BOARDS.length, 1), DIRECT_COMPANY_BOARDS.length);
  const deadCheckLimit = Math.min(Math.max(Number(body.deadCheckLimit) || 160, 0), 360);
  const cutoff = encodeURIComponent(new Date(Date.now() - maxAgeDays * 86400000).toISOString());
  const errors = [];
  const run = await supabaseRequest("job_crawl_runs", {
    method: "POST",
    body: [{ status: "running" }],
  }).then((rows) => rows?.[0] || null);

  try {
    const boards = DIRECT_COMPANY_BOARDS.slice(0, boardLimit);
    const groups = await Promise.all(boards.map(async (board) => {
      try {
        await enrichCompany(board);
        return await fetchBoardJobs(board);
      } catch (error) {
        errors.push({ board: `${board.source}:${board.token}`, error: error.message });
        return [];
      }
    }));

    const candidates = groups.flat().map(normalizeJob).filter((job) => {
      return job.title && job.company_name && job.url && job.posted_age_days !== null && job.posted_age_days >= 0 && job.posted_age_days <= maxAgeDays;
    });

    const deduped = [];
    const seen = new Set();
    for (const job of candidates) {
      if (seen.has(job.dedupe_key)) continue;
      seen.add(job.dedupe_key);
      deduped.push(job);
    }

    const healthChecked = await Promise.all(deduped.map(async (job, index) => {
      const alive = index < deadCheckLimit ? await checkUrlAlive(job.url) : true;
      return {
        ...job,
        is_dead: !alive,
        is_active: job.is_active && alive,
        dead_checked_at: index < deadCheckLimit ? new Date().toISOString() : null,
        last_seen_at: new Date().toISOString(),
      };
    }));

    const savedJobs = healthChecked.length
      ? await supabaseRequest("job_listings", {
          method: "POST",
          query: "?on_conflict=dedupe_key",
          body: healthChecked,
          prefer: "resolution=merge-duplicates,return=representation",
        })
      : [];

    await supabaseRequest("job_listings", {
      method: "PATCH",
      query: `?is_active=eq.true&posted_at=lt.${cutoff}`,
      body: { is_active: false },
      prefer: "return=minimal",
    });

    const alertMatches = await matchSavedAlerts(savedJobs || []);
    const deadCount = healthChecked.filter((job) => job.is_dead).length;
    const payload = {
      status: errors.length ? "partial_success" : "success",
      finished_at: new Date().toISOString(),
      companies_scanned: boards.length,
      jobs_seen: candidates.length,
      jobs_saved: savedJobs?.length || 0,
      jobs_dead: deadCount,
      alert_matches: alertMatches,
      errors,
    };

    if (run?.id) {
      await supabaseRequest("job_crawl_runs", {
        method: "PATCH",
        query: `?id=eq.${encodeURIComponent(run.id)}`,
        body: payload,
        prefer: "return=minimal",
      });
    }

    return NextResponse.json({ data: payload });
  } catch (error) {
    if (run?.id) {
      await supabaseRequest("job_crawl_runs", {
        method: "PATCH",
        query: `?id=eq.${encodeURIComponent(run.id)}`,
        body: {
          status: "failed",
          finished_at: new Date().toISOString(),
          errors: [...errors, { error: error.message }],
        },
        prefer: "return=minimal",
      }).catch(() => {});
    }
    return NextResponse.json({ error: error.message || "Job crawl failed.", errors }, { status: 500 });
  }
}

export async function GET(request) {
  return runCrawler(request);
}

export async function POST(request) {
  return runCrawler(request);
}
