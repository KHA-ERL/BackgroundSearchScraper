"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "name", header: "Name" },
  { key: "phone", header: "Phone" },
  { key: "email", header: "Email" },
  { key: "website", header: "Website" },
  { key: "address", header: "Address" },
  { key: "category", header: "Category" },
];

export default function BusinessDirectoryScraperPage() {
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = [
    { label: "Total Businesses", count: rows.length, icon: "ri-git-repository-line" },
    { label: "With Phone", count: rows.filter((r) => r.phone && r.phone !== "N/A").length, icon: "ri-phone-line" },
    { label: "With Email", count: rows.filter((r) => r.email && r.email !== "N/A").length, icon: "ri-mail-line" },
  ];

  async function run() {
    if (!query.trim()) { setError("Enter a search query."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/business_directory", { query, location });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape business directory."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "business_directory.csv"; a.click();
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box"><div className="box-body">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-yellow-50 flex items-center justify-center">
                  <i className={`${s.icon} text-yellow-500 text-xl`} />
                </span>
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold text-defaulttextcolor dark:text-white">{s.count}</p>
                </div>
              </div>
            </div></div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-git-repository-line text-yellow-600" /> Business Directory Scraper
          </h5>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-6">
              <label className="block text-sm font-medium text-gray-600 mb-1">Search Query</label>
              <input
                type="text"
                className="ti-form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Plumbers, Restaurants, Lawyers"
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="col-span-12 md:col-span-6">
              <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
              <input
                type="text"
                className="ti-form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, NY"
              />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-yellow-500 bg-yellow-500 text-white hover:bg-yellow-600 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-search-line" /> Search Directory</>}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-yellow-400 text-yellow-600 hover:bg-yellow-500 hover:text-white flex items-center gap-2"
              >
                <i className="ri-download-2-line" /> Export CSV
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Table */}
      <div className="box">
        <div className="box-header"><h5 className="box-title">Results ({rows.length})</h5></div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-sm max-w-xs truncate dark:text-white/70">
                        {c.key === "website" && row[c.key] && row[c.key] !== "N/A"
                          ? <a href={row[c.key]} target="_blank" rel="noreferrer" className="text-yellow-600 hover:underline truncate block max-w-[180px]">{row[c.key]}</a>
                          : row[c.key] || "N/A"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-10">{loading ? "Scraping directory..." : "No data to display. Run a search above."}</p>
          )}
        </div>
      </div>
    </div>
  );
}
