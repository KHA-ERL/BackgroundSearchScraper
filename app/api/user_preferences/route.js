import { NextResponse } from "next/server";
import { getPreference, getUserKey, setPreference } from "../../../lib/server/supabaseRest";
import { authRequiredResponse, isAuthenticatedUserKey } from "../../../lib/server/security";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
    const userKey = getUserKey(request);
    if (!isAuthenticatedUserKey(userKey)) {
      return NextResponse.json({ key, value: null, auth_required: true });
    }
    const value = await getPreference(userKey, key);
    return NextResponse.json({ key, value });
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      const { searchParams } = new URL(request.url);
      return NextResponse.json({ key: searchParams.get("key"), value: null, database_configured: false });
    }
    const status = 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.key) return NextResponse.json({ error: "key is required" }, { status: 400 });
    const userKey = getUserKey(request);
    if (!isAuthenticatedUserKey(userKey)) return authRequiredResponse();
    await setPreference(userKey, body.key, body.value);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      return NextResponse.json({ success: true, database_configured: false });
    }
    const status = 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
