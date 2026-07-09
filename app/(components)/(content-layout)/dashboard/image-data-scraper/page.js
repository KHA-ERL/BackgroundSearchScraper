"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "src", header: "Image URL" },
  { key: "alt", header: "Alt Text" },
  { key: "width", header: "Width" },
  { key: "height", header: "Height" },
];

export default function ImageDataScraperPage() {
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [view, setView] = useState("grid");

  async function run() {
    if (!url.trim()) { setError("Enter a URL."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/image_scraper", { url: url.trim() });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape images."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "images.csv"; a.click();
  }

  return (
    <div>
      {/* Stats */}
      {rows.length > 0 && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {[
            { label: "Total Images", count: rows.length, icon: "ri-image-line" },
            { label: "With Alt Text", count: rows.filter((r) => r.alt && r.alt.trim()).length, icon: "ri-text" },
            { label: "Large (>300px)", count: rows.filter((r) => (r.naturalWidth || r.width || 0) > 300).length, icon: "ri-image-2-line" },
          ].map((s) => (
            <div key={s.label} className="col-span-12 md:col-span-4">
              <div className="box"><div className="box-body">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-rose-50 flex items-center justify-center">
                    <i className={`${s.icon} text-rose-500 text-xl`} />
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
      )}

      {/* Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-image-line text-rose-600" /> Image Data Scraper
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">Website URL</label>
          <input
            type="text"
            className="ti-form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-rose-600 bg-rose-600 text-white hover:bg-rose-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-image-line" /> Scrape Images</>}
            </button>
            {rows.length > 0 && (
              <>
                <button
                  onClick={exportCSV}
                  className="ti-btn ti-btn-outline border border-rose-400 text-rose-600 hover:bg-rose-600 hover:text-white flex items-center gap-2"
                >
                  <i className="ri-download-2-line" /> Export CSV
                </button>
                <button
                  onClick={() => setView(view === "grid" ? "table" : "grid")}
                  className="ti-btn ti-btn-outline border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
                >
                  <i className={view === "grid" ? "ri-list-check" : "ri-grid-line"} /> {view === "grid" ? "Table View" : "Grid View"}
                </button>
              </>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Grid View */}
      {rows.length > 0 && view === "grid" && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Images ({rows.length})</h5></div>
          <div className="box-body">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {rows.map((row, i) => (
                <div key={i} className="group relative border border-gray-100 dark:border-white/10 rounded-lg overflow-hidden bg-gray-50 dark:bg-white/5">
                  <a href={row.src} target="_blank" rel="noreferrer">
                    <img
                      src={row.src}
                      alt={row.alt || ""}
                      className="w-full h-24 object-cover"
                      onError={(e) => { e.target.style.display = "none"; }}
                    />
                  </a>
                  <div className="p-1.5">
                    <p className="text-xs text-gray-400 truncate" title={row.alt}>{row.alt || "(no alt)"}</p>
                    <p className="text-xs text-gray-300">{row.naturalWidth || row.width || "?"}x{row.naturalHeight || row.height || "?"}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Table View */}
      {rows.length > 0 && view === "table" && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Images ({rows.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Preview</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">{c.header}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-2">
                      <img src={row.src} alt={row.alt || ""} className="w-12 h-12 object-cover rounded border border-gray-200" onError={(e) => { e.target.style.display = "none"; }} />
                    </td>
                    {columns.map((c) => (
                      <td key={c.key} className="px-4 py-3 text-sm max-w-xs truncate dark:text-white/70">
                        {c.key === "src"
                          ? <a href={row[c.key]} target="_blank" rel="noreferrer" className="text-rose-600 hover:underline truncate block max-w-[200px]">{row[c.key]}</a>
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
