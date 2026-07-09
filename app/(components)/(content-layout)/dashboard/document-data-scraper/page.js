"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "name", header: "Name" },
  { key: "url", header: "URL" },
  { key: "type", header: "Type" },
];

export default function DocumentDataScraperPage() {
  const [url, setUrl] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = [
    { label: "Total Documents", count: rows.length, icon: "ri-file-text-line" },
    { label: "PDFs", count: rows.filter((r) => r.type?.toLowerCase() === "pdf").length, icon: "ri-file-pdf-line" },
    { label: "Other Docs", count: rows.filter((r) => r.type?.toLowerCase() !== "pdf").length, icon: "ri-file-word-line" },
  ];

  async function run() {
    if (!url.trim()) { setError("Enter a URL."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/document_scraper", { url: url.trim() });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape documents."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "documents.csv"; a.click();
  }

  const typeColors = {
    pdf: "bg-red-100 text-red-700",
    doc: "bg-blue-100 text-blue-700",
    docx: "bg-blue-100 text-blue-700",
    xlsx: "bg-green-100 text-green-700",
    xls: "bg-green-100 text-green-700",
    ppt: "bg-orange-100 text-orange-700",
    pptx: "bg-orange-100 text-orange-700",
    csv: "bg-teal-100 text-teal-700",
  };

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box"><div className="box-body">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-teal-50 flex items-center justify-center">
                  <i className={`${s.icon} text-teal-500 text-xl`} />
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
            <i className="ri-file-text-line text-teal-600" /> Document Data Scraper
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">Page URL (containing document links)</label>
          <input
            type="text"
            className="ti-form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/resources"
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <p className="text-xs text-gray-400 mt-1">Finds PDF, DOC, DOCX, XLSX, PPT, PPTX, CSV files</p>
          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scanning...</> : <><i className="ri-search-line" /> Find Documents</>}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-teal-400 text-teal-600 hover:bg-teal-600 hover:text-white flex items-center gap-2"
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
          <div className="box-header"><h5 className="box-title">Documents Found ({rows.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">{c.header}</th>
                  ))}
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-sm dark:text-white/70 max-w-xs truncate">{row.name || "N/A"}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">
                      <a href={row.url} target="_blank" rel="noreferrer" className="text-teal-600 hover:underline truncate block max-w-[250px]">{row.url}</a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold uppercase ${typeColors[row.type?.toLowerCase()] || "bg-gray-100 text-gray-700"}`}>
                        {row.type || "N/A"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={row.url} download target="_blank" rel="noreferrer" className="ti-btn ti-btn-outline border border-teal-300 text-teal-600 hover:bg-teal-50 text-xs px-2 py-1 flex items-center gap-1 w-fit">
                        <i className="ri-download-line" /> Download
                      </a>
                    </td>
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
