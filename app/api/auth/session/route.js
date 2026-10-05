import { NextResponse } from "next/server";
import crypto from "crypto";
import { auditLog, isDatabaseConfigured, supabaseRequest, upsertUser } from "@/lib/server/supabaseRest";
import {
  clearSessionCookie,
  getSessionUserKey,
  isAuthenticatedUserKey,
  rateLimit,
  setSessionCookie,
} from "@/lib/server/security";

function normalizeUsername(value = "") {
  return String(value || "").trim().toLowerCase().replace(/[^a-z0-9_.@-]/g, "").slice(0, 80);
}

function normalizeEmail(value = "") {
  return String(value || "").trim().toLowerCase().slice(0, 160);
}

function stableLocalUserKey(username) {
  return `auth:local:${username}`;
}

function stableFirebaseUserKey(uid) {
  return `auth:firebase:${uid}`;
}

function hashPassword(password, salt = crypto.randomBytes(16).toString("hex")) {
  const hash = crypto.pbkdf2Sync(String(password), salt, 210000, 32, "sha256").toString("hex");
  return { hash, salt };
}

function timingSafeEqual(a = "", b = "") {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function decodeJwtPart(value) {
  return JSON.parse(Buffer.from(value.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8"));
}

async function verifyFirebaseToken(idToken) {
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || "";
  if (!projectId) throw new Error("Firebase project id is not configured.");
  const [headerRaw, payloadRaw, signatureRaw] = String(idToken || "").split(".");
  if (!headerRaw || !payloadRaw || !signatureRaw) throw new Error("Invalid Firebase token.");
  const header = decodeJwtPart(headerRaw);
  const payload = decodeJwtPart(payloadRaw);
  if (payload.aud !== projectId) throw new Error("Firebase token audience mismatch.");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Firebase token issuer mismatch.");
  if (!payload.sub || payload.exp * 1000 < Date.now()) throw new Error("Firebase token is expired.");

  const certsRes = await fetch("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", {
    cache: "force-cache",
  });
  const certs = await certsRes.json();
  const cert = certs[header.kid];
  if (!cert) throw new Error("Firebase signing certificate not found.");
  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerRaw}.${payloadRaw}`);
  verifier.end();
  const valid = verifier.verify(cert, signatureRaw.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  if (!valid) throw new Error("Firebase token signature is invalid.");
  return payload;
}

async function migrateAnonymousPreferences(fromUserKey, toUserKey) {
  if (!isDatabaseConfigured() || !fromUserKey || !toUserKey || fromUserKey === toUserKey || isAuthenticatedUserKey(fromUserKey)) return;
  try {
    const rows = await supabaseRequest("user_preferences", {
      query: `?user_key=eq.${encodeURIComponent(fromUserKey)}&select=key,value`,
    });
    for (const row of rows || []) {
      await supabaseRequest("user_preferences", {
        method: "POST",
        query: "?on_conflict=user_key,key",
        body: [{ user_key: toUserKey, key: row.key, value: row.value }],
        prefer: "resolution=ignore-duplicates,return=minimal",
      });
    }
  } catch {}
}

function publicUser(userKey, extra = {}) {
  return {
    authenticated: Boolean(userKey?.startsWith("auth:")),
    user_key: userKey || "anonymous",
    ...extra,
    database_configured: isDatabaseConfigured(),
    firebase_configured: Boolean(process.env.NEXT_PUBLIC_FIREBASE_API_KEY && process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  };
}

export async function GET(request) {
  const userKey = getSessionUserKey(request);
  if (isDatabaseConfigured() && isAuthenticatedUserKey(userKey)) {
    try {
      const rows = await supabaseRequest("app_users", {
        query: `?user_key=eq.${encodeURIComponent(userKey)}&select=user_key,email,display_name,auth_provider&limit=1`,
      });
      const user = rows?.[0];
      if (user) {
        return NextResponse.json(publicUser(user.user_key, {
          email: user.email,
          display_name: user.display_name,
          auth_provider: user.auth_provider,
        }));
      }
    } catch {}
  }
  return NextResponse.json(publicUser(userKey || "anonymous"));
}

export async function POST(request) {
  try {
    const limited = rateLimit(request, { key: "auth_session", limit: 8, authenticatedLimit: 12, windowMs: 60_000 });
    if (limited) return limited;
    const body = await request.json();
    const action = String(body.action || "login").toLowerCase();
    const provider = String(body.provider || "password").toLowerCase();
    const previousUserKey = getSessionUserKey(request);

    if (provider === "firebase") {
      const payload = await verifyFirebaseToken(body.idToken);
      const userKey = stableFirebaseUserKey(payload.user_id || payload.sub);
      const email = normalizeEmail(payload.email || "");
      const displayName = String(payload.name || email || "Google user").trim();
      if (isDatabaseConfigured()) {
        await upsertUser(userKey, { email, displayName, authProvider: "google" });
        await migrateAnonymousPreferences(previousUserKey, userKey);
        await auditLog({ userKey, action: "login", resource: "auth", metadata: { provider: "google" } }).catch(() => {});
      }
      const res = NextResponse.json(publicUser(userKey, { email, display_name: displayName, auth_provider: "google" }));
      setSessionCookie(res, userKey);
      return res;
    }

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is required for username/password accounts." }, { status: 503 });
    }

    const username = normalizeUsername(body.username || body.email);
    const password = String(body.password || "");
    if (!username || password.length < 8) {
      return NextResponse.json({ error: "Username/email and a password of at least 8 characters are required." }, { status: 400 });
    }

    if (action === "register") {
      const userKey = stableLocalUserKey(username);
      const email = normalizeEmail(body.email || (username.includes("@") ? username : ""));
      const displayName = String(body.displayName || body.name || username).trim();
      const existing = await supabaseRequest("auth_accounts", {
        query: `?username=eq.${encodeURIComponent(username)}&select=username&limit=1`,
      });
      if (existing?.[0]) {
        return NextResponse.json({ error: "That username or email already has an account." }, { status: 409 });
      }
      const { hash, salt } = hashPassword(password);
      await upsertUser(userKey, { email, displayName, authProvider: "password" });
      await supabaseRequest("auth_accounts", {
        method: "POST",
        query: "?on_conflict=username",
        body: [{ username, user_key: userKey, email, display_name: displayName, password_hash: hash, password_salt: salt }],
        prefer: "resolution=merge-duplicates,return=representation",
      });
      await migrateAnonymousPreferences(previousUserKey, userKey);
      await auditLog({ userKey, action: "register", resource: "auth", metadata: { provider: "password" } }).catch(() => {});
      const res = NextResponse.json(publicUser(userKey, { email, display_name: displayName, auth_provider: "password" }));
      setSessionCookie(res, userKey);
      return res;
    }

    const rows = await supabaseRequest("auth_accounts", {
      query: `?username=eq.${encodeURIComponent(username)}&select=username,user_key,email,display_name,password_hash,password_salt&limit=1`,
    });
    const account = rows?.[0];
    if (!account) return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    const { hash } = hashPassword(password, account.password_salt);
    if (!timingSafeEqual(hash, account.password_hash)) {
      return NextResponse.json({ error: "Invalid username or password." }, { status: 401 });
    }
    await upsertUser(account.user_key, { email: account.email, displayName: account.display_name, authProvider: "password" });
    await migrateAnonymousPreferences(previousUserKey, account.user_key);
    await auditLog({ userKey: account.user_key, action: "login", resource: "auth", metadata: { provider: "password" } }).catch(() => {});
    const res = NextResponse.json(publicUser(account.user_key, {
      email: account.email,
      display_name: account.display_name,
      auth_provider: "password",
    }));
    setSessionCookie(res, account.user_key);
    return res;
  } catch (error) {
    return NextResponse.json({ error: error.message || "Authentication failed." }, { status: 500 });
  }
}

export async function DELETE(request) {
  const userKey = getSessionUserKey(request);
  if (isAuthenticatedUserKey(userKey)) {
    await auditLog({ userKey, action: "logout", resource: "auth" }).catch(() => {});
  }
  const res = NextResponse.json(publicUser("anonymous"));
  clearSessionCookie(res);
  return res;
}
