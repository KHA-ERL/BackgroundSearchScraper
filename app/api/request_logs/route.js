import { NextResponse } from "next/server";
import { getRunStats, getUserKey, logRun } from "../../../lib/server/supabaseRest";

export async function GET(request) {
  try {
    const stats = await getRunStats(getUserKey(request));
    return NextResponse.json(stats);
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      return NextResponse.json({ today: 0, total: 0, topTool: null, tools: {}, database_configured: false });
    }
    const status = 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const row = await logRun({
      userKey: getUserKey(request),
      toolName: body.toolName || body.tool_name || "Unknown Tool",
      apiPath: body.apiPath || body.api_path || "",
      status: body.status || "success",
      rowCount: Number(body.rowCount || body.row_count || 0),
      metadata: body.metadata || {},
    });
    return NextResponse.json({ success: true, id: row?.id || null });
  } catch (error) {
    if (error.code === "DB_NOT_CONFIGURED") {
      return NextResponse.json({ success: true, id: null, database_configured: false });
    }
    const status = 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}
