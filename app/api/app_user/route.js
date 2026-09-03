import { NextResponse } from "next/server";
import crypto from "crypto";
import { isDatabaseConfigured, upsertUser } from "../../../lib/server/supabaseRest";

export async function GET(request) {
  let userKey = request.cookies.get("bs_user_key")?.value;
  const created = !userKey;
  if (!userKey) userKey = crypto.randomUUID();

  if (isDatabaseConfigured()) {
    await upsertUser(userKey);
  }

  const res = NextResponse.json({
    user_key: userKey,
    database_configured: isDatabaseConfigured(),
  });

  if (created) {
    res.cookies.set("bs_user_key", userKey, {
      httpOnly: false,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }

  return res;
}
