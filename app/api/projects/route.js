import { NextResponse } from "next/server";
import { getUserKey, isDatabaseConfigured, supabaseRequest, upsertUser } from "@/lib/server/supabaseRest";
import { authRequiredResponse, isAuthenticatedUserKey, rateLimit } from "@/lib/server/security";

export async function GET(request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ data: [], database_configured: false });
  }

  const userKey = getUserKey(request);
  if (!isAuthenticatedUserKey(userKey)) return authRequiredResponse("Sign in to view projects.");

  const rows = await supabaseRequest("projects", {
    query: `?user_key=eq.${encodeURIComponent(userKey)}&select=*&order=created_at.desc`,
  });
  return NextResponse.json({ data: rows || [] });
}

export async function POST(request) {
  const limited = rateLimit(request, { key: "projects", limit: 10, authenticatedLimit: 30, windowMs: 60_000 });
  if (limited) return limited;

  if (!isDatabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const userKey = getUserKey(request);
  if (!isAuthenticatedUserKey(userKey)) return authRequiredResponse("Sign in to create projects.");

  const body = await request.json();
  const name = String(body.name || "").trim().slice(0, 120);
  const description = String(body.description || "").trim().slice(0, 1000);
  if (!name) return NextResponse.json({ error: "Project name is required." }, { status: 400 });

  await upsertUser(userKey);
  const rows = await supabaseRequest("projects", {
    method: "POST",
    body: [{ user_key: userKey, name, description }],
  });
  return NextResponse.json({ data: rows?.[0] || null });
}

