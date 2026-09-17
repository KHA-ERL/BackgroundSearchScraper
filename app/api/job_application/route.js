import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ENV_FILE = path.resolve(process.cwd(), ".env.local");

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

function trimText(value = "", limit = 9000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, limit);
}

function normalizeUrls(input) {
  const raw = Array.isArray(input) ? input : String(input || "").split(/\r?\n|,/);
  return raw
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .map((value) => (/^https?:\/\//i.test(value) ? value : `https://${value}`))
    .filter((value) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    })
    .slice(0, 12);
}

function extractTokens(text = "", limit = 18) {
  const stop = new Set([
    "about", "also", "and", "are", "can", "for", "from", "have", "into", "job", "more", "our",
    "role", "that", "the", "their", "this", "will", "with", "you", "your",
  ]);
  const counts = new Map();
  trimText(text, 12000)
    .toLowerCase()
    .split(/[^a-z0-9+#.]+/)
    .map((token) => token.replace(/^[^a-z0-9+#]+|[^a-z0-9+#]+$/g, ""))
    .filter((token) => token.length > 2 && !stop.has(token) && !/^\d+$/.test(token))
    .forEach((token) => counts.set(token, (counts.get(token) || 0) + 1));
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([token]) => token);
}

function buildPrompt({ job, profile, provider }) {
  const jobText = [
    job?.title,
    job?.company,
    job?.location,
    job?.work_type,
    job?.salary,
    job?.posted,
    job?.source,
    job?.url,
    job?.description,
    Array.isArray(job?.resume_keywords) ? job.resume_keywords.join(", ") : "",
  ].filter(Boolean).join("\n");

  return `You are preparing a truthful, human-reviewable job application pack.

Core principle:
Discover the strongest truthful overlap between the candidate's actual evidence and the job, then present that evidence exceptionally well. Never invent employment, qualifications, technologies, responsibilities, metrics, certifications, degrees, dates, clients, or achievements.

Typography and style:
- Plain professional English.
- Use normal ASCII punctuation.
- Do not include AI watermarks, disclaimers, decorative symbols, emoji, em dashes, or phrases like "AI-generated".
- The writing should look manually typed by a careful human.
- Use concise hyphen bullets only where bullets help.

Candidate profile:
Name: ${profile?.name || "Not provided"}
Preferred title: ${profile?.targetTitle || "Infer only if supported by the CV"}
Portfolio and social links:
${normalizeUrls(profile?.links).join("\n") || "None provided"}

Candidate CV / evidence:
${trimText(profile?.cvText, 14000) || "No CV text supplied. If evidence is missing, say what is missing rather than inventing it."}

Job posting:
${trimText(jobText, 12000)}

Return markdown with these exact sections:
1. JOB FIT
State Strong, Moderate, or Stretch, with concise reasons.

2. IMPORTANT GAPS
Only meaningful gaps. Say "No major verified gaps from the supplied evidence" if appropriate.

3. CV STRATEGY
Explain what to emphasize, reduce, or reorder for this role.

4. CUSTOM CV
Draft an application-ready CV using only supplied candidate evidence. Preserve dates and employers if present. If a section lacks evidence, omit it rather than inventing.

5. COVER LETTER
One page or shorter, specific to the role and company.

6. APPLICATION NOTES
Include resume keywords, one recruiter message, and application form answer notes.

Provider selected by user: ${provider}.`;
}

function fallbackApplication({ job, profile }) {
  const jobKeywords = extractTokens(`${job?.title || ""} ${job?.description || ""} ${(job?.resume_keywords || []).join(" ")}`);
  const cvKeywords = extractTokens(profile?.cvText || "");
  const overlap = jobKeywords.filter((token) => cvKeywords.includes(token)).slice(0, 8);
  const gaps = jobKeywords.filter((token) => !cvKeywords.includes(token)).slice(0, 8);
  const fit = overlap.length >= 5 ? "Strong" : overlap.length >= 3 ? "Moderate" : "Stretch";

  return `1. JOB FIT
${fit}

This estimate is based only on the supplied CV text and job data. Strongest visible overlap: ${overlap.join(", ") || "not enough verified overlap supplied"}.

2. IMPORTANT GAPS
${gaps.length ? gaps.map((gap) => `- ${gap}`).join("\n") : "No major verified gaps from the supplied evidence."}

3. CV STRATEGY
- Lead with a title that matches the role only if the CV supports it.
- Move evidence related to ${jobKeywords.slice(0, 6).join(", ")} higher in the CV.
- Keep unrelated tools and projects lower so the recruiter sees the strongest match first.

4. CUSTOM CV
${profile?.cvText ? trimText(profile.cvText, 5000) : "Add CV text or upload a text-readable CV to generate a full tailored version."}

5. COVER LETTER
Dear Hiring Team,

I am interested in the ${job?.title || "open role"}${job?.company ? ` at ${job.company}` : ""}. Based on the supplied profile, the strongest relevant evidence is ${overlap.join(", ") || "not yet clear from the uploaded materials"}. I would tailor my application around that overlap and keep the focus on specific, verifiable work rather than broad claims.

Thank you for your consideration.

6. APPLICATION NOTES
- Resume keywords: ${jobKeywords.slice(0, 10).join(", ") || "Add a fuller job description to extract keywords."}
- Recruiter message: Hi${job?.company ? ` ${job.company} team` : ""}, I am interested in the ${job?.title || "role"} and have relevant experience in ${overlap.slice(0, 4).join(", ") || "the areas described in my CV"}. I would appreciate the chance to be considered.
- Form notes: Answer with verified examples from the uploaded CV and portfolio links. Do not claim tools, dates, degrees, or metrics that are not present in the supplied evidence.`;
}

async function callMistral(prompt) {
  const apiKey = getSetting("MISTRAL_API_KEY");
  if (!apiKey) throw new Error("MISTRAL_API_KEY is not configured.");
  const model = getSetting("MISTRAL_MODEL", "mistral-large-latest");
  const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, temperature: 0.15, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.message || data?.error?.message || "Mistral application generation failed.");
  return data.choices?.[0]?.message?.content || "";
}

async function callClaude(prompt) {
  const apiKey = getSetting("CLAUDE_API_KEY");
  if (!apiKey) throw new Error("CLAUDE_API_KEY is not configured.");
  const model = getSetting("CLAUDE_MODEL", "claude-3-5-sonnet-latest");
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({ model, max_tokens: 4200, temperature: 0.15, messages: [{ role: "user", content: prompt }] }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Claude application generation failed.");
  return data.content?.map((part) => part.text || "").join("\n").trim() || "";
}

async function callCodex(prompt) {
  const apiKey = getSetting("CODEX_API_KEY");
  if (!apiKey) throw new Error("CODEX_API_KEY is not configured.");
  const model = getSetting("CODEX_MODEL", "gpt-5-codex");
  const baseUrl = getSetting("CODEX_BASE_URL", "https://api.openai.com/v1/responses");
  const isResponses = baseUrl.includes("/responses");
  const res = await fetch(baseUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify(
      isResponses
        ? { model, input: prompt, temperature: 0.15, max_output_tokens: 4200 }
        : { model, temperature: 0.15, messages: [{ role: "user", content: prompt }] }
    ),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Codex/OpenAI application generation failed.");
  if (isResponses) return data.output_text || data.output?.flatMap((item) => item.content || []).map((part) => part.text || "").join("\n").trim() || "";
  return data.choices?.[0]?.message?.content || "";
}

export async function POST(request) {
  try {
    const body = await request.json();
    const provider = ["mistral", "claude", "codex", "template"].includes(String(body.provider || "").toLowerCase())
      ? String(body.provider || "").toLowerCase()
      : "mistral";
    const job = body.job || {};
    const profile = body.profile || {};
    if (!job.title && !job.description) {
      return NextResponse.json({ error: "Provide a selected job with a title or description." }, { status: 400 });
    }

    const prompt = buildPrompt({ job, profile, provider });
    let application = "";
    let usedProvider = provider;
    try {
      application =
        provider === "claude" ? await callClaude(prompt) :
        provider === "codex" ? await callCodex(prompt) :
        provider === "template" ? fallbackApplication({ job, profile }) :
        await callMistral(prompt);
    } catch (error) {
      usedProvider = "template";
      application = fallbackApplication({ job, profile });
    }

    return NextResponse.json({
      success: true,
      provider: usedProvider,
      application,
      generated_at: new Date().toISOString(),
      notice: "Review before submitting. The generator is constrained to supplied evidence and should not invent credentials or experience.",
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to prepare application." }, { status: 500 });
  }
}
