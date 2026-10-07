import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { authRequiredResponse, requireAuthenticatedUserKey, rateLimit } from "@/lib/server/security";

const ENV_FILE = path.resolve(process.cwd(), ".env.local");

function readEnvFile() {
  if (!fs.existsSync(ENV_FILE)) return {};
  const lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
  const env = {};
  for (const line of lines) {
    const m = line.match(/^([^#\s][^=]*)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim();
  }
  return env;
}

function writeEnvFile(env) {
  // Preserve comments and blank lines, only update matching keys
  let content = "";
  if (fs.existsSync(ENV_FILE)) {
    const lines = fs.readFileSync(ENV_FILE, "utf-8").split("\n");
    const written = new Set();
    const updated = lines.map((line) => {
      const m = line.match(/^([^#\s][^=]*)=(.*)/);
      if (m && env[m[1].trim()] !== undefined) {
        written.add(m[1].trim());
        return `${m[1].trim()}=${env[m[1].trim()]}`;
      }
      return line;
    });
    // Append any new keys not already in file
    for (const [k, v] of Object.entries(env)) {
      if (!written.has(k)) updated.push(`${k}=${v}`);
    }
    content = updated.join("\n");
  } else {
    content = Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n";
  }
  fs.writeFileSync(ENV_FILE, content);
}

export async function GET(request) {
  const userKey = requireAuthenticatedUserKey(request);
  if (!userKey) return authRequiredResponse("Sign in to view profile settings.");

  const file = readEnvFile();

  // process.env takes precedence (set by a previous POST this session)
  const dns_mode = (process.env.DNS_MODE || file.DNS_MODE || "vpn").toLowerCase();
  const bright_data_enabled =
    (process.env.BRIGHT_DATA_ENABLED || file.BRIGHT_DATA_ENABLED || "false").toLowerCase() === "true";
  const bright_data_proxy =
    process.env.BRIGHT_DATA_PROXY || file.BRIGHT_DATA_PROXY || "http://brd.superproxy.io:22225";
  const bright_data_username =
    process.env.BRIGHT_DATA_USERNAME || file.BRIGHT_DATA_USERNAME || "";
  // Never return raw passwords — return boolean flags instead
  const bright_data_password_set = !!(
    process.env.BRIGHT_DATA_PASSWORD || file.BRIGHT_DATA_PASSWORD
  );
  const listclean_api_key_set = !!(
    process.env.LISTCLEAN_API_KEY || file.LISTCLEAN_API_KEY
  );
  const mistral_api_key_set = !!(
    process.env.MISTRAL_API_KEY || file.MISTRAL_API_KEY
  );
  const mistral_model = process.env.MISTRAL_MODEL || file.MISTRAL_MODEL || "mistral-large-latest";
  const claude_api_key_set = !!(
    process.env.CLAUDE_API_KEY || file.CLAUDE_API_KEY
  );
  const codex_api_key_set = !!(
    process.env.CODEX_API_KEY || file.CODEX_API_KEY
  );
  const claude_model = process.env.CLAUDE_MODEL || file.CLAUDE_MODEL || "claude-3-5-sonnet-latest";
  const codex_model = process.env.CODEX_MODEL || file.CODEX_MODEL || "gpt-5-codex";
  const codex_base_url = process.env.CODEX_BASE_URL || file.CODEX_BASE_URL || "https://api.openai.com/v1/responses";
  const wa_security_secret_set = !!(
    process.env.WA_SECURITY_SECRET || file.WA_SECURITY_SECRET
  );
  const webhook_url = process.env.WEBHOOK_URL || file.WEBHOOK_URL || "";

  return NextResponse.json({
    dns_mode,
    bright_data_enabled,
    bright_data_proxy,
    bright_data_username,
    bright_data_password_set,
    listclean_api_key_set,
    mistral_api_key_set,
    mistral_model,
    claude_api_key_set,
    claude_model,
    codex_api_key_set,
    codex_model,
    codex_base_url,
    wa_security_secret_set,
    webhook_url,
  });
}

export async function POST(request) {
  const userKey = requireAuthenticatedUserKey(request);
  if (!userKey) return authRequiredResponse("Sign in to update profile settings.");

  const limited = rateLimit(request, { key: "settings", limit: 12, authenticatedLimit: 40, windowMs: 60_000 });
  if (limited) return limited;

  const body = await request.json();
  const file = readEnvFile();

  // ── DNS Mode ────────────────────────────────────────────────────────────────
  if (body.dns_mode !== undefined) {
    const dns_mode = (body.dns_mode || "").toLowerCase();
    if (!["vpn", "doh"].includes(dns_mode)) {
      return NextResponse.json({ error: "dns_mode must be 'vpn' or 'doh'" }, { status: 400 });
    }
    process.env.DNS_MODE = dns_mode;
    file.DNS_MODE = dns_mode;
  }

  // ── Bright Data Web Unlocker ─────────────────────────────────────────────
  if (body.bright_data_enabled !== undefined) {
    const val = String(body.bright_data_enabled).toLowerCase() === "true" ? "true" : "false";
    process.env.BRIGHT_DATA_ENABLED = val;
    file.BRIGHT_DATA_ENABLED = val;
  }
  if (body.bright_data_proxy !== undefined) {
    process.env.BRIGHT_DATA_PROXY = body.bright_data_proxy;
    file.BRIGHT_DATA_PROXY = body.bright_data_proxy;
  }
  if (body.bright_data_username !== undefined) {
    process.env.BRIGHT_DATA_USERNAME = body.bright_data_username;
    file.BRIGHT_DATA_USERNAME = body.bright_data_username;
  }
  if (body.bright_data_password !== undefined && body.bright_data_password !== "") {
    process.env.BRIGHT_DATA_PASSWORD = body.bright_data_password;
    file.BRIGHT_DATA_PASSWORD = body.bright_data_password;
  }

  // ── ListClean API Key ────────────────────────────────────────────────────
  if (body.listclean_api_key !== undefined && body.listclean_api_key !== "") {
    process.env.LISTCLEAN_API_KEY = body.listclean_api_key;
    file.LISTCLEAN_API_KEY = body.listclean_api_key;
  }

  // ── Mistral API Key ──────────────────────────────────────────────────────
  if (body.mistral_api_key !== undefined && body.mistral_api_key !== "") {
    process.env.MISTRAL_API_KEY = body.mistral_api_key;
    file.MISTRAL_API_KEY = body.mistral_api_key;
  }
  if (body.mistral_model !== undefined) {
    process.env.MISTRAL_MODEL = body.mistral_model;
    file.MISTRAL_MODEL = body.mistral_model;
  }
  if (body.claude_api_key !== undefined && body.claude_api_key !== "") {
    process.env.CLAUDE_API_KEY = body.claude_api_key;
    file.CLAUDE_API_KEY = body.claude_api_key;
  }
  if (body.claude_model !== undefined) {
    process.env.CLAUDE_MODEL = body.claude_model;
    file.CLAUDE_MODEL = body.claude_model;
  }
  if (body.codex_api_key !== undefined && body.codex_api_key !== "") {
    process.env.CODEX_API_KEY = body.codex_api_key;
    file.CODEX_API_KEY = body.codex_api_key;
  }
  if (body.codex_model !== undefined) {
    process.env.CODEX_MODEL = body.codex_model;
    file.CODEX_MODEL = body.codex_model;
  }
  if (body.codex_base_url !== undefined) {
    process.env.CODEX_BASE_URL = body.codex_base_url;
    file.CODEX_BASE_URL = body.codex_base_url;
  }

  // ── WA Security Secret Key ──────────────────────────────────────────────
  if (body.wa_security_secret !== undefined && body.wa_security_secret !== "") {
    process.env.WA_SECURITY_SECRET = body.wa_security_secret;
    file.WA_SECURITY_SECRET = body.wa_security_secret;
  }

  // ── Webhook URL ──────────────────────────────────────────────────────────
  if (body.webhook_url !== undefined) {
    process.env.WEBHOOK_URL = body.webhook_url;
    file.WEBHOOK_URL = body.webhook_url;
  }

  writeEnvFile(file);

  // Return the updated state (same shape as GET)
  const dns_mode = (process.env.DNS_MODE || "vpn").toLowerCase();
  const bright_data_enabled =
    (process.env.BRIGHT_DATA_ENABLED || "false").toLowerCase() === "true";
  const bright_data_proxy =
    process.env.BRIGHT_DATA_PROXY || "http://brd.superproxy.io:22225";
  const bright_data_username = process.env.BRIGHT_DATA_USERNAME || "";
  const bright_data_password_set = !!(process.env.BRIGHT_DATA_PASSWORD || file.BRIGHT_DATA_PASSWORD);
  const listclean_api_key_set = !!(process.env.LISTCLEAN_API_KEY || file.LISTCLEAN_API_KEY);
  const mistral_api_key_set = !!(process.env.MISTRAL_API_KEY || file.MISTRAL_API_KEY);
  const mistral_model = process.env.MISTRAL_MODEL || file.MISTRAL_MODEL || "mistral-large-latest";
  const claude_api_key_set = !!(process.env.CLAUDE_API_KEY || file.CLAUDE_API_KEY);
  const codex_api_key_set = !!(process.env.CODEX_API_KEY || file.CODEX_API_KEY);
  const claude_model = process.env.CLAUDE_MODEL || file.CLAUDE_MODEL || "claude-3-5-sonnet-latest";
  const codex_model = process.env.CODEX_MODEL || file.CODEX_MODEL || "gpt-5-codex";
  const codex_base_url = process.env.CODEX_BASE_URL || file.CODEX_BASE_URL || "https://api.openai.com/v1/responses";
  const wa_security_secret_set = !!(process.env.WA_SECURITY_SECRET || file.WA_SECURITY_SECRET);
  const webhook_url = process.env.WEBHOOK_URL || "";

  return NextResponse.json({
    dns_mode,
    bright_data_enabled,
    bright_data_proxy,
    bright_data_username,
    bright_data_password_set,
    listclean_api_key_set,
    mistral_api_key_set,
    mistral_model,
    claude_api_key_set,
    claude_model,
    codex_api_key_set,
    codex_model,
    codex_base_url,
    wa_security_secret_set,
    webhook_url,
  });
}
