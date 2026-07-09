"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "name", header: "Business Name" },
  { key: "phone", header: "Phone" },
  { key: "address", header: "Address" },
  { key: "category", header: "Category" },
  { key: "rating", header: "Rating" },
  { key: "website", header: "Website" },
];

export default function JustdialScraperPage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("Mumbai");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = [
    { label: "Total Businesses", count: rows.length, icon: "ri-store-2-line" },
    { label: "With Phone", count: rows.filter((r) => r.phone !== "N/A").length, icon: "ri-phone-line" },
    { label: "With Website", count: rows.filter((r) => r.website !== "N/A" && r.website).length, icon: "ri-global-line" },
  ];

  async function search() {
    if (!query.trim()) { setError("Please enter a search query."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/justdial_scraper", { query, city });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to scrape Justdial.");
    } finally { setLoading(false); }
  }

  function exportCSV() {
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "justdial.csv"; a.click();
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box"><div className="box-body">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center">
                  <i className={`${s.icon} text-indigo-500 text-xl`} />
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
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-store-2-line text-indigo-500" /> Justdial Scraper <span className="text-xs bg-indigo-100 text-indigo-600 px-2 py-0.5 rounded font-semibold ml-1">v10</span></h5></div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-8">
              <label className="block text-sm font-medium text-gray-600 mb-1">Search Query</label>
              <input type="text" className="ti-form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Plumbers, Restaurants, CA" onKeyDown={(e) => e.key === "Enter" && search()} />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
              <input type="text" className="ti-form-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Mumbai, Delhi" />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={search} disabled={loading} className="ti-btn ti-btn-outline border border-indigo-500 bg-indigo-500 text-white hover:bg-indigo-600 flex items-center gap-2 disabled:opacity-60">
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-search-line" /> Search</>}
            </button>
            {rows.length > 0 && (
              <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-indigo-400 text-indigo-500 hover:bg-indigo-500 hover:text-white flex items-center gap-2">
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
                <tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th>
                  {columns.map((c) => <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">{c.header}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-sm max-w-xs truncate dark:text-white/70">
                        {c.key === "website" && row[c.key] && row[c.key] !== "N/A"
                          ? <a href={row[c.key]} target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">{row[c.key]}</a>
                          : row[c.key] || "N/A"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-10">{loading ? "Scraping Justdial..." : "No data to display"}</p>
          )}
        </div>
      </div>
    </div>
  );
}
