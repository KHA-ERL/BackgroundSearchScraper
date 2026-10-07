import { NextResponse } from "next/server";
import { getAdminUser } from "@/lib/server/admin";
import { isDatabaseConfigured, supabaseRequest } from "@/lib/server/supabaseRest";

function startOfTodayIso() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function safeArray(value) {
  return Array.isArray(value) ? value : [];
}

async function readTable(table, query, fallback = []) {
  try {
    return safeArray(await supabaseRequest(table, { query }));
  } catch (error) {
    return fallback;
  }
}

function countBy(rows, keyFn) {
  const counts = {};
  for (const row of rows) {
    const key = keyFn(row);
    if (!key) continue;
    counts[key] = (counts[key] || 0) + 1;
  }
  return Object.entries(counts)
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
}

function statusSummary(rows) {
  return rows.reduce(
    (acc, row) => {
      const status = String(row.status || "").toLowerCase();
      if (status === "success" || status === "200") acc.success += 1;
      else acc.failed += 1;
      return acc;
    },
    { success: 0, failed: 0 }
  );
}

function isGuest(row) {
  return String(row.user_key || "").startsWith("guest:");
}

function securityEvents(auditRows, apiRows) {
  const audit = auditRows.filter((row) => {
    const haystack = `${row.action || ""} ${row.resource || ""} ${JSON.stringify(row.metadata || {})}`.toLowerCase();
    return haystack.includes("blocked") || haystack.includes("unauthorized") || haystack.includes("rate") || haystack.includes("failed");
  });
  const api = apiRows.filter((row) => Number(row.status || 0) >= 400);
  return [...audit, ...api]
    .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
    .slice(0, 12);
}

export async function GET(request) {
  try {
    const admin = await getAdminUser(request);
    if (!admin.ok) return admin.response;

    if (!isDatabaseConfigured()) {
      return NextResponse.json({ error: "Supabase is not configured.", database_configured: false }, { status: 503 });
    }

    const today = encodeURIComponent(startOfTodayIso());
    const [
      users,
      usersToday,
      runsToday,
      recentRuns,
      auditLogs,
      apiEvents,
      histories,
      projects,
      jobAlerts,
      crawlRuns,
    ] = await Promise.all([
      readTable("app_users", "?select=user_key,email,display_name,auth_provider,created_at,updated_at&order=created_at.desc&limit=500"),
      readTable("app_users", `?created_at=gte.${today}&select=user_key,email,auth_provider,created_at&order=created_at.desc&limit=500`),
      readTable("scrape_runs", `?created_at=gte.${today}&select=user_key,tool_name,api_path,status,row_count,metadata,created_at&order=created_at.desc&limit=1000`),
      readTable("scrape_runs", "?select=user_key,tool_name,api_path,status,row_count,metadata,created_at&order=created_at.desc&limit=200"),
      readTable("audit_logs", "?select=user_key,action,resource,metadata,created_at&order=created_at.desc&limit=200"),
      readTable("api_usage_events", "?select=user_key,route,status,metadata,created_at&order=created_at.desc&limit=200"),
      readTable("scrape_history", "?select=user_key,api_path,updated_at&order=updated_at.desc&limit=500"),
      readTable("projects", "?select=id,user_key,name,created_at,updated_at&order=created_at.desc&limit=500"),
      readTable("job_alerts", "?select=id,user_key,query,enabled,created_at,updated_at&order=created_at.desc&limit=500"),
      readTable("job_crawl_runs", "?select=status,started_at,finished_at,companies_scanned,jobs_seen,jobs_saved,jobs_dead,alert_matches,errors&order=started_at.desc&limit=10"),
    ]);

    const runStatus = statusSummary(runsToday);
    const topTools = countBy(runsToday.length ? runsToday : recentRuns, (row) => row.tool_name).slice(0, 10);
    const providerBreakdown = countBy(users, (row) => row.auth_provider || (isGuest(row) ? "guest" : "unknown"));
    const recentActivity = [...recentRuns, ...auditLogs, ...apiEvents]
      .map((row) => ({
        type: row.tool_name ? "tool_run" : row.action ? "audit" : "api_event",
        title: row.tool_name || row.action || row.route || "event",
        detail: row.api_path || row.resource || row.route || "",
        user_key: row.user_key || null,
        status: row.status || null,
        row_count: row.row_count || 0,
        created_at: row.created_at,
        metadata: row.metadata || {},
      }))
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0))
      .slice(0, 18);

    return NextResponse.json({
      database_configured: true,
      admin: admin.user,
      generated_at: new Date().toISOString(),
      summary: {
        total_users: users.length,
        signed_in_users: users.filter((row) => !isGuest(row)).length,
        guest_users: users.filter(isGuest).length,
        new_users_today: usersToday.length,
        tool_runs_today: runsToday.length,
        successful_runs_today: runStatus.success,
        failed_runs_today: runStatus.failed,
        saved_scrapes: histories.length,
        saved_projects: projects.length,
        job_alerts: jobAlerts.length,
        enabled_job_alerts: jobAlerts.filter((row) => row.enabled).length,
        security_events: securityEvents(auditLogs, apiEvents).length,
      },
      top_tools: topTools,
      provider_breakdown: providerBreakdown,
      recent_users: users.slice(0, 12),
      recent_activity: recentActivity,
      security_events: securityEvents(auditLogs, apiEvents),
      job_overview: {
        alerts: jobAlerts.slice(0, 12),
        latest_crawl: crawlRuns[0] || null,
        recent_crawls: crawlRuns,
        top_alert_queries: countBy(jobAlerts, (row) => row.query).slice(0, 10),
      },
    });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Unable to load admin overview." }, { status: 500 });
  }
}
