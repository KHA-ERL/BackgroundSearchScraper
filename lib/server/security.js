import crypto from "crypto";
import dns from "dns/promises";
import net from "net";
import { NextResponse } from "next/server";

export const USER_COOKIE = "bs_user_key";
const COOKIE_AGE = 60 * 60 * 24 * 365;
const DEFAULT_GUEST_PREFIX = "guest";
const rateBuckets = new Map();

function secret() {
  return process.env.SESSION_COOKIE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXTAUTH_SECRET || "dev-session-secret";
}

export function isAuthenticatedUserKey(userKey = "") {
  return String(userKey).startsWith("auth:");
}

export function newGuestUserKey() {
  return `${DEFAULT_GUEST_PREFIX}:${crypto.randomUUID()}`;
}

function signValue(value) {
  return crypto.createHmac("sha256", secret()).update(value).digest("base64url");
}

export function encodeSessionValue(userKey) {
  return `${userKey}.${signValue(userKey)}`;
}

export function decodeSessionValue(raw = "") {
  const value = decodeURIComponent(String(raw || ""));
  const lastDot = value.lastIndexOf(".");
  if (lastDot === -1) {
    if (value.startsWith("auth:") || value.startsWith(`${DEFAULT_GUEST_PREFIX}:`)) return value;
    return "";
  }
  const userKey = value.slice(0, lastDot);
  const signature = value.slice(lastDot + 1);
  const expected = signValue(userKey);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return "";
  return userKey;
}

export function getSessionUserKey(request) {
  const raw = request?.cookies?.get(USER_COOKIE)?.value || "";
  return decodeSessionValue(raw);
}

export function setSessionCookie(response, userKey) {
  response.cookies.set(USER_COOKIE, encodeSessionValue(userKey), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_AGE,
  });
}

export function clearSessionCookie(response) {
  response.cookies.delete(USER_COOKIE);
}

export function authRequiredResponse(message = "Sign in to save this to your workspace.") {
  return NextResponse.json({ error: message, auth_required: true }, { status: 401 });
}

export function requireAuthenticatedUserKey(request) {
  const userKey = getSessionUserKey(request);
  if (!isAuthenticatedUserKey(userKey)) return "";
  return userKey;
}

function clientIp(request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

export function rateLimit(request, { key = "global", limit = 30, windowMs = 60_000, authenticatedLimit = limit * 3 } = {}) {
  const userKey = getSessionUserKey(request);
  const identity = userKey || clientIp(request);
  const bucketKey = `${key}:${identity}`;
  const now = Date.now();
  const max = isAuthenticatedUserKey(userKey) ? authenticatedLimit : limit;
  const bucket = rateBuckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt <= now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  rateBuckets.set(bucketKey, bucket);

  if (bucket.count > max) {
    const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again shortly.", retry_after: retryAfter },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  return null;
}

function isPrivateIp(address = "") {
  const family = net.isIP(address);
  if (!family) return true;
  if (family === 4) {
    const parts = address.split(".").map(Number);
    const [a, b] = parts;
    return (
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      address === "0.0.0.0"
    );
  }
  const lower = address.toLowerCase();
  return lower === "::1" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80") || lower === "::";
}

export async function normalizePublicHttpUrl(value, { allowHttp = true } = {}) {
  const raw = String(value || "").trim();
  if (!raw) throw new Error("URL is required.");
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  const parsed = new URL(withProtocol);

  if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Only http and https URLs are allowed.");
  if (parsed.protocol === "http:" && !allowHttp) throw new Error("Only https URLs are allowed.");
  if (parsed.username || parsed.password) throw new Error("URLs with embedded credentials are not allowed.");

  const hostname = parsed.hostname.toLowerCase();
  if (["localhost", "localhost.localdomain"].includes(hostname) || hostname.endsWith(".local")) {
    throw new Error("Local and private network URLs are not allowed.");
  }

  const literalIp = net.isIP(hostname);
  if (literalIp && isPrivateIp(hostname)) throw new Error("Private network IPs are not allowed.");

  const records = literalIp ? [{ address: hostname }] : await dns.lookup(hostname, { all: true, verbatim: true });
  if (!records.length || records.some((record) => isPrivateIp(record.address))) {
    throw new Error("This URL resolves to a private or blocked network address.");
  }

  parsed.hash = "";
  return parsed.toString();
}

