const DEFAULT_USER_KEY = "anonymous";

function config() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || "";
  return { url: url.replace(/\/$/, ""), key };
}

export function isDatabaseConfigured() {
  const { url, key } = config();
  return Boolean(url && key);
}

export function getUserKey(request) {
  const cookie = request?.headers?.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)bs_user_key=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : DEFAULT_USER_KEY;
}

async function request(table, options = {}) {
  const { url, key } = config();
  if (!url || !key) {
    const error = new Error("Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.local.");
    error.code = "DB_NOT_CONFIGURED";
    throw error;
  }

  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
    Prefer: options.prefer || "return=representation",
    ...(options.headers || {}),
  };

  const res = await fetch(`${url}/rest/v1/${table}${options.query || ""}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `Supabase request failed with ${res.status}`);
  }

  if (res.status === 204) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function supabaseRequest(table, options = {}) {
  return request(table, options);
}

export async function upsertUser(userKey, metadata = {}) {
  const rows = await request("app_users", {
    method: "POST",
    query: "?on_conflict=user_key",
    body: [{
      user_key: userKey,
      ...(metadata.email !== undefined ? { email: metadata.email } : {}),
      ...(metadata.displayName !== undefined ? { display_name: metadata.displayName } : {}),
      ...(metadata.authProvider !== undefined ? { auth_provider: metadata.authProvider } : {}),
    }],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return rows?.[0] || null;
}

export async function getPreference(userKey, key) {
  const rows = await request("user_preferences", {
    query: `?user_key=eq.${encodeURIComponent(userKey)}&key=eq.${encodeURIComponent(key)}&select=value&limit=1`,
  });
  return rows?.[0]?.value ?? null;
}

export async function setPreference(userKey, key, value) {
  await upsertUser(userKey);
  const rows = await request("user_preferences", {
    method: "POST",
    query: "?on_conflict=user_key,key",
    body: [{ user_key: userKey, key, value }],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return rows?.[0] || null;
}

export async function getHistory(userKey, apiPath) {
  const rows = await request("scrape_history", {
    query: `?user_key=eq.${encodeURIComponent(userKey)}&api_path=eq.${encodeURIComponent(apiPath)}&select=rows,updated_at&limit=1`,
  });
  return rows?.[0] || null;
}

export async function saveHistory(userKey, apiPath, rows) {
  await upsertUser(userKey);
  const saved = await request("scrape_history", {
    method: "POST",
    query: "?on_conflict=user_key,api_path",
    body: [{ user_key: userKey, api_path: apiPath, rows }],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return saved?.[0] || null;
}

export async function logRun({ userKey, toolName, apiPath, status = "success", rowCount = 0, metadata = {} }) {
  await upsertUser(userKey);
  const rows = await request("scrape_runs", {
    method: "POST",
    body: [{ user_key: userKey, tool_name: toolName, api_path: apiPath, status, row_count: rowCount, metadata }],
  });
  return rows?.[0] || null;
}

export async function getRunStats(userKey) {
  const today = new Date().toISOString().slice(0, 10);
  const todayRows = await request("scrape_runs", {
    query: `?user_key=eq.${encodeURIComponent(userKey)}&created_at=gte.${today}T00:00:00.000Z&select=tool_name,row_count,status`,
  });
  const allRows = await request("scrape_runs", {
    query: `?user_key=eq.${encodeURIComponent(userKey)}&select=tool_name,row_count,status`,
  });

  const tools = {};
  for (const row of todayRows || []) {
    if (!row.tool_name) continue;
    tools[row.tool_name] = (tools[row.tool_name] || 0) + 1;
  }
  const topTool = Object.entries(tools).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

  return {
    today: todayRows?.length || 0,
    total: allRows?.length || 0,
    topTool,
    tools,
  };
}

export async function getCache(namespace, cacheKey) {
  const now = encodeURIComponent(new Date().toISOString());
  const rows = await request("scrape_cache", {
    query: `?namespace=eq.${encodeURIComponent(namespace)}&cache_key=eq.${encodeURIComponent(cacheKey)}&or=(expires_at.is.null,expires_at.gt.${now})&select=payload&limit=1`,
  });
  return rows?.[0]?.payload ?? null;
}

export async function setCache(namespace, cacheKey, payload, ttlSeconds = 86400) {
  const expiresAt = ttlSeconds ? new Date(Date.now() + ttlSeconds * 1000).toISOString() : null;
  const rows = await request("scrape_cache", {
    method: "POST",
    query: "?on_conflict=namespace,cache_key",
    body: [{ namespace, cache_key: cacheKey, payload, expires_at: expiresAt }],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return rows?.[0] || null;
}

export async function getBrowserSession(provider, userKey = DEFAULT_USER_KEY) {
  const rows = await request("browser_sessions", {
    query: `?provider=eq.${encodeURIComponent(provider)}&user_key=eq.${encodeURIComponent(userKey)}&select=storage_state&limit=1`,
  });
  return rows?.[0]?.storage_state ?? null;
}

export async function setBrowserSession(provider, storageState, userKey = DEFAULT_USER_KEY) {
  await upsertUser(userKey);
  const rows = await request("browser_sessions", {
    method: "POST",
    query: "?on_conflict=provider,user_key",
    body: [{ provider, user_key: userKey, storage_state: storageState }],
    prefer: "resolution=merge-duplicates,return=representation",
  });
  return rows?.[0] || null;
}

export async function deleteBrowserSession(provider, userKey = DEFAULT_USER_KEY) {
  return request("browser_sessions", {
    method: "DELETE",
    query: `?provider=eq.${encodeURIComponent(provider)}&user_key=eq.${encodeURIComponent(userKey)}`,
    prefer: "return=minimal",
  });
}
