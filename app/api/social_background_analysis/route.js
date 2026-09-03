import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { chromium } from "../_chromium.js";

const ENV_FILE = path.resolve(process.cwd(), ".env.local");
const MAX_URLS = 12;
const MAX_TEXT_PER_URL = 6000;
const STOPWORDS = new Set([
  "about", "after", "again", "also", "and", "are", "because", "been", "being", "can", "could",
  "does", "for", "from", "has", "have", "her", "his", "how", "into", "its", "more", "not",
  "our", "out", "over", "page", "post", "posts", "profile", "she", "that", "the", "their",
  "them", "then", "there", "these", "this", "those", "through", "was", "were", "what", "when",
  "where", "which", "who", "will", "with", "you", "your",
]);

const SIGNAL_RULES = [
  {
    id: "explicit_threat_language",
    label: "Explicit threat or violence language",
    terms: ["kill", "attack", "shoot", "stab", "bomb", "destroy", "threat", "hurt them", "beat up"],
  },
  {
    id: "fraud_or_scam_language",
    label: "Fraud, scam, or deceptive solicitation language",
    terms: ["guaranteed profit", "wire money", "crypto giveaway", "investment scheme", "double your money", "urgent payment", "fake documents"],
  },
  {
    id: "harassment_or_abuse_language",
    label: "Harassment or abusive language",
    terms: ["dox", "harass", "stalk", "humiliate", "blackmail", "revenge"],
  },
  {
    id: "regulated_goods_language",
    label: "Regulated goods or restricted-sales language",
    terms: ["unlicensed firearm", "fake passport", "counterfeit", "stolen card", "hard drugs", "prescription without"],
  },
];

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const env = {};
  for (const line of fs.readFileSync(ENV_FILE, "utf-8").split("\n")) {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

function getSetting(key, fallback = "") {
  if (process.env[key]) return process.env[key];
  const file = readEnvFile();
  if (file[key]) {
    process.env[key] = file[key];
    return file[key];
  }
  return fallback;
}

function normalizeUrls(input) {
  const raw = Array.isArray(input) ? input : String(input || "").split(/\r?\n|,/);
  const seen = new Set();
  return raw
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
    .filter((value) => {
      try {
        const url = new URL(value);
        const key = url.href.replace(/\/$/, "");
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, MAX_URLS);
}

function detectPlatform(url) {
  const host = new URL(url).hostname.toLowerCase();
  if (host.includes("facebook.com")) return "Facebook";
  if (host.includes("instagram.com")) return "Instagram";
  if (host.includes("linkedin.com")) return "LinkedIn";
  if (host.includes("youtube.com") || host.includes("youtu.be")) return "YouTube";
  if (host.includes("x.com") || host.includes("twitter.com")) return "X / Twitter";
  if (host.includes("tiktok.com")) return "TikTok";
  return host.replace(/^www\./, "");
}

function compactText(text, limit = MAX_TEXT_PER_URL) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/([\n\r\t])/g, " ")
    .trim()
    .slice(0, limit);
}

function extractKeywords(scraped, limit = 18) {
  const counts = new Map();
  const allText = scraped.map((item) => item.text || "").join(" ").toLowerCase();
  const words = allText.match(/[a-z][a-z0-9'-]{3,}/g) || [];
  for (const word of words) {
    const clean = word.replace(/^'+|'+$/g, "");
    if (!STOPWORDS.has(clean) && !/^\d+$/.test(clean)) {
      counts.set(clean, (counts.get(clean) || 0) + 1);
    }
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function extractExcerpt(text, term) {
  const normalized = String(text || "");
  const index = normalized.toLowerCase().indexOf(term.toLowerCase());
  if (index < 0) return "";
  const start = Math.max(0, index - 90);
  const end = Math.min(normalized.length, index + term.length + 140);
  return normalized.slice(start, end).trim();
}

function findPublicSignals(scraped) {
  return SIGNAL_RULES.map((rule) => {
    const matches = [];
    for (const source of scraped) {
      const text = source.text || "";
      const lowered = text.toLowerCase();
      for (const term of rule.terms) {
        if (lowered.includes(term)) {
          matches.push({
            term,
            url: source.url,
            platform: source.platform,
            excerpt: extractExcerpt(text, term),
          });
        }
        if (matches.length >= 5) break;
      }
      if (matches.length >= 5) break;
    }
    return {
      id: rule.id,
      label: rule.label,
      count: matches.length,
      confidence: matches.length > 1 ? "medium" : matches.length === 1 ? "low" : "none",
      matches,
    };
  });
}

function buildEvidenceMetrics(scraped) {
  const scrapedCount = scraped.filter((source) => source.status === "scraped").length;
  const failedCount = scraped.length - scrapedCount;
  const textChars = scraped.reduce((sum, source) => sum + (source.text?.length || 0), 0);
  const platforms = scraped.reduce((acc, source) => {
    acc[source.platform] = (acc[source.platform] || 0) + 1;
    return acc;
  }, {});
  const avgChars = scrapedCount ? Math.round(textChars / scrapedCount) : 0;
  const confidenceScore = Math.max(
    5,
    Math.min(95, Math.round(scrapedCount * 16 + Math.min(textChars / 450, 35) - failedCount * 8))
  );
  const confidenceLabel =
    confidenceScore >= 75 ? "high" :
    confidenceScore >= 45 ? "medium" :
    "low";

  return {
    total_urls: scraped.length,
    scraped_count: scrapedCount,
    failed_count: failedCount,
    text_chars: textChars,
    average_chars_per_scraped_url: avgChars,
    platform_counts: platforms,
    confidence_score: confidenceScore,
    confidence_label: confidenceLabel,
  };
}

function createEvidencePack(scraped) {
  const keywords = extractKeywords(scraped);
  const publicSignals = findPublicSignals(scraped);
  const metrics = buildEvidenceMetrics(scraped);
  const sourceSummaries = scraped.map((source) => ({
    url: source.url,
    platform: source.platform,
    status: source.status,
    title: source.title || "",
    canonical: source.canonical || source.url,
    text_chars: source.text?.length || 0,
    excerpt: compactText(source.text, 700),
    error: source.error || "",
  }));

  return {
    metrics,
    keywords,
    public_signals: publicSignals,
    source_summaries: sourceSummaries,
  };
}

async function scrapeUrlWithContext(context, url, depth) {
  try {
    const page = await context.newPage();
    await page.route("**/*", (route) => {
      const type = route.request().resourceType();
      if (["media", "font", "image"].includes(type)) return route.abort();
      route.continue();
    });

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);

    const scrolls = depth === "deep" ? 4 : 2;
    for (let i = 0; i < scrolls; i++) {
      await page.evaluate(() => window.scrollBy(0, Math.max(700, window.innerHeight * 0.8)));
      await page.waitForTimeout(450);
    }

    const data = await page.evaluate(() => {
      const meta = (name) =>
        document.querySelector(`meta[name="${name}"]`)?.content ||
        document.querySelector(`meta[property="${name}"]`)?.content ||
        "";
      const lines = Array.from(document.querySelectorAll("main, article, h1, h2, h3, p, li, span, a"))
        .map((node) => node.innerText || node.textContent || "")
        .map((text) => text.replace(/\s+/g, " ").trim())
        .filter((text) => text.length > 28 && text.length < 900);
      const uniqueLines = [];
      const seen = new Set();
      for (const line of lines) {
        const key = line.toLowerCase();
        if (!seen.has(key)) {
          seen.add(key);
          uniqueLines.push(line);
        }
        if (uniqueLines.length >= 90) break;
      }
      const visibleLinks = Array.from(document.querySelectorAll("a[href]"))
        .map((link) => ({
          href: link.href,
          text: (link.innerText || link.textContent || "").replace(/\s+/g, " ").trim(),
        }))
        .filter((link) => link.href && link.text.length > 3)
        .slice(0, 30);
      return {
        title: document.title || "",
        description: meta("description") || meta("og:description") || "",
        canonical: document.querySelector('link[rel="canonical"]')?.href || location.href,
        lang: document.documentElement.lang || "",
        headings: Array.from(document.querySelectorAll("h1, h2"))
          .map((node) => node.innerText?.trim())
          .filter(Boolean)
          .slice(0, 12),
        snippets: uniqueLines,
        visibleLinks,
      };
    });

    await page.close();

    return {
      url,
      platform: detectPlatform(url),
      status: "scraped",
      title: data.title,
      description: data.description,
      canonical: data.canonical,
      language: data.lang,
      headings: data.headings,
      links: data.visibleLinks,
      text: compactText([data.description, ...data.headings, ...data.snippets].join("\n")),
    };
  } catch (error) {
    return {
      url,
      platform: detectPlatform(url),
      status: "failed",
      error: error.message || "Unable to scrape URL",
      text: "",
    };
  }
}

async function scrapeUrls(urls, depth) {
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      viewport: { width: 1280, height: 900 },
      locale: "en-US",
      extraHTTPHeaders: { "Accept-Language": "en-US,en;q=0.9" },
    });

    const scraped = [];
    for (const url of urls) {
      scraped.push(await scrapeUrlWithContext(context, url, depth));
    }
    return scraped;
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

function buildPrompt({ subjectName, context, analysisMode, evidencePack }) {
  return `Create an analyst-grade public social-media background brief from the supplied evidence pack.

Subject name or identifier: ${subjectName || "Not provided"}
User context: ${context || "General background review"}
Analysis mode: ${analysisMode || "balanced"}

Guardrails:
- Use only the supplied public evidence. If evidence is thin, say so.
- Do not infer protected traits, medical state, religion, sexuality, ethnicity, nationality, political affiliation, criminality, or employability/visa/policing suitability.
- Do not label the person as dangerous, dishonest, extremist, guilty, safe, unsafe, hireable, or unhireable.
- Do not make psychological diagnoses or fixed personality claims. You may describe observed communication patterns and public content themes.
- Separate observations from interpretation. Include confidence levels, evidence links, and alternative explanations.
- Summarize behavioral/content patterns, public topics, communication style, affiliations explicitly shown, timeline clues, inconsistencies, and follow-up questions.
- For safety-relevant signals, only discuss direct textual evidence from public_signals and keep it framed as "needs human review."

Return markdown with these sections:
1. Executive Summary
2. Evidence Coverage
3. Observed Public Profile
4. Content Themes and Interests
5. Communication Style
6. Public Network and Affiliations
7. Reputation or Safety-Relevant Signals
8. Timeline and Activity Clues
9. Inconsistencies, Gaps, and Confidence
10. Follow-up Checks
11. Evidence Table

Evidence pack:
${JSON.stringify(evidencePack, null, 2)}`;
}

async function callMistral(prompt) {
  const apiKey = getSetting("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured in settings.");
  const model = getSetting("MISTRAL_MODEL", "mistral-large-latest");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error?.message || "Mistral analysis failed.");
  return data.choices?.[0]?.message?.content || "";
}

async function callClaude(prompt) {
  const apiKey = getSetting("CLAUDE_API_KEY");
  if (!apiKey) throw new Error("CLAUDE_API_KEY is not configured in settings.");
  const model = getSetting("CLAUDE_MODEL", "claude-3-5-sonnet-latest");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 3000,
      temperature: 0.1,
      messages: [{ role: "user", content: prompt }],
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Claude analysis failed.");
  return data.content?.map((part) => part.text || "").join("\n").trim() || "";
}

async function callCodex(prompt) {
  const apiKey = getSetting("CODEX_API_KEY");
  if (!apiKey) throw new Error("CODEX_API_KEY is not configured in settings.");
  const model = getSetting("CODEX_MODEL", "gpt-5-codex");
  const baseUrl = getSetting("CODEX_BASE_URL", "https://api.openai.com/v1/responses");
  const isResponses = baseUrl.includes("/responses");
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(
      isResponses
        ? { model, input: prompt, temperature: 0.1, max_output_tokens: 3000 }
        : { model, temperature: 0.1, messages: [{ role: "user", content: prompt }] }
    ),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Codex/OpenAI analysis failed.");
  if (isResponses) {
    return data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text || "").join("\n").trim() || "";
  }
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const urls = normalizeUrls(body.urls || body.urlInput);
    const provider = String(body.provider || "mistral").toLowerCase();
    const depth = body.depth === "deep" ? "deep" : "standard";
    const analysisMode = ["balanced", "risk", "reputation", "consistency"].includes(body.analysisMode)
      ? body.analysisMode
      : "balanced";

    if (!urls.length) {
      return NextResponse.json({ error: "Provide at least one valid social media URL." }, { status: 400 });
    }
    if (!["mistral", "claude", "codex"].includes(provider)) {
      return NextResponse.json({ error: "provider must be mistral, claude, or codex." }, { status: 400 });
    }

    const scraped = await scrapeUrls(urls, depth);

    const evidencePack = createEvidencePack(scraped);
    const prompt = buildPrompt({
      subjectName: body.subjectName,
      context: body.context,
      analysisMode,
      evidencePack,
    });

    const analysis =
      provider === "claude" ? await callClaude(prompt) :
      provider === "codex" ? await callCodex(prompt) :
      await callMistral(prompt);

    return NextResponse.json({
      success: true,
      provider,
      urls,
      scraped,
      evidence_pack: evidencePack,
      analysis,
      generated_at: new Date().toISOString(),
      notice: "Analysis is based only on scraped public content and should be reviewed by a human before any consequential use.",
    });
  } catch (error) {
    console.error("Social background analysis error:", error);
    return NextResponse.json({ error: error.message || "Failed to analyze social background." }, { status: 500 });
  }
}
