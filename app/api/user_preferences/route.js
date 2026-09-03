import { NextResponse } from "next/server";
import { getPreference, getUserKey, setPreference } from "../../../lib/server/supabaseRest";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get("key");
    if (!key) return NextResponse.json({ error: "key is required" }, { status: 400 });
    const value = await getPreference(getUserKey(request), key);
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
    await setPreference(getUserKey(request), body.key, body.value);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      return NextResponse.json({ success: true, database_configured: false });
    }
    const status = 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
