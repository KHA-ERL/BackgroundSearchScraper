import { NextResponse } from "next/server";
import { getSessionUserKey, isAuthenticatedUserKey } from "./security";
import { isDatabaseConfigured, supabaseRequest } from "./supabaseRest";

function splitEnvList(value = "") {
  return String(value || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

export function configuredAdminEmails() {
  return splitEnvList(process.env.ADMIN_EMAILS);
}

export function configuredAdminUserKeys() {
  return splitEnvList(process.env.ADMIN_USER_KEYS);
}

export async function getAdminUser(request) {
  const userKey = getSessionUserKey(request);
  if (!isAuthenticatedUserKey(userKey)) {
    return {
      ok: false,
      status: 401,
      response: NextResponse.json({ error: "Sign in with an admin account.", auth_required: true }, { status: 401 }),
    };
  }

  const adminUserKeys = configuredAdminUserKeys();
  if (adminUserKeys.includes(userKey.toLowerCase())) {
    return { ok: true, user: { user_key: userKey, access: "user_key" } };
  }

  const adminEmails = configuredAdminEmails();
  if (!adminEmails.length) {
    return {
      ok: false,
      status: 403,
      response: NextResponse.json(
        { error: "Admin access is not configured. Add ADMIN_EMAILS to your environment." },
        { status: 403 }
      ),
    };
  }

  if (!isDatabaseConfigured()) {
    return {
      ok: false,
      status: 503,
      response: NextResponse.json(
        { error: "Database is required to verify admin email access." },
        { status: 503 }
      ),
    };
  }

  const rows = await supabaseRequest("app_users", {
    query: `?user_key=eq.${encodeURIComponent(userKey)}&select=user_key,email,display_name,auth_provider&limit=1`,
  });
  const user = rows?.[0];
  const email = String(user?.email || "").toLowerCase();

  if (!email || !adminEmails.includes(email)) {
    return {
      ok: false,
      status: 403,
      response: NextResponse.json({ error: "You do not have admin access." }, { status: 403 }),
    };
  }

  return { ok: true, user: { ...user, access: "email" } };
}
