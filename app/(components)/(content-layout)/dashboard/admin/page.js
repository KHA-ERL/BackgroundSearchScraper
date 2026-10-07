"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function formatDate(value) {
  if (!value) return "Never";
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(value));
  } catch (_) {
    return String(value);
  }
}

function shortUser(userKey = "") {
  if (!userKey) return "unknown";
  if (userKey.length <= 28) return userKey;
  return `${userKey.slice(0, 18)}...${userKey.slice(-6)}`;
}

function StatCard({ label, value, icon, tone = "orange" }) {
  const tones = {
    orange: "bg-orange-100 text-orange-700",
    sky: "bg-sky-100 text-sky-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-rose-100 text-rose-700",
    violet: "bg-violet-100 text-violet-700",
    stone: "bg-stone-100 text-stone-700",
  };

  return (
    <div className="rounded-[1.1rem] border border-white/80 bg-white p-4 shadow-[0_16px_40px_rgba(91,60,31,0.07)] dark:border-[#00FF41]/25 dark:bg-black">
      <div className="flex items-center gap-3">
        <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[tone] || tones.orange} dark:bg-[#00FF41]/10 dark:text-[#00FF41]`}>
          <i className={`${icon} text-lg`} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-stone-500 dark:text-[#00FF41]/60">{label}</p>
          <p className="truncate text-2xl font-black text-stone-950 dark:text-[#00FF41]">{value}</p>
        </div>
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children, action }) {
  return (
    <section className="rounded-[1.25rem] border border-orange-100 bg-white p-4 shadow-[0_18px_50px_rgba(120,72,29,0.08)] dark:border-[#00FF41]/25 dark:bg-black">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-black text-stone-950 dark:text-[#00FF41]">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs text-stone-500 dark:text-[#00FF41]/60">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function AdminPage() {
  const [state, setState] = useState({ loading: true, data: null, error: "" });

  async function loadOverview() {
    setState((prev) => ({ ...prev, loading: true, error: "" }));
    try {
      const res = await fetch("/api/admin/overview/", { cache: "no-store" });
      const payload = await res.json();
      if (!res.ok) throw new Error(payload.error || "Unable to load admin dashboard.");
      setState({ loading: false, data: payload, error: "" });
    } catch (error) {
      setState({ loading: false, data: null, error: error.message || "Unable to load admin dashboard." });
    }
  }

  useEffect(() => {
    loadOverview();
  }, []);

  const data = state.data;
  const summary = data?.summary || {};
  const latestCrawl = data?.job_overview?.latest_crawl;
  const successRate = useMemo(() => {
    const total = Number(summary.tool_runs_today || 0);
    if (!total) return "0%";
    return `${Math.round((Number(summary.successful_runs_today || 0) / total) * 100)}%`;
  }, [summary.successful_runs_today, summary.tool_runs_today]);

  if (state.loading) {
    return (
      <main className="rounded-[1.35rem] bg-[#fff8ef] p-5 dark:bg-[#030504]">
        <div className="flex min-h-64 items-center justify-center rounded-[1.25rem] border border-orange-100 bg-white dark:border-[#00FF41]/25 dark:bg-black">
          <span className="ti-spinner h-8 w-8" aria-label="Loading admin dashboard" />
        </div>
      </main>
    );
  }

  if (state.error) {
    const needsSignIn = state.error.toLowerCase().includes("sign in");
    return (
      <main className="rounded-[1.35rem] bg-[#fff8ef] p-5 dark:bg-[#030504]">
        <div className="rounded-[1.25rem] border border-orange-100 bg-white p-8 text-center shadow-sm dark:border-[#00FF41]/25 dark:bg-black">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-orange-100 text-orange-700 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
            <i className="ri-shield-user-line text-2xl" aria-hidden="true" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-stone-950 dark:text-[#00FF41]">Admin access required</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-600 dark:text-[#00FF41]/65">{state.error}</p>
          <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={needsSignIn ? "/dashboard/auth" : "/dashboard/profile"} className="ti-btn bg-sky-500 text-white hover:bg-sky-600">
              {needsSignIn ? "Sign in" : "Open profile"}
            </Link>
            <Link href="/dashboard/home" className="ti-btn border border-stone-200 text-stone-700 hover:bg-stone-50 dark:text-[#00FF41]">
              Back to dashboard
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="relative overflow-hidden rounded-[1.35rem] bg-[#fff8ef] p-4 font-sans text-stone-900 sm:p-5 dark:bg-[#030504] dark:text-[#00FF41]">
      <div className="mb-5 flex flex-col gap-4 rounded-[1.35rem] border border-orange-100 bg-white p-5 shadow-[0_22px_60px_rgba(118,74,36,0.10)] sm:flex-row sm:items-end sm:justify-between dark:border-[#00FF41]/25 dark:bg-black">
        <div>
          <p className="text-xs font-bold uppercase text-orange-700 dark:text-[#00FF41]/70">Admin console</p>
          <h1 className="mt-2 text-3xl font-black tracking-normal text-stone-950 dark:text-[#00FF41]">
            Platform observability
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-[#00FF41]/65">
            Monitor users, tool usage, saved work, job activity, recent events, and security signals from one private view.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOverview}
          className="ti-btn bg-stone-950 text-white hover:bg-orange-700 dark:bg-[#00FF41] dark:text-black dark:hover:bg-white"
        >
          <i className="ri-refresh-line mr-1" aria-hidden="true" />
          Refresh
        </button>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Total users" value={summary.total_users || 0} icon="ri-user-line" tone="sky" />
        <StatCard label="New users today" value={summary.new_users_today || 0} icon="ri-user-add-line" tone="green" />
        <StatCard label="Tool runs today" value={summary.tool_runs_today || 0} icon="ri-play-circle-line" tone="orange" />
        <StatCard label="Failed runs today" value={summary.failed_runs_today || 0} icon="ri-error-warning-line" tone="red" />
        <StatCard label="Success rate" value={successRate} icon="ri-checkbox-circle-line" tone="green" />
        <StatCard label="Saved scrapes" value={summary.saved_scrapes || 0} icon="ri-database-2-line" tone="violet" />
        <StatCard label="Projects" value={summary.saved_projects || 0} icon="ri-folder-chart-line" tone="stone" />
        <StatCard label="Security events" value={summary.security_events || 0} icon="ri-shield-flash-line" tone="red" />
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(360px,0.8fr)]">
        <Panel title="Top tools" subtitle="Ranked by today’s runs, falling back to recent runs when today is empty.">
          <div className="space-y-3">
            {(data.top_tools || []).length ? data.top_tools.map((tool, index) => (
              <div key={tool.name} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-[#fff8ef] p-3 dark:border-[#00FF41]/20 dark:bg-[#00FF41]/5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-stone-950 text-xs font-black text-white dark:bg-[#00FF41] dark:text-black">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-950 dark:text-[#00FF41]">{tool.name}</p>
                </div>
                <span className="rounded-full bg-orange-100 px-2 py-1 text-xs font-black text-orange-800 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
                  {tool.count}
                </span>
              </div>
            )) : (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500 dark:bg-[#00FF41]/5 dark:text-[#00FF41]/60">No tool runs logged yet.</p>
            )}
          </div>
        </Panel>

        <Panel title="Job system" subtitle="Alerts and latest background crawler snapshot.">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
            <div className="rounded-2xl border border-stone-100 bg-[#fff8ef] p-4 dark:border-[#00FF41]/20 dark:bg-[#00FF41]/5">
              <p className="text-xs font-bold uppercase text-stone-500 dark:text-[#00FF41]/60">Enabled alerts</p>
              <p className="mt-1 text-2xl font-black text-stone-950 dark:text-[#00FF41]">{summary.enabled_job_alerts || 0} / {summary.job_alerts || 0}</p>
            </div>
            <div className="rounded-2xl border border-stone-100 bg-[#fff8ef] p-4 dark:border-[#00FF41]/20 dark:bg-[#00FF41]/5">
              <p className="text-xs font-bold uppercase text-stone-500 dark:text-[#00FF41]/60">Latest crawl</p>
              <p className="mt-1 text-sm font-bold text-stone-950 dark:text-[#00FF41]">{latestCrawl?.status || "No crawls yet"}</p>
              <p className="mt-1 text-xs text-stone-500 dark:text-[#00FF41]/60">{formatDate(latestCrawl?.started_at)}</p>
              {latestCrawl ? (
                <p className="mt-2 text-xs text-stone-600 dark:text-[#00FF41]/65">
                  {latestCrawl.jobs_saved || 0} saved, {latestCrawl.jobs_seen || 0} seen, {latestCrawl.companies_scanned || 0} companies scanned
                </p>
              ) : null}
            </div>
          </div>
        </Panel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Recent activity" subtitle="Tool runs, API events, and audit records in time order.">
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {(data.recent_activity || []).length ? data.recent_activity.map((event, index) => (
              <div key={`${event.type}-${event.created_at}-${index}`} className="rounded-2xl border border-stone-100 bg-white p-3 dark:border-[#00FF41]/20 dark:bg-[#030504]">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-stone-950 dark:text-[#00FF41]">{event.title}</p>
                    <p className="mt-1 truncate text-xs text-stone-500 dark:text-[#00FF41]/60">{event.detail || event.type}</p>
                  </div>
                  <span className="shrink-0 text-xs font-semibold text-stone-400 dark:text-[#00FF41]/50">{formatDate(event.created_at)}</span>
                </div>
                <p className="mt-2 text-xs text-stone-500 dark:text-[#00FF41]/60">{shortUser(event.user_key)}</p>
              </div>
            )) : (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500 dark:bg-[#00FF41]/5 dark:text-[#00FF41]/60">No recent activity yet.</p>
            )}
          </div>
        </Panel>

        <Panel title="Recent users" subtitle="Newest user records created by auth or tool activity.">
          <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
            {(data.recent_users || []).length ? data.recent_users.map((user) => (
              <div key={user.user_key} className="flex items-center gap-3 rounded-2xl border border-stone-100 bg-white p-3 dark:border-[#00FF41]/20 dark:bg-[#030504]">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-orange-100 text-sm font-black text-orange-800 dark:bg-[#00FF41]/10 dark:text-[#00FF41]">
                  {(user.email || user.display_name || user.user_key || "?").slice(0, 1).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-stone-950 dark:text-[#00FF41]">{user.display_name || user.email || shortUser(user.user_key)}</p>
                  <p className="truncate text-xs text-stone-500 dark:text-[#00FF41]/60">{user.email || shortUser(user.user_key)}</p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs font-bold text-stone-600 dark:text-[#00FF41]/70">{user.auth_provider || "unknown"}</p>
                  <p className="text-xs text-stone-400 dark:text-[#00FF41]/50">{formatDate(user.created_at)}</p>
                </div>
              </div>
            )) : (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500 dark:bg-[#00FF41]/5 dark:text-[#00FF41]/60">No user records yet.</p>
            )}
          </div>
        </Panel>
      </section>

      <section className="mt-5 grid gap-5 xl:grid-cols-2">
        <Panel title="Security signals" subtitle="Failed, blocked, unauthorized, rate-limited, or error-like events.">
          <div className="space-y-2">
            {(data.security_events || []).length ? data.security_events.map((event, index) => (
              <div key={`${event.created_at}-${index}`} className="rounded-2xl border border-rose-100 bg-rose-50/70 p-3 dark:border-rose-500/30 dark:bg-rose-500/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-bold text-rose-900 dark:text-rose-200">{event.action || event.route || "security event"}</p>
                    <p className="mt-1 text-xs text-rose-700 dark:text-rose-300">{event.resource || event.status || shortUser(event.user_key)}</p>
                  </div>
                  <span className="text-xs font-semibold text-rose-500">{formatDate(event.created_at)}</span>
                </div>
              </div>
            )) : (
              <p className="rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                No security events in the recent sample.
              </p>
            )}
          </div>
        </Panel>

        <Panel title="Auth providers" subtitle="How users are entering the platform.">
          <div className="space-y-3">
            {(data.provider_breakdown || []).length ? data.provider_breakdown.map((provider) => (
              <div key={provider.name} className="flex items-center justify-between rounded-2xl border border-stone-100 bg-[#fff8ef] p-3 dark:border-[#00FF41]/20 dark:bg-[#00FF41]/5">
                <span className="text-sm font-bold text-stone-950 dark:text-[#00FF41]">{provider.name}</span>
                <span className="rounded-full bg-stone-950 px-2 py-1 text-xs font-black text-white dark:bg-[#00FF41] dark:text-black">{provider.count}</span>
              </div>
            )) : (
              <p className="rounded-2xl bg-stone-50 p-4 text-sm text-stone-500 dark:bg-[#00FF41]/5 dark:text-[#00FF41]/60">No provider data yet.</p>
            )}
          </div>
        </Panel>
      </section>
    </main>
  );
}
