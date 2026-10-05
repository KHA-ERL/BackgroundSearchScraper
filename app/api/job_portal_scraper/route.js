import { NextResponse } from "next/server";
import { stealthChromium } from "../_stealth.js";
import { isDatabaseConfigured, supabaseRequest } from "@/lib/server/supabaseRest";
import { rateLimit } from "@/lib/server/security";
import axios from "axios";
import * as cheerio from "cheerio";

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36";

const SEARCH_SOURCES = [
  { id: "seo", label: "Open web / SEO" },
  { id: "greenhouse", label: "Greenhouse" },
  { id: "lever", label: "Lever" },
  { id: "ashby", label: "Ashby" },
  { id: "smartrecruiters", label: "SmartRecruiters" },
  { id: "workable", label: "Workable" },
  { id: "recruitee", label: "Recruitee" },
  { id: "bamboohr", label: "BambooHR" },
  { id: "teamtailor", label: "Teamtailor" },
  { id: "pinpoint", label: "Pinpoint" },
  { id: "crunchbase", label: "Crunchbase discovery" },
  { id: "jobbank", label: "Job Bank Canada" },
  { id: "underdog", label: "Underdog.io" },
  { id: "a16z", label: "a16z Jobs" },
];

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

const BIG_TECH_COMPANIES = new Set(DIRECT_COMPANY_BOARDS.map((board) => board.company.toLowerCase()));

const PER_PAGE = 24;
const MAX_RESULT_PAGES = 15;
const SIMILAR_PER_PAGE = 12;

const BLOCKED_JOB_HOSTS = [
  "linkedin.com",
  "indeed.com",
  "remoteok.com",
  "remotive.com",
  "arbeitnow.com",
];

const TRUSTED_DIRECT_SOURCES = new Set([
  "Greenhouse",
  "Lever",
  "Ashby",
  "SmartRecruiters",
  "Workable",
  "Recruitee",
  "BambooHR",
  "Teamtailor",
  "Pinpoint",
  "Job Bank Canada",
  "Underdog.io",
  "a16z Jobs",
  "Company JSON-LD",
  "Company career page",
]);

const SCAM_PATTERNS = [
  /\btelegram\b/i,
  /\bwhatsapp only\b/i,
  /\bpay.*fee\b/i,
  /\bregistration fee\b/i,
  /\btraining fee\b/i,
  /\beasy money\b/i,
  /\bwork from phone only\b/i,
  /\bcrypto\s+(investment|wallet|payment|deposit)\b/i,
  /\binvestment required\b/i,
  /\brefundable deposit\b/i,
  /\bprocessing fee\b/i,
];

const ROLE_FAMILIES = [
  {
    id: "software",
    label: "Software Engineering",
    terms: ["software", "frontend", "front end", "backend", "back end", "fullstack", "full stack", "developer", "engineer", "react", "node", "java", "python", "mobile", "ios", "android", "platform"],
  },
  {
    id: "data",
    label: "Data",
    terms: ["data", "analytics", "analyst", "machine learning", "ml", "ai", "scientist", "bi", "etl", "warehouse", "analytics engineer"],
  },
  {
    id: "product",
    label: "Product",
    terms: ["product manager", "product owner", "growth product", "technical product", "program manager"],
  },
  {
    id: "design",
    label: "Design",
    terms: ["design", "designer", "ux", "ui", "researcher", "product design", "brand design"],
  },
  {
    id: "security",
    label: "Security",
    terms: ["security", "secops", "trust", "risk", "compliance", "privacy", "incident response"],
  },
  {
    id: "sales",
    label: "Sales",
    terms: ["sales", "account executive", "business development", "partnerships", "revenue"],
  },
  {
    id: "marketing",
    label: "Marketing",
    terms: ["marketing", "growth", "content", "seo", "brand", "communications", "campaign"],
  },
  {
    id: "operations",
    label: "Operations",
    terms: ["operations", "ops", "strategy", "chief of staff", "business operations", "supply"],
  },
  {
    id: "people",
    label: "People",
    terms: ["people", "recruiter", "talent", "hr", "human resources", "employee"],
  },
  {
    id: "finance",
    label: "Finance",
    terms: ["finance", "accounting", "controller", "fp&a", "treasury", "payroll"],
  },
];

const COUNTRY_LOCATION_HINTS = {
  canada: [
    "canada",
    "alberta",
    "british columbia",
    "manitoba",
    "new brunswick",
    "newfoundland",
    "nova scotia",
    "ontario",
    "prince edward island",
    "quebec",
    "saskatchewan",
    "yukon",
    "northwest territories",
    "nunavut",
    " ab",
    " bc",
    " mb",
    " nb",
    " nl",
    " ns",
    " nt",
    " nu",
    " on",
    " pe",
    " qc",
    " sk",
    " yt",
    "(ab)",
    "(bc)",
    "(mb)",
    "(nb)",
    "(nl)",
    "(ns)",
    "(nt)",
    "(nu)",
    "(on)",
    "(pe)",
    "(qc)",
    "(sk)",
    "(yt)",
  ],
};

const COUNTRY_EXCLUSION_HINTS = [
  "argentina",
  "australia",
  "bengaluru",
  "brazil",
  "china",
  "france",
  "germany",
  "india",
  "ireland",
  "israel",
  "japan",
  "mexico",
  "netherlands",
  "poland",
  "singapore",
  "spain",
  "tokyo",
  "united kingdom",
  "uk",
];

function normalizeText(value = "") {
  return value.replace(/\s+/g, " ").trim();
}

