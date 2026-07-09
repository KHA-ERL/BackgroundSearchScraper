"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "index", header: "Index" },
  { key: "element", header: "Element" },
  { key: "text", header: "Text" },
  { key: "url", header: "URL" },
];

export default function WebsiteDataScraperPage() {
  const [url, setUrl] = useState("");
  const [selector, setSelector] = useState("");
  const [attribute, setAttribute] = useState("text");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!url.trim()) { setError("Enter a URL."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/website_data", { url: url.trim(), selector: selector.trim(), attribute });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape website data."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "website_data.csv"; a.click();
  }

  return (
    <div>
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-code-s-slash-line text-gray-600" /> Website Data Scraper
          </h5>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-5">
              <label className="block text-sm font-medium text-gray-600 mb-1">Website URL</label>
              <input
                type="text"
                className="ti-form-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">CSS Selector (optional)</label>
              <input
                type="text"
                className="ti-form-input font-mono"
                value={selector}
                onChange={(e) => setSelector(e.target.value)}
                placeholder="e.g. h1, .product-title, a"
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Extract Attribute</label>
              <select
                className="ti-form-input"
                value={attribute}
                onChange={(e) => setAttribute(e.target.value)}
              >
                <option value="text">Text Content</option>
                <option value="href">href (links)</option>
                <option value="src">src (images)</option>
              </select>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-gray-600 bg-gray-600 text-white hover:bg-gray-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-search-line" /> Scrape Data</>}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-gray-400 text-gray-600 hover:bg-gray-600 hover:text-white flex items-center gap-2"
              >
                <i className="ri-download-2-line" /> Export CSV
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Results ({rows.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-sm max-w-xs truncate dark:text-white/70">
                        {c.key === "url" && row[c.key]
                          ? <a href={row[c.key]} target="_blank" rel="noreferrer" className="text-gray-600 hover:underline truncate block max-w-[200px]">{row[c.key]}</a>
                          : row[c.key] ?? ""}
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
