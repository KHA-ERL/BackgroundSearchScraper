"use client";
import { useState } from "react";
import axios from "axios";

const ENGINES = [
  { id: "google", label: "Google", icon: "ri-google-line", color: "text-blue-500" },
  { id: "bing", label: "Bing", icon: "ri-microsoft-line", color: "text-teal-500" },
  { id: "yahoo", label: "Yahoo", icon: "ri-search-2-line", color: "text-purple-500" },
  { id: "duckduckgo", label: "DuckDuckGo", icon: "ri-search-eye-line", color: "text-orange-500" },
];

export default function SearchEngineScraperPage() {
  const [engine, setEngine] = useState("google");
  const [query, setQuery] = useState("");
  const [pages, setPages] = useState(1);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!query.trim()) { setError("Enter a search query."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/search_engine_scraper", { engine, query, pages: Number(pages) });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape. Please try again."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = ["Title", "URL", "Description", "Engine"];
    const csv = [
      headers.join(","),
      ...rows.map(r =>
        [r.title, r.url, r.description, r.engine]
          .map(v => `"${(v || "").replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${engine}-search-results.csv`;
    a.click();
  }

  const activeEngine = ENGINES.find(e => e.id === engine);

  return (
    <div>
      {/* Info Banner */}
      <div className="box mb-5 border-l-4 border-l-indigo-500">
        <div className="box-body py-3">
          <p className="text-sm text-gray-600">
            <i className="ri-information-line text-indigo-500 mr-2" />
            Combined search engine scraper — choose your engine and extract organic results from Google, Bing, Yahoo, or DuckDuckGo.
          </p>
        </div>
      </div>

      {/* Main Input Box */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-search-line text-indigo-600" />
            Search Engine Scraper
            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-semibold ml-1">NEW v14</span>
          </h5>
        </div>
        <div className="box-body">
          {/* Engine Tabs */}
          <div className="flex gap-2 flex-wrap mb-4">
            {ENGINES.map(e => (
              <button
                key={e.id}
                onClick={() => { setEngine(e.id); setRows([]); setError(""); }}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  engine === e.id
                    ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
                }`}
              >
                <i className={`${e.icon} ${engine === e.id ? "text-white" : e.color}`} />
                {e.label}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-8">
              <label className="block text-sm font-medium text-gray-600 mb-1">Search Query</label>
              <input
                type="text"
                className="ti-form-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && run()}
                placeholder="e.g. web scraping tools 2024"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Pages (1–5){engine === "duckduckgo" && <span className="text-xs text-orange-500 ml-1">(DDG: 1 page only)</span>}
              </label>
              <input
                type="number"
                className="ti-form-input"
                value={pages}
                min={1}
                max={5}
                onChange={e => setPages(Math.min(5, Math.max(1, Number(e.target.value))))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</>
              ) : (
                <><i className="ri-search-line" /> Scrape Results</>
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
          {error && <p className="text-red-500 text-sm mt-3"><i className="ri-error-warning-line mr-1" />{error}</p>}
        </div>
      </div>

      {/* Results Table */}
      {rows.length > 0 && (
        <div className="box">
          <div className="box-header flex items-center justify-between">
            <h5 className="box-title flex items-center gap-2">
              <i className={`${activeEngine?.icon} ${activeEngine?.color}`} />
              {rows.length} Results from {activeEngine?.label}
            </h5>
            <span className="text-xs text-gray-400">{pages} page{pages > 1 ? "s" : ""} scraped</span>
          </div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-8">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Title</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">URL</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 dark:text-white max-w-xs">
                      <span className="line-clamp-2">{r.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-indigo-600 hover:underline text-xs break-all block max-w-[200px] truncate"
                        title={r.url}
                      >
                        {r.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-500 dark:text-white/60 text-xs max-w-sm">
                      <span className="line-clamp-3">{r.description}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && !error && (
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-search-line text-5xl text-indigo-200 mb-3 block" />
            <p className="text-gray-400 text-sm">Select a search engine, enter a query, and click Scrape Results.</p>
          </div>
        </div>
      )}
    </div>
  );
}