function parseJobDate(value) {
  if (!value) return null;
  const text = String(value).trim().toLowerCase();
  const relativeMatch = text.match(/posted\s+(?:(a|an|\d+)\s+)?(hour|day|week|month)s?\s+ago/);
  if (relativeMatch) {
    const amount = ["a", "an", undefined].includes(relativeMatch[1]) ? 1 : Number(relativeMatch[1]);
    const unit = relativeMatch[2];
    const multipliers = { hour: 3600000, day: 86400000, week: 604800000, month: 2592000000 };
    return new Date(Date.now() - amount * multipliers[unit]);
  }
  if (/^new\b/.test(text)) return new Date();
  if (typeof value === "number") {
    const ms = value > 100000000000 ? value : value * 1000;
    return Number.isFinite(ms) ? new Date(ms) : null;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function daysOld(value) {
  const date = parseJobDate(value);
  if (!date) return null;
  return Math.floor((Date.now() - date.getTime()) / 86400000);
}

function isFreshJob(job, maxAgeDays) {
  const age = daysOld(job.posted_at || job.posted);
  return age !== null && age >= 0 && age <= maxAgeDays;
}

function isBlockedJobHost(url = "") {
  const host = domainFromUrl(url);
  return BLOCKED_JOB_HOSTS.some((blocked) => host === blocked || host.endsWith(`.${blocked}`));
}

function safeUrl(value, base) {
  try {
    return new URL(value, base).toString();
  } catch {
    return "";
  }
}

function domainFromUrl(value = "") {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function companyFromDomain(domain = "") {
  const clean = domain
    .replace(/^jobs?\./, "")
    .replace(/^careers?\./, "")
    .replace(/\.(com|co|io|ai|net|org|jobs|careers|dev).*$/i, "");
  return clean
    .split(".")
    .pop()
    ?.split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ") || domain;
}

function companyFromBoard(source, token) {
  return DIRECT_COMPANY_BOARDS.find((board) => board.source === source && board.token === token)?.company || companyFromDomain(token);
}

function companyType(job) {
  const company = normalizeText(job.company || "").toLowerCase();
  const source = normalizeText(job.source || "");
  const discovery = normalizeText(job.discovery_source || "");
  const urlHost = domainFromUrl(job.url || job.career_page);

  if (BIG_TECH_COMPANIES.has(company) || /verified company board/i.test(discovery)) return "big_tech";
  if (/underdog|a16z|yc|startup|wellfound/i.test(`${source} ${discovery} ${urlHost}`)) return "startup";
  if (/greenhouse|lever|ashby|smartrecruiters|workable|recruitee|bamboohr|teamtailor|pinpoint/i.test(source)) return "ats";
  if (/job bank|company career|company json-ld/i.test(source)) return "direct_company";
  return "other";
}

function matchesCompanyType(job, filter = "all") {
  if (!filter || filter === "all") return true;
  if (filter === "startups") return job.company_type !== "big_tech";
  if (filter === "big_tech") return job.company_type === "big_tech";
  if (filter === "direct_company") return ["direct_company", "ats", "startup"].includes(job.company_type);
  if (filter === "other") return !["big_tech", "startup"].includes(job.company_type);
  return true;
}

function trustAssessment(job, maxAgeDays) {
  const reasons = [];
  const warnings = [];
  const text = `${job.title || ""} ${job.company || ""} ${job.description || ""} ${job.url || ""} ${job.career_page || ""}`;
  const source = normalizeText(job.source || "");
  const urlHost = domainFromUrl(job.url || "");
  const careerHost = domainFromUrl(job.career_page || job.url || "");
  const age = daysOld(job.posted_at || job.posted);
  const fresh = age !== null && age >= 0 && age <= maxAgeDays;
  const blocked = isBlockedJobHost(job.url) || isBlockedJobHost(job.career_page);
  const scamHit = SCAM_PATTERNS.find((pattern) => pattern.test(text));
  let score = 0;

  if (job.title) score += 10;
  else warnings.push("Missing role title");
  if (job.company) score += 10;
  else warnings.push("Missing company name");
  if (job.url) score += 10;
  else warnings.push("Missing application URL");

  if (TRUSTED_DIRECT_SOURCES.has(source)) {
    score += 25;
    reasons.push(`${source} is a supported direct source`);
  } else {
    warnings.push("Source is not on the supported direct-source list");
  }

  if (/Greenhouse|Lever|Ashby|SmartRecruiters|Workable|Recruitee|BambooHR|Teamtailor|Pinpoint|Job Bank Canada|Underdog\.io|a16z Jobs/.test(source)) {
    score += 15;
    reasons.push("Application link is on a recognized job platform");
  }

  if (/Company JSON-LD|Company career page/.test(source)) {
    score += 12;
    reasons.push("Posting was found on a company-controlled career page");
  }

  if (fresh) {
    score += 20;
    reasons.push(`Fresh posting signal within ${maxAgeDays} days`);
  } else if (age === null && /Greenhouse|Lever|Ashby|SmartRecruiters|Workable|Recruitee|BambooHR|Teamtailor|Pinpoint|Company JSON-LD|Company career page/.test(source)) {
    score += 5;
    warnings.push("No clear posting date; verify freshness before applying");
  } else {
    warnings.push("Posting is outside the selected freshness window or has no usable date");
  }

  if (urlHost && careerHost && (urlHost === careerHost || urlHost.endsWith(`.${careerHost}`) || careerHost.endsWith(`.${urlHost}`))) {
    score += 5;
    reasons.push("Application URL matches the career source domain");
  }

  if (blocked) warnings.push("Blocked aggregator host");
  if (scamHit) warnings.push("Scam-like language detected");
  if (blocked || scamHit) score -= 60;

  const label = score >= 80 ? "Verified" : score >= 65 ? "Likely legit" : score >= 50 ? "Needs review" : "Rejected";
  return {
    trust_score: clamp(Math.round(score), 0, 100),
    trust_label: label,
    trust_reasons: reasons.slice(0, 4),
    trust_warnings: warnings.slice(0, 4),
    company_type: companyType(job),
  };
}

function passesQualityGate(job, maxAgeDays) {
  const trust = trustAssessment(job, maxAgeDays);
  if (!job.title || !job.company || !job.url) return false;
  if (trust.trust_label === "Rejected") return false;
  if (trust.trust_score < 55) return false;
  if (trust.trust_warnings?.some((warning) => /blocked aggregator|scam-like/i.test(warning))) return false;
  return true;
}

function inferWorkType(text = "") {
  const haystack = text.toLowerCase();
  if (/\b(remote|work from home|wfh|anywhere|distributed|global role)\b/.test(haystack)) return "remote";
  if (/\b(hybrid|part remote|office\/remote|remote\/office)\b/.test(haystack)) return "hybrid";
  if (/\b(on-site|onsite|in office|office-based|relocation)\b/.test(haystack)) return "physical";
  return "";
}

function matchesRole(text, query) {
  const tokens = query
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 2);
  if (!tokens.length) return true;
  const haystack = text.toLowerCase();
  return tokens.some((token) => haystack.includes(token));
}

const ROLE_STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "role",
  "roles",
  "job",
  "jobs",
  "position",
  "positions",
  "opening",
  "openings",
  "remote",
  "hybrid",
  "onsite",
  "office",
]);

function roleTokens(value = "") {
  return value
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) => token.length > 2 && !ROLE_STOP_WORDS.has(token));
}

function roleRelevanceScore(job, query) {
  const tokens = roleTokens(query);
  if (!tokens.length) return 100;

  const phrase = normalizeText(query).toLowerCase();
  const title = normalizeText(job.title || "").toLowerCase();
  const skills = normalizeText(job.skills || "").toLowerCase();
  const description = normalizeText(job.description || "").toLowerCase();
  const searchable = `${title} ${skills} ${description}`;
  const titleMatches = tokens.filter((token) => title.includes(token));
  const searchableMatches = tokens.filter((token) => searchable.includes(token));
  const titleRatio = titleMatches.length / tokens.length;
  const searchableRatio = searchableMatches.length / tokens.length;

  let score = 0;
  if (phrase && title.includes(phrase)) score += 100;
  else if (phrase && `${title} ${skills}`.includes(phrase)) score += 90;
  else if (phrase && searchable.includes(phrase)) score += 55;

  score += titleMatches.length * 20;
  score += searchableMatches.length * 5;
  if (titleRatio === 1) score += 45;
  else if (titleRatio >= 0.67) score += 25;
  else if (titleRatio >= 0.5) score += 12;
  if (searchableRatio === 1) score += 10;

  return score;
}

