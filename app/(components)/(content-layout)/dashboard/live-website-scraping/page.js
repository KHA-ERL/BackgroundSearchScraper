"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "url", header: "URL" },
  { key: "title", header: "Title" },
  { key: "meta_description", header: "Meta Description" },
  { key: "h1s", header: "H1s" },
  { key: "links_count", header: "Links Count" },
  { key: "images_count", header: "Images Count" },
  { key: "status", header: "Status" },
];

export default function LiveWebsiteScrapingPage() {
  const [urlText, setUrlText] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const urls = urlText.split("\n").map((u) => u.trim()).filter(Boolean).slice(0, 20);
    if (!urls.length) { setError("Enter at least one URL."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/live_website", { urls });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape websites."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(Array.isArray(r[c.key]) ? r[c.key].join("; ") : r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "live_website_scraping.csv"; a.click();
  }

  return (
    <div>
      {/* Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-global-line text-purple-600" /> Live Website Scraping
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">URLs (one per line, max 20)</label>
          <textarea
            className="ti-form-input min-h-[120px] font-mono text-sm"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder={"https://example.com\nhttps://another-site.com"}
          />
          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-purple-600 bg-purple-600 text-white hover:bg-purple-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-search-line" /> Scrape Websites</>}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-purple-400 text-purple-600 hover:bg-purple-600 hover:text-white flex items-center gap-2"
              >
                <i className="ri-download-2-line" /> Export CSV
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Table */}
      {rows.length > 0 && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Results ({rows.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
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
                        {c.key === "url"
                          ? <a href={row[c.key]} target="_blank" rel="noreferrer" className="text-purple-600 hover:underline truncate block max-w-[200px]">{row[c.key]}</a>
                          : c.key === "status"
                          ? <span className={`px-2 py-0.5 rounded text-xs font-semibold ${String(row[c.key]).startsWith("2") ? "bg-green-100 text-green-700" : String(row[c.key]).startsWith("3") ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>{row[c.key]}</span>
                          : Array.isArray(row[c.key])
                          ? row[c.key].join(", ")
                          : row[c.key] || "N/A"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
