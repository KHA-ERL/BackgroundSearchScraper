import { NextResponse } from "next/server";
import { getUserKey, isDatabaseConfigured, supabaseRequest, upsertUser } from "@/lib/server/supabaseRest";
import { authRequiredResponse, isAuthenticatedUserKey } from "@/lib/server/security";

export async function GET(request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const userKey = getUserKey(request);
    if (!isAuthenticatedUserKey(userKey)) return authRequiredResponse("Sign in to view saved job alerts.");
    await upsertUser(userKey);
    const rows = await supabaseRequest("job_alerts", {
      query: `?user_key=eq.${encodeURIComponent(userKey)}&select=*&order=created_at.desc`,
    });
    return NextResponse.json({ data: rows || [] });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to load job alerts." }, { status: 500 });
  }
}

export async function POST(request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured. Add Supabase keys before saving alerts." }, { status: 503 });
  }

  try {
    const userKey = getUserKey(request);
    if (!isAuthenticatedUserKey(userKey)) return authRequiredResponse("Sign in to save job alerts.");
    const body = await request.json();
    const query = String(body.query || "").trim();
    if (!query) {
      return NextResponse.json({ error: "Query is required." }, { status: 400 });
    }

    await upsertUser(userKey);
    const maxAgeDays = Math.min(Math.max(Number(body.maxAgeDays) || 7, 1), 7);
    const rows = await supabaseRequest("job_alerts", {
      method: "POST",
      body: [{
        user_key: userKey,
        name: String(body.name || query).trim(),
        query,
        location_mode: body.locationMode === "country" ? "country" : "worldwide",
        location: String(body.location || "").trim(),
        work_type: ["remote", "hybrid", "physical", "all"].includes(body.workType) ? body.workType : "all",
        max_age_days: maxAgeDays,
        enabled: true,
      }],
    });

    return NextResponse.json({ data: rows?.[0] || null });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to save job alert." }, { status: 500 });
  }
}

export async function PATCH(request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const userKey = getUserKey(request);
    if (!isAuthenticatedUserKey(userKey)) return authRequiredResponse("Sign in to update job alerts.");
    const body = await request.json();
    if (!body.id) return NextResponse.json({ error: "Alert id is required." }, { status: 400 });
    const rows = await supabaseRequest("job_alerts", {
      method: "PATCH",
      query: `?id=eq.${encodeURIComponent(body.id)}&user_key=eq.${encodeURIComponent(userKey)}`,
      body: { enabled: Boolean(body.enabled) },
    });
    return NextResponse.json({ data: rows?.[0] || null });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to update job alert." }, { status: 500 });
  }
}