function isPrimaryRoleMatch(job, query) {
  const tokens = roleTokens(query);
  if (!tokens.length) return true;
  const title = normalizeText(job.title || "").toLowerCase();
  const phrase = normalizeText(query).toLowerCase();
  const titleMatches = tokens.filter((token) => title.includes(token)).length;
  const titleRatio = titleMatches / tokens.length;
  return title.includes(phrase) || titleRatio >= (tokens.length <= 2 ? 1 : 0.67);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function applicationScore(job, query, workType, locationMode, location) {
  const roleScore = clamp((job.role_match_score || roleRelevanceScore(job, query)) / 2.2, 0, 45);
  const age = Number(job.posted_age_days);
  const freshnessScore = Number.isFinite(age) ? clamp(20 - age * 2.5, 0, 20) : 0;
  const sourceScore = job.confidence === "high" ? 12 : job.confidence === "medium" ? 7 : 3;
  const locationScore = matchesLocation(job, locationMode, location) ? 10 : 0;
  const workScore = !workType || workType === "all" || matchesWorkType(job, workType) ? 8 : 0;
  const salaryScore = job.salary ? 3 : 0;
  const applyScore = /apply|job|career|greenhouse|lever|ashby|jobbank|a16z/i.test(`${job.url} ${job.career_page}`) ? 2 : 0;
  return Math.round(clamp(roleScore + freshnessScore + sourceScore + locationScore + workScore + salaryScore + applyScore, 0, 100));
}

function extractKeywords(text = "", query = "", limit = 8) {
  const queryTokens = new Set(roleTokens(query));
  const ignored = new Set([
    ...ROLE_STOP_WORDS,
    "experience",
    "team",
    "work",
    "using",
    "build",
    "building",
    "strong",
    "including",
    "class",
    "span",
    "href",
    "https",
    "http",
    "nbsp",
    "div",
    "amp",
    "blank",
    "font",
    "style",
    "text",
    "size",
    "weight",
    "that",
    "this",
    "their",
    "your",
    "you",
    "our",
    "are",
    "will",
    "com",
    "www",
    "all",
    "any",
    "can",
    "from",
    "have",
    "high",
    "new",
    "number",
    "september",
    "apply",
    "applyinterested",
    "account",
    "favourites",
    "favorite",
    "sign",
    "salary",
    "location",
    "hourly",
    "annually",
    "talent.com",
  ]);
  const counts = new Map();
  normalizeText(text)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .filter((token) =>
      token.length > 2 &&
      !ignored.has(token) &&
      !/^\d+(?:\.\d+)?$/.test(token) &&
      !/^[a-f0-9]{8,}$/.test(token)
    )
    .forEach((token) => counts.set(token, (counts.get(token) || 0) + (queryTokens.has(token) ? 4 : 1)));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function applicationPriority(score) {
  if (score >= 82) return "Excellent target";
  if (score >= 68) return "Strong target";
  if (score >= 52) return "Worth applying";
  return "Lower priority";
}

function interviewStrategy(job, query) {
  const keywords = extractKeywords(`${job.title} ${job.skills} ${job.description}`, query, 5);
  const actions = [
    `Mirror the title language: ${job.title}.`,
    keywords.length ? `Put these keywords high in the resume: ${keywords.join(", ")}.` : "Use the job title and strongest measurable outcomes in the resume summary.",
    job.posted_age_days !== null && job.posted_age_days <= 1
      ? "Apply today; this posting is still in the early-response window."
      : "Apply with a tailored resume before the posting ages out of the freshness window.",
  ];
  if (job.company) actions.push(`Add one company-specific sentence for ${job.company}.`);
  return actions;
}

function enrichForCandidate(job, query, workType, locationMode, location) {
  const score = applicationScore(job, query, workType, locationMode, location);
  return {
    ...job,
    application_score: score,
    application_priority: applicationPriority(score),
    resume_keywords: extractKeywords(`${job.title} ${job.skills} ${job.description}`, query),
    interview_strategy: interviewStrategy(job, query),
  };
}

function sourceKey(job) {
  const host = domainFromUrl(job.career_page || job.url);
  return normalizeText(job.source || job.discovery_source || host || "Unknown source");
}

function compareOpportunity(a, b) {
  return (b.application_score || 0) - (a.application_score || 0) ||
    (b.role_match_score || 0) - (a.role_match_score || 0) ||
    (parseJobDate(b.posted)?.getTime() || 0) - (parseJobDate(a.posted)?.getTime() || 0);
}

function diversifyBySource(jobs, limit = jobs.length) {
  const queues = new Map();
  jobs.forEach((job) => {
    const key = sourceKey(job);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(job);
  });
  queues.forEach((queue) => queue.sort(compareOpportunity));

  const picked = [];
  const sourceCounts = new Map();
  while (picked.length < limit) {
    let bestKey = "";
    let bestJob = null;
    let bestUtility = -Infinity;

    queues.forEach((queue, key) => {
      const candidate = queue[0];
      if (!candidate) return;
      const shownFromSource = sourceCounts.get(key) || 0;
      const utility = (candidate.application_score || 0) / Math.sqrt(shownFromSource + 1);
      if (
        utility > bestUtility ||
        (utility === bestUtility && compareOpportunity(candidate, bestJob || {}) < 0)
      ) {
        bestUtility = utility;
        bestJob = candidate;
        bestKey = key;
      }
    });

    if (!bestJob) break;
    queues.get(bestKey).shift();
    sourceCounts.set(bestKey, (sourceCounts.get(bestKey) || 0) + 1);
    picked.push(bestJob);
  }

  return picked;
}

function discoveryKey(item) {
  return SEARCH_SOURCES.find((source) => source.id === item.source)?.label || item.discovery_source || item.source || "Open web";
}

function diversifyDiscoveries(discoveries, limit) {
  const queues = new Map();
  discoveries.forEach((item) => {
    const key = discoveryKey(item);
    if (!queues.has(key)) queues.set(key, []);
    queues.get(key).push(item);
  });

  const picked = [];
  while (picked.length < limit) {
    let moved = false;
    for (const source of SEARCH_SOURCES) {
      const key = source.label;
      const next = queues.get(key)?.shift();
      if (!next) continue;
      picked.push(next);
      moved = true;
      if (picked.length >= limit) break;
    }
    for (const [key, queue] of queues) {
      if (SEARCH_SOURCES.some((source) => source.label === key)) continue;
      const next = queue.shift();
      if (!next) continue;
      picked.push(next);
      moved = true;
      if (picked.length >= limit) break;
    }
    if (!moved) break;
  }

  return picked;
}

function detectRoleFamily(value = "") {
  const haystack = value.toLowerCase();
  let best = null;
  for (const family of ROLE_FAMILIES) {
    const score = family.terms.reduce((sum, term) => sum + (haystack.includes(term) ? 1 : 0), 0);
    if (score > (best?.score || 0)) best = { ...family, score };
  }
  return best?.score ? best : null;
}

function similarScore(job, query, family, currentPageUrls) {
  if (currentPageUrls.has(job.url)) return -1;
  const titleHaystack = `${job.title || ""} ${job.skills || ""}`.toLowerCase();
  const haystack = `${titleHaystack} ${job.description || ""}`.toLowerCase();
  const tokens = roleTokens(query);
  const overlap = tokens.reduce((sum, token) => {
    if (titleHaystack.includes(token)) return sum + 4;
    if (haystack.includes(token)) return sum + 1;
    return sum;
  }, 0);
  const familyTitleScore = family?.terms?.some((term) => titleHaystack.includes(term)) ? 8 : 0;
  if (!overlap && !familyTitleScore) return -1;
  const familyScore = familyTitleScore || (family?.terms?.some((term) => haystack.includes(term)) ? 2 : 0);
  const sourceScore = job.confidence === "high" ? 2 : 0;
  const freshnessScore = Math.max(0, 7 - (Number(job.posted_age_days) || 0));
  const workScore = /remote|hybrid|onsite|on-site|office|distributed|global|worldwide/.test(haystack) ? 1 : 0;
  const primaryPenalty = isPrimaryRoleMatch(job, query) ? -6 : 0;
  return overlap + familyScore + sourceScore + freshnessScore + workScore + primaryPenalty;
}

function getSimilarPostings(allJobs, currentPageJobs, query) {
  const currentPageUrls = new Set(currentPageJobs.map((job) => job.url).filter(Boolean));
  const family = detectRoleFamily(query);
  return allJobs
    .map((job) => ({ job, score: similarScore(job, query, family, currentPageUrls) }))
    .filter(({ score }) => score >= 5)
    .sort((a, b) => b.score - a.score || (parseJobDate(b.job.posted)?.getTime() || 0) - (parseJobDate(a.job.posted)?.getTime() || 0))
    .slice(0, SIMILAR_PER_PAGE)
    .map(({ job, score }) => ({ ...job, similarity_score: score, role_family: family?.label || "Related roles" }));
}

function publicJob(job) {
  const { description, ...safeJob } = job;
  return safeJob;
}

function matchesWorkType(job, workType) {
  if (!workType || workType === "all") return true;
  const combined = `${job.title || ""} ${job.location || ""} ${job.description || ""} ${job.work_type || ""}`;
  const inferred = job.work_type || inferWorkType(combined);
  if (workType === "physical") return inferred === "physical" || (!/remote|hybrid|anywhere/i.test(combined));
  return inferred === workType;
}

function matchesLocation(job, locationMode, location) {
  if (locationMode === "worldwide" || !location?.trim()) return true;
  const needle = location.toLowerCase();
  const loc = ` ${normalizeText(job.location || "").toLowerCase()} `;
  const locIsKnown = loc.trim() && !/^(not specified|worldwide \/ not specified)$/.test(loc.trim());
  const source = normalizeText(job.source || "").toLowerCase();
  const combined = `${loc} ${job.title || ""} ${job.description || ""} ${job.url || ""}`.toLowerCase();
  const aliases = COUNTRY_LOCATION_HINTS[needle] || [needle];

  if (needle === "canada" && source === "job bank canada") return true;
  if (aliases.some((alias) => loc.includes(alias))) return true;
  if (/\b(worldwide|global|anywhere)\b/.test(loc)) return true;
  if (locIsKnown && COUNTRY_EXCLUSION_HINTS.some((country) => loc.includes(country))) return false;
  if (locIsKnown) return loc.includes(needle);
  return aliases.some((alias) => combined.includes(alias)) || /\b(worldwide|global|anywhere)\b/.test(combined);
}

function normalizeJob(job, query, workType, locationMode, location) {
  const title = normalizeText(job.title || "");
  const company = normalizeText(job.company || companyFromDomain(domainFromUrl(job.url || job.career_page || "")));
  const loc = normalizeText(job.location || "");
  const combined = `${title} ${company} ${loc} ${job.description || ""} ${job.url || ""}`;
  const inferredType = job.work_type || inferWorkType(combined) || (workType === "physical" ? "physical" : "");
  const normalized = {
    title,
    company,
    location: loc || (locationMode === "worldwide" ? "Worldwide / not specified" : "Not specified"),
    work_type: inferredType || "not specified",
    salary: normalizeText(job.salary || ""),
    experience: normalizeText(job.experience || ""),
    skills: normalizeText(job.skills || ""),
    posted: normalizeText(job.posted || ""),
    posted_age_days: daysOld(job.posted_at || job.posted),
    freshness_verified: Boolean(parseJobDate(job.posted_at || job.posted)),
    url: job.url || "",
    career_page: job.career_page || job.url || "",
    source: job.source || "Company career page",
    discovery_source: job.discovery_source || "",
    description: normalizeText(job.description || ""),
    confidence: job.confidence || (matchesRole(combined, query) && parseJobDate(job.posted_at || job.posted) ? "high" : "medium"),
  };
  return {
    ...normalized,
    ...trustAssessment(normalized, 7),
  };
}

function dedupeJobs(jobs = []) {
  const seen = new Set();
  return jobs.filter((job) => {
    const key = `${job.title}|${job.company}|${(job.url || "").split("?")[0]}`.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function getStoredJobListings({ query, location, locationMode, workType, maxAgeDays, companyFilter }) {
  if (!isDatabaseConfigured()) return [];
  const cutoff = encodeURIComponent(new Date(Date.now() - maxAgeDays * 86400000).toISOString());
  try {
    const rows = await supabaseRequest("job_listings", {
      query: `?is_active=eq.true&is_dead=eq.false&posted_at=gte.${cutoff}&select=title,company_name,location,work_type,salary,experience,skills,posted_at,posted_age_days,url,career_page,source,discovery_source,confidence,raw&order=posted_at.desc&limit=1200`,
    });
    return (rows || [])
      .map((row) => normalizeJob({
        title: row.title,
        company: row.company_name,
        location: row.location,
        work_type: row.work_type,
        salary: row.salary,
        experience: row.experience,
        skills: row.skills,
        posted: row.posted_at,
        posted_at: row.posted_at,
        url: row.url,
        career_page: row.career_page,
        source: row.source,
        discovery_source: row.discovery_source || "Supabase scheduled crawl",
        description: row.raw?.description || "",
        confidence: row.confidence || "high",
      }, query, workType, locationMode, location))
      .map((job) => ({ ...job, role_match_score: roleRelevanceScore(job, query) }))
      .map((job) => ({ ...job, ...trustAssessment(job, maxAgeDays) }))
      .filter((job) => matchesRole(`${job.title} ${job.description || ""} ${job.url}`, query))
      .filter((job) => matchesWorkType(job, workType))
      .filter((job) => matchesLocation(job, locationMode, location))
      .filter((job) => matchesCompanyType(job, companyFilter))
      .filter((job) => passesQualityGate(job, maxAgeDays));
  } catch (err) {
    console.warn("Stored job listing read failed; using live crawl only.", err.message);
    return [];
  }
}

async function scrapeDDGHtml(query, pageNum = 1, source = "seo") {
  const params = { q: query };
  if (pageNum > 1) params.s = String((pageNum - 1) * 30);

  const resp = await axios.get("https://html.duckduckgo.com/html/", {
    params,
    headers: {
      "User-Agent": BROWSER_UA,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
    timeout: 18000,
    maxRedirects: 5,
  });

  const $ = cheerio.load(resp.data);
  const results = [];
  $("a.result__a").each((_, el) => {
    const title = normalizeText($(el).text());
    let url = $(el).attr("href") || "";
    try {
      const parsed = new URL(url, "https://html.duckduckgo.com");
      url = parsed.searchParams.get("uddg") || url;
    } catch {}
    const description = normalizeText($(el).closest(".result").find(".result__snippet").text());
    if (title && url.startsWith("http")) {
      results.push({ title, url, description, source });
    }
  });
  return results;
}

function buildGlobalQueries(query, location, locationMode, workType) {
  const geo = locationMode === "worldwide" ? "worldwide global" : location;
  const type = workType === "physical" ? "onsite office" : workType;
  return [
    { source: "seo", q: `"${query}" ${geo} ${type} careers jobs company hiring` },
    { source: "greenhouse", q: `site:boards.greenhouse.io "${query}" ${geo} ${type}` },
    { source: "lever", q: `site:jobs.lever.co "${query}" ${geo} ${type}` },
    { source: "ashby", q: `site:jobs.ashbyhq.com "${query}" ${geo} ${type}` },
    { source: "smartrecruiters", q: `site:jobs.smartrecruiters.com "${query}" ${geo} ${type}` },
    { source: "workable", q: `site:apply.workable.com "${query}" ${geo} ${type}` },
    { source: "recruitee", q: `site:*.recruitee.com "${query}" ${geo} careers jobs` },
    { source: "bamboohr", q: `site:*.bamboohr.com/careers "${query}" ${geo} ${type}` },
    { source: "teamtailor", q: `site:*.teamtailor.com/jobs "${query}" ${geo} ${type}` },
    { source: "pinpoint", q: `site:*.pinpointhq.com "${query}" ${geo} ${type}` },
    { source: "crunchbase", q: `site:crunchbase.com/organization "${query}" ${geo} hiring careers` },
    { source: "jobbank", q: `site:jobbank.gc.ca/jobsearch "${query}" ${geo} ${type}` },
    { source: "underdog", q: `site:underdog.io "${query}" ${geo} ${type} startup jobs` },
    { source: "a16z", q: `site:jobs.a16z.com/jobs "${query}" ${geo} ${type}` },
  ];
}

function isLikelyCareerUrl(url = "", title = "") {
  const text = `${url} ${title}`.toLowerCase();
  return /career|jobs|job-|\/job\/|opening|position|greenhouse|lever\.co|ashbyhq|smartrecruiters|workable|recruitee|bamboohr|teamtailor|pinpointhq|jobbank\.gc\.ca|underdog\.io|jobs\.a16z\.com/.test(text);
}

function atsSource(url = "") {
  const host = domainFromUrl(url);
  if (host.endsWith("jobbank.gc.ca")) return "Job Bank Canada";
  if (host.endsWith("underdog.io")) return "Underdog.io";
  if (host === "jobs.a16z.com") return "a16z Jobs";
  if (host.includes("greenhouse.io")) return "Greenhouse";
  if (host.includes("lever.co")) return "Lever";
  if (host.includes("ashbyhq.com")) return "Ashby";
  if (host.includes("smartrecruiters.com")) return "SmartRecruiters";
  if (host.includes("workable.com")) return "Workable";
  if (host.includes("bamboohr.com")) return "BambooHR";
  if (host.includes("teamtailor.com")) return "Teamtailor";
  if (host.includes("pinpointhq.com")) return "Pinpoint";
  return "";
}

function boardToken(url = "", source = "") {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/").filter(Boolean);
    if (source === "Greenhouse") return parts[0] || "";
    if (source === "Lever") return parts[0] || "";
    if (source === "Ashby") return parts[0] || "";
    if (source === "SmartRecruiters") return parts[0] || "";
    if (source === "Workable") return parts[0] || "";
  } catch {}
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

async function fetchHtml(url, headers = {}) {
  const requestHeaders = {
    "User-Agent": BROWSER_UA,
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    ...headers,
  };
  try {
    const res = await fetch(url, { headers: requestHeaders, redirect: "follow" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } catch (fetchError) {
    const res = await axios.get(url, {
      headers: requestHeaders,
      timeout: 18000,
      maxRedirects: 5,
    });
    if (!res.data) throw fetchError;
    return res.data;
  }
}

async function fetchGreenhouseJobs(url) {
  const token = boardToken(url, "Greenhouse");
  if (!token) return [];
  const data = await fetchJson(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
  return (data.jobs || []).map((job) => ({
    title: job.title,
    company: data.meta?.company || companyFromBoard("Greenhouse", token),
    location: job.location?.name || "",
    url: job.absolute_url || url,
    career_page: `https://boards.greenhouse.io/${token}`,
    source: "Greenhouse",
    posted: job.updated_at || "",
    posted_at: job.updated_at || "",
    description: cheerio.load(job.content || "").text(),
    confidence: "high",
  }));
}

async function fetchLeverJobs(url) {
  const token = boardToken(url, "Lever");
  if (!token) return [];
  const data = await fetchJson(`https://api.lever.co/v0/postings/${token}?mode=json`);
  return (Array.isArray(data) ? data : []).map((job) => ({
    title: job.text,
    company: companyFromBoard("Lever", token),
    location: job.categories?.location || "",
    work_type: inferWorkType(`${job.categories?.commitment || ""} ${job.categories?.location || ""}`),
    url: job.hostedUrl || job.applyUrl || url,
    career_page: `https://jobs.lever.co/${token}`,
    source: "Lever",
    posted: job.createdAt ? new Date(job.createdAt).toISOString().slice(0, 10) : "",
    posted_at: job.createdAt ? new Date(job.createdAt).toISOString() : "",
    description: normalizeText(`${job.descriptionPlain || ""} ${(job.lists || []).map((list) => list.content || "").join(" ")}`),
    confidence: "high",
  }));
}

async function fetchAshbyJobs(url) {
  const token = boardToken(url, "Ashby");
  if (!token) return [];
  const data = await fetchJson(`https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`);
  return (data.jobs || []).map((job) => ({
    title: job.title,
    company: companyFromBoard("Ashby", token),
    location: job.location || "",
    salary: job.compensation || "",
    url: job.jobUrl || url,
    career_page: `https://jobs.ashbyhq.com/${token}`,
    source: "Ashby",
    posted: job.publishedAt || "",
    posted_at: job.publishedAt || "",
    description: normalizeText(job.descriptionHtml ? cheerio.load(job.descriptionHtml).text() : ""),
    confidence: "high",
  }));
}

async function fetchSmartRecruitersJobs(url) {
  const token = boardToken(url, "SmartRecruiters");
  if (!token) return [];
  const data = await fetchJson(`https://api.smartrecruiters.com/v1/companies/${token}/postings?limit=100`);
  return (data.content || []).map((job) => ({
    title: job.name,
    company: job.company?.name || companyFromBoard("SmartRecruiters", token),
    location: normalizeText([job.location?.city, job.location?.region, job.location?.country].filter(Boolean).join(", ")),
    url: job.ref || job.applyUrl || url,
    career_page: `https://jobs.smartrecruiters.com/${token}`,
    source: "SmartRecruiters",
    posted: job.releasedDate || "",
    posted_at: job.releasedDate || "",
    description: job.description || "",
    confidence: "high",
  }));
}

function splitJobDetails(text = "") {
  const parts = normalizeText(text).split(/[·•|]/).map((part) => part.trim()).filter(Boolean);
  const posted = parts.find((part) => /\b(posted|new\b|today|yesterday|ago|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i.test(part)) || "";
  const salary = parts.find((part) => /(\$|usd|cad|hourly|annually|year)/i.test(part)) || "";
  const location = parts.find((part) => part !== posted && part !== salary && /\b(remote|hybrid|onsite|on site|united|canada|california|new york|london|toronto|vancouver|india|europe|africa|[A-Z]{2})\b/.test(part)) || "";
  return { location, salary, posted };
}

function jobBankSearchUrl(query, location = "", pageNum = 1) {
  const params = new URLSearchParams({
    searchstring: query,
    sort: "D",
  });
  if (location) params.set("locationstring", location);
  if (pageNum > 1) params.set("page", String(pageNum));
  return `https://www.jobbank.gc.ca/jobsearch/jobsearch?${params.toString()}`;
}

async function fetchJobBankJobs(url, query, location = "") {
  const targetUrl = url.includes("/jobsearch/jobsearch") ? url : jobBankSearchUrl(query, location);
  const html = await fetchHtml(targetUrl, { "Accept-Language": "en-CA,en-US;q=0.9,en;q=0.8" });
  const $ = cheerio.load(html);
  const jobs = [];
  const cards = $("article[id^='article-'], .job-posting-summary, li:has(a[href*='/jobsearch/jobposting/'])");

  cards.each((_, card) => {
    const $card = $(card);
    const titleEl = $card.is("a")
      ? $card
      : $card.find("a[href*='/jobsearch/jobposting/'], a[href*='/jobposting/'], h3 a").first();
    const title = normalizeText($card.find(".noctitle").first().text() || $card.find("h3, h2").first().text() || titleEl.text());
    const href = safeUrl(titleEl.attr("href"), "https://www.jobbank.gc.ca");
    const text = normalizeText((titleEl.length ? titleEl : $card).text());
    const posted = normalizeText($card.find("time").attr("datetime") || $card.find(".date").first().text() || (text.match(/[A-Z][a-z]+ \d{1,2}, \d{4}|Posted [^$]+?(?= Location| Salary| Job number|$)/)?.[0] || ""));
    const company = normalizeText(
      $card.find(".business, [class*='business'], [class*='employer'], [data-employer]").first().text()
    ) || normalizeText(text.split(/\bLocation\b/i)[0]?.replace(title, "").replace(/\b(New|Remote|Hybrid|On site|Direct Apply|Posted on Job Bank|Job Bank)\b/gi, ""));
    const loc = normalizeText($card.find(".location, [class*='location']").first().text()).replace(/^Location\s*/i, "") || normalizeText(text.match(/\bLocation\s+(.+?)(?=\s+Salary|\s+Job Bank|\s+Job number|$)/i)?.[1] || "");
    const salary = normalizeText($card.find(".salary, [class*='salary']").first().text()).replace(/^Salary\s*/i, "") || normalizeText(text.match(/\bSalary\s+(.+?)(?=\s+Job Bank|\s+Job number|$)/i)?.[1] || "");
    if (!title || !href) return;
    jobs.push({
      title,
      company: company || "Job Bank employer",
      location: loc,
      salary,
      posted,
      posted_at: posted,
      url: href,
      career_page: targetUrl,
      source: "Job Bank Canada",
      discovery_source: "Job Bank Canada direct search",
      description: text,
      confidence: "high",
    });
  });

  return jobs;
}

async function fetchA16zJobs(url, query) {
  const targetUrl = url.startsWith("https://jobs.a16z.com/jobs") ? url : "https://jobs.a16z.com/jobs";
  const html = await fetchHtml(targetUrl);
  const $ = cheerio.load(html);
  const jobs = [];
  const titleLinks = $("a[href*='/jobs/']").filter((_, el) => {
    const href = $(el).attr("href") || "";
    const text = normalizeText($(el).text());
    return text && !/all portfolio jobs|jobs by company|a16z jobs/i.test(text) && /\/jobs\/[^/?#]+/.test(href);
  });

  titleLinks.each((_, el) => {
    const $link = $(el);
    const card = $link.closest("article, li, [class*='job'], [class*='Job'], div").first();
    const text = normalizeText(card.text());
    if (!matchesRole(`${$link.text()} ${text}`, query)) return;
    const { location, salary, posted } = splitJobDetails(text);
    const company = normalizeText(card.find("a[href*='/companies/']").first().text()) || "a16z portfolio company";
    const applyUrl = safeUrl(card.find("a").filter((_, a) => /apply/i.test($(a).text())).first().attr("href"), targetUrl);
    jobs.push({
      title: normalizeText($link.text()),
      company,
      location,
      salary,
      posted,
      posted_at: posted,
      url: safeUrl($link.attr("href"), targetUrl) || applyUrl,
      career_page: targetUrl,
      source: "a16z Jobs",
      discovery_source: "a16z Jobs direct search",
      description: text,
      confidence: "high",
    });
  });

  return jobs;
}

async function fetchUnderdogJobs(url, query) {
  const targetUrl = url.includes("underdog.io") ? url : "https://underdog.io/startup-job-board";
  const html = await fetchHtml(targetUrl);
  const $ = cheerio.load(html);
  const jobs = [];
  $("article, li, [class*='job'], [class*='Job']").each((_, card) => {
    const $card = $(card);
    const text = normalizeText($card.text());
    const titleEl = $card.find("a[href]").filter((_, el) => matchesRole($(el).text(), query)).first();
    const title = normalizeText(titleEl.text());
    const { location, salary, posted } = splitJobDetails(text);
    if (!title || !posted || !matchesRole(`${title} ${text}`, query)) return;
    jobs.push({
      title,
      company: "Underdog.io startup",
      location,
      salary,
      posted,
      posted_at: posted,
      url: safeUrl(titleEl.attr("href"), targetUrl) || targetUrl,
      career_page: targetUrl,
      source: "Underdog.io",
      discovery_source: "Underdog.io direct search",
      description: text,
      confidence: "medium",
    });
  });
  return jobs;
}

async function fetchDirectCompanyBoard(board) {
  const urlBySource = {
    Greenhouse: `https://boards.greenhouse.io/${board.token}`,
    Lever: `https://jobs.lever.co/${board.token}`,
    Ashby: `https://jobs.ashbyhq.com/${board.token}`,
    SmartRecruiters: `https://jobs.smartrecruiters.com/${board.token}`,
    Workable: `https://apply.workable.com/${board.token}`,
  };
  const url = urlBySource[board.source];
  if (!url) return [];
  const jobs = await extractCareerJobs(url, {
    title: `${board.token} careers`,
    url,
    description: "",
    discovery_source: `${board.source} verified company board`,
  }, "");
  return jobs.map((job) => ({
    ...job,
    company: job.company && job.company !== board.source ? job.company : board.company,
    discovery_source: `${board.source} verified company board`,
  }));
}

async function scrapeGenericCareerPage(url, discovery, query) {
  const html = await fetchHtml(url);
  const $ = cheerio.load(html);
  const pageTitle = normalizeText($("title").first().text());
  const company = companyFromDomain(domainFromUrl(url));
  const jobs = [];

  $("script[type='application/ld+json']").each((_, el) => {
    try {
      const raw = $(el).contents().text();
      const parsed = JSON.parse(raw);
      const items = Array.isArray(parsed) ? parsed : [parsed];
      items.flatMap((item) => item["@graph"] || item).forEach((item) => {
        if (item?.["@type"] !== "JobPosting") return;
        const firstLocation = Array.isArray(item.jobLocation) ? item.jobLocation[0] : item.jobLocation;
        const firstApplicantLocation = Array.isArray(item.applicantLocationRequirements)
          ? item.applicantLocationRequirements[0]
          : item.applicantLocationRequirements;
        const loc = firstLocation?.address
          ? [
              firstLocation.address.addressLocality,
              firstLocation.address.addressRegion,
              firstLocation.address.addressCountry,
            ].filter(Boolean).join(", ")
          : firstApplicantLocation?.name || "";
        jobs.push({
          title: item.title,
          company: item.hiringOrganization?.name || company,
          location: loc,
          salary: item.baseSalary?.value?.value || item.baseSalary?.value?.minValue || "",
          posted: item.datePosted || "",
          url: item.url || url,
          career_page: url,
          source: "Company JSON-LD",
          description: normalizeText(item.description ? cheerio.load(item.description).text() : ""),
          confidence: "high",
        });
      });
    } catch {}
  });

  $("a[href]").each((_, el) => {
    const text = normalizeText($(el).text());
    const href = safeUrl($(el).attr("href"), url);
    const surrounding = normalizeText($(el).closest("li, article, div, section").text()).slice(0, 700);
    if (!text || !href) return;
    if (!isLikelyCareerUrl(href, text)) return;
    if (!matchesRole(`${text} ${surrounding} ${href}`, query)) return;
    jobs.push({
      title: text.replace(/\b(apply now|view job|learn more)\b/gi, "").trim() || query,
      company: pageTitle.includes("|") ? normalizeText(pageTitle.split("|").pop()) : company,
      location: surrounding.match(/\b(remote|hybrid|worldwide|united states|uk|canada|india|europe|africa|lagos|london|new york|san francisco)\b/i)?.[0] || "",
      work_type: inferWorkType(`${text} ${surrounding} ${href}`),
      url: href,
      career_page: url,
      source: atsSource(href) || "Company career page",
      description: surrounding,
      confidence: "medium",
    });
  });

  if (!jobs.length && isLikelyCareerUrl(url, discovery.title) && matchesRole(`${discovery.title} ${discovery.description}`, query)) {
    jobs.push({
      title: discovery.title,
      company,
      location: "",
      work_type: inferWorkType(`${discovery.title} ${discovery.description}`),
      url,
      career_page: url,
      source: "Search result",
      description: discovery.description,
      confidence: "medium",
    });
  }

  return jobs;
}

async function extractCareerJobs(url, discovery, query) {
  const source = atsSource(url);
  try {
    if (source === "Job Bank Canada") return await fetchJobBankJobs(url, query);
    if (source === "Underdog.io") return await fetchUnderdogJobs(url, query);
    if (source === "a16z Jobs") return await fetchA16zJobs(url, query);
    if (source === "Greenhouse") return await fetchGreenhouseJobs(url);
    if (source === "Lever") return await fetchLeverJobs(url);
    if (source === "Ashby") return await fetchAshbyJobs(url);
    if (source === "SmartRecruiters") return await fetchSmartRecruitersJobs(url);
  } catch (err) {
    console.warn(`${source} extraction failed:`, err.message);
  }

  try {
    return await scrapeGenericCareerPage(url, discovery, query);
  } catch (err) {
    console.warn(`Career page scrape failed ${url}:`, err.message);
    if (isLikelyCareerUrl(url, discovery.title)) {
      return [{
        title: discovery.title,
        company: companyFromDomain(domainFromUrl(url)),
        location: "",
        work_type: inferWorkType(`${discovery.title} ${discovery.description}`),
        url,
        career_page: url,
        source: source || "Search result",
        description: discovery.description,
        confidence: "low",
      }];
    }
    return [];
  }
}

async function scrapeGlobalCareerPages({ query, location, locationMode, workType, discoveryPages, maxCompanies, maxAgeDays, companyFilter, sourceMode }) {
  const pageCount = Math.min(Math.max(Number(discoveryPages) || 1, 1), 3);
  const companyLimit = Math.min(Math.max(Number(maxCompanies) || 20, 5), 60);
  const searches = buildGlobalQueries(query, location, locationMode, workType);
  const includeSeedBoards = companyFilter !== "startups" || sourceMode === "known_boards";
  const [seedGroups, directSourceGroups, ...discoveryGroups] = await Promise.all([
    includeSeedBoards
      ? Promise.all(DIRECT_COMPANY_BOARDS.map(async (board) => {
          try {
            return await fetchDirectCompanyBoard(board);
          } catch (err) {
            console.warn(`${board.source} seed failed for ${board.token}:`, err.message);
            return [];
          }
        })).then((groups) => groups.flat())
      : Promise.resolve([]),
    Promise.all([
      fetchJobBankJobs(jobBankSearchUrl(query, locationMode === "country" ? location : ""), query, locationMode === "country" ? location : ""),
      fetchA16zJobs("https://jobs.a16z.com/jobs", query),
      fetchUnderdogJobs("https://underdog.io/startup-job-board", query),
    ].map((promise) => promise.catch((err) => {
      console.warn("Direct job source scrape failed:", err.message);
      return [];
    }))).then((groups) => groups.flat()),
    ...searches.map(async (search) => {
      const results = [];
      for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
        try {
          const found = await scrapeDDGHtml(search.q, pageNum, search.source);
          results.push(...found.map((item) => ({
            ...item,
            discovery_source: SEARCH_SOURCES.find((s) => s.id === search.source)?.label || search.source,
          })));
        } catch (err) {
          console.warn(`Global job discovery failed for ${search.source}:`, err.message);
        }
      }
      return results;
    }),
  ]);

  const discoveries = discoveryGroups.flat();

  const seenUrls = new Set();
  const candidates = discoveries
    .filter((item) => isLikelyCareerUrl(item.url, item.title))
    .filter((item) => {
      const key = item.url.split("?")[0].replace(/\/$/, "");
      if (seenUrls.has(key)) return false;
      seenUrls.add(key);
      return true;
    });
  const diversifiedCandidates = diversifyDiscoveries(candidates, companyLimit);

  const jobs = [];
  for (const candidate of diversifiedCandidates) {
    const extracted = await extractCareerJobs(candidate.url, candidate, query);
    jobs.push(...extracted.map((job) => ({ ...job, discovery_source: candidate.discovery_source })));
  }

  const normalized = [...seedGroups, ...directSourceGroups, ...jobs]
    .map((job) => normalizeJob(job, query, workType, locationMode, location))
    .map((job) => ({ ...job, role_match_score: roleRelevanceScore(job, query) }))
    .map((job) => ({ ...job, ...trustAssessment(job, maxAgeDays) }))
    .filter((job) => job.title && matchesRole(`${job.title} ${job.description || ""} ${job.url}`, query))
    .filter((job) => matchesWorkType(job, workType))
    .filter((job) => matchesLocation(job, locationMode, location))
    .filter((job) => matchesCompanyType(job, companyFilter))
    .filter((job) => passesQualityGate(job, maxAgeDays));

  const seen = new Set();
  return normalized
    .filter((job) => {
      const key = `${job.title}|${job.company}|${job.url}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) =>
      (b.role_match_score || 0) - (a.role_match_score || 0) ||
      (parseJobDate(b.posted)?.getTime() || 0) - (parseJobDate(a.posted)?.getTime() || 0)
    );
}

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

export async function POST(request) {
  let browser;
  try {
    const limited = rateLimit(request, { key: "job_portal_scraper", limit: 5, authenticatedLimit: 30, windowMs: 60_000 });
    if (limited) return limited;
    const {
      portal = "global_careers",
      query,
      location = "",
      locationMode = location ? "country" : "worldwide",
      workType = "all",
      pages = 1,
      resultPage = pages,
      discoveryPages = 1,
      perPage = PER_PAGE,
      maxAgeDays = 7,
      maxCompanies = 20,
      companyFilter = "all",
      sourceMode = "all_trusted",
    } = await request.json();
    if (!query || !query.trim()) {
      return NextResponse.json({ error: "Job title / keywords are required" }, { status: 400 });
    }
    if (["indeed", "linkedin"].includes(portal)) {
      return NextResponse.json(
        { error: "LinkedIn and Indeed are disabled for this feature. Use direct company career-page search instead." },
        { status: 400 }
      );
    }

    const pageCount = Math.min(Math.max(Number(pages) || 1, 1), 3);
    const safeResultPage = Math.min(Math.max(Number(resultPage) || 1, 1), MAX_RESULT_PAGES);
    const safePerPage = Math.min(Math.max(Number(perPage) || PER_PAGE, 1), PER_PAGE);
    const safeMaxAgeDays = Math.min(Math.max(Number(maxAgeDays) || 7, 1), 7);

    if (portal === "global_careers") {
      const [storedJobs, liveJobs] = await Promise.all([
        getStoredJobListings({
          query: query.trim(),
          location: location.trim(),
          locationMode,
          workType,
          maxAgeDays: safeMaxAgeDays,
          companyFilter,
        }),
        scrapeGlobalCareerPages({
          query: query.trim(),
          location: location.trim(),
          locationMode,
          workType,
          discoveryPages,
          maxCompanies,
          maxAgeDays: safeMaxAgeDays,
          companyFilter,
          sourceMode,
        }),
      ]);
      const allFreshJobs = dedupeJobs([...storedJobs, ...liveJobs]).sort(
        (a, b) =>
          (b.role_match_score || 0) - (a.role_match_score || 0) ||
          (parseJobDate(b.posted)?.getTime() || 0) - (parseJobDate(a.posted)?.getTime() || 0)
      ).map((job) => enrichForCandidate(job, query.trim(), workType, locationMode, location.trim()));
      const primaryFreshJobs = allFreshJobs.filter((job) => isPrimaryRoleMatch(job, query.trim()));
      const relatedFreshJobs = allFreshJobs.filter((job) => !isPrimaryRoleMatch(job, query.trim()));
      const maxWindow = MAX_RESULT_PAGES * safePerPage;
      const mainJobPool = primaryFreshJobs.length
        ? [...primaryFreshJobs, ...relatedFreshJobs]
        : allFreshJobs;
      const diversifiedJobs = diversifyBySource(mainJobPool, maxWindow);
      const total = Math.min(diversifiedJobs.length, maxWindow);
      const start = (safeResultPage - 1) * safePerPage;
      const pageJobs = diversifiedJobs.slice(start, start + safePerPage);
      const pageUrls = new Set(pageJobs.map((job) => job.url).filter(Boolean));
      const similarPool = allFreshJobs.filter((job) => !pageUrls.has(job.url));
      const similarPostings = getSimilarPostings(similarPool.slice(0, maxWindow), pageJobs, query.trim());
      const sourceMix = pageJobs.reduce((acc, job) => {
        const key = sourceKey(job);
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      return NextResponse.json({
        data: pageJobs.map(publicJob),
        similar_postings: similarPostings.map(publicJob),
        meta: {
          portal,
          query: query.trim(),
          location: location.trim(),
          locationMode,
          workType,
          companyFilter,
          sourceMode,
          maxAgeDays: safeMaxAgeDays,
          resultPage: safeResultPage,
          perPage: safePerPage,
          total,
          totalPages: Math.min(MAX_RESULT_PAGES, Math.max(1, Math.ceil(total / safePerPage))),
          similarPerPage: SIMILAR_PER_PAGE,
          storedJobs: storedJobs.length,
          liveJobs: liveJobs.length,
          sources: SEARCH_SOURCES.map((source) => source.label),
          sourceMix,
          directSeedBoards: companyFilter !== "startups" || sourceMode === "known_boards" ? DIRECT_COMPANY_BOARDS.length : 0,
          availableSeedBoards: DIRECT_COMPANY_BOARDS.length,
          scanned_companies: Math.min(Math.max(Number(maxCompanies) || 20, 5), 60),
        },
      });
    }

    browser = await stealthChromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        BROWSER_UA,
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
}
