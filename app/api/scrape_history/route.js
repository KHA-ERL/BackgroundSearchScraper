import { NextResponse } from "next/server";
import { getHistory, getUserKey, saveHistory } from "../../../lib/server/supabaseRest";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const apiPath = searchParams.get("apiPath");
    if (!apiPath) return NextResponse.json({ error: "apiPath is required" }, { status: 400 });
    const history = await getHistory(getUserKey(request), apiPath);
    return NextResponse.json({ rows: history?.rows || [], updated_at: history?.updated_at || null });
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      return NextResponse.json({ rows: [], updated_at: null, database_configured: false });
    }
    const status = 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    if (!body.apiPath) return NextResponse.json({ error: "apiPath is required" }, { status: 400 });
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 30) : [];
    const saved = await saveHistory(getUserKey(request), body.apiPath, rows);
    return NextResponse.json({ success: true, updated_at: saved?.updated_at || null });
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      return NextResponse.json({ success: true, updated_at: null, database_configured: false });
    }
    const status = 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
