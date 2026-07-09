"use client";
import { useState } from "react";
import axios from "axios";

const PORTALS = [
  { id: "naukri", label: "Naukri", icon: "ri-briefcase-line" },
  { id: "indeed", label: "Indeed", icon: "ri-search-line" },
  { id: "linkedin", label: "LinkedIn Jobs", icon: "ri-linkedin-line" },
];

export default function JobPortalScraperPage() {
  const [portal, setPortal] = useState("naukri");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!query.trim()) {
      setError("Enter a job title or keywords.");
      return;
    }
    setError("");
    setRows([]);
    setLoading(true);
    try {
      const res = await axios.post("/api/job_portal_scraper", {
        portal,
        query,
        location,
        pages: Math.min(Math.max(Number(pages) || 1, 1), 3),
      });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = ["title", "company", "location", "salary", "experience", "skills", "posted", "url"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${(r[h] || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${portal}-jobs.csv`;
    a.click();
  }

  const stats = [
    {
      label: "Jobs Found",
      count: rows.length,
      icon: "ri-briefcase-line",
    },
    {
      label: "With Salary",
      count: rows.filter((r) => r.salary && r.salary !== "—" && r.salary !== "").length,
      icon: "ri-money-dollar-circle-line",
    },
    {
      label: "With Experience Info",
      count: rows.filter((r) => r.experience && r.experience !== "—" && r.experience !== "").length,
      icon: "ri-medal-line",
    },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                    <i className={`${s.icon} text-teal-500 text-xl`} />
                  </span>
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-defaulttextcolor dark:text-white">
                      {s.count}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-briefcase-line text-teal-600" /> Job Portal Scraper
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-semibold ml-1">
              v16 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          {/* Portal Tabs */}
          <div className="flex gap-2 mb-4 flex-wrap">
            {PORTALS.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  setPortal(p.id);
                  setRows([]);
                  setError("");
                }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  portal === p.id
                    ? "bg-teal-600 text-white border-teal-600"
                    : "border-gray-200 text-gray-600 hover:border-teal-300"
                }`}
              >
                <i className={p.icon} /> {p.label}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-5">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Job Title / Keywords
              </label>
              <input
                className="ti-form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. React Developer, Data Analyst"
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Location (optional)
              </label>
              <input
                className="ti-form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. Mumbai, Delhi, Bangalore"
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Pages (1–3)
              </label>
              <input
                type="number"
                className="ti-form-input"
                value={pages}
                min={1}
                max={3}
                onChange={(e) => setPages(e.target.value)}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...
                </>
              ) : (
                <>
                  <i className="ri-search-line" /> Find Jobs
                </>
              )}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <i className="ri-download-line" /> Export CSV ({rows.length})
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Results Table */}
      <div className="box">
        <div className="box-header">
          <h5 className="box-title">Jobs Found ({rows.length})</h5>
        </div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  {[
                    "#",
                    "Title",
                    "Company",
                    "Location",
                    "Salary",
                    "Experience",
                    "Posted",
                    "URL",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white text-xs max-w-[200px]">
                      {r.title || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 dark:text-white/70 text-xs">
                      {r.company || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.location || "—"}
                    </td>
                    <td className="px-4 py-3 text-green-600 text-xs font-medium whitespace-nowrap">
                      {r.salary || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.experience || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {r.posted || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-teal-600 hover:underline text-xs"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-10">
              {loading
                ? `Scraping ${PORTALS.find((p) => p.id === portal)?.label || "jobs"}...`
                : "No jobs to display"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
