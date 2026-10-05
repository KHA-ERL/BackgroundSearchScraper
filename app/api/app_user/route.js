import { NextResponse } from "next/server";
import { isDatabaseConfigured, upsertUser } from "../../../lib/server/supabaseRest";
import { getSessionUserKey, newGuestUserKey, setSessionCookie } from "../../../lib/server/security";

export async function GET(request) {
  let userKey = getSessionUserKey(request);
  const created = !userKey;
  if (!userKey) userKey = newGuestUserKey();

  if (isDatabaseConfigured()) {
    await upsertUser(userKey);
  }

  const res = NextResponse.json({
    user_key: userKey,
    database_configured: isDatabaseConfigured(),
  });

  if (created) {
    setSessionCookie(res, userKey);
  }

  return res;
}
