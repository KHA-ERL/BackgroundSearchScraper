"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "url", header: "URL" },
  { key: "status_code", header: "Status Code" },
  { key: "status_text", header: "Status Text" },
  { key: "response_time", header: "Response Time (ms)" },
  { key: "redirect_url", header: "Redirect URL" },
];

function getRowClass(code) {
  if (!code || code === "error") return "bg-red-50 dark:bg-red-900/10";
  const n = Number(code);
  if (n >= 200 && n < 300) return "";
  if (n >= 300 && n < 400) return "bg-yellow-50 dark:bg-yellow-900/10";
  return "bg-red-50 dark:bg-red-900/10";
}

function getBadgeClass(code) {
  if (!code || code === "error") return "bg-red-100 text-red-700";
  const n = Number(code);
  if (n >= 200 && n < 300) return "bg-green-100 text-green-700";
  if (n >= 300 && n < 400) return "bg-yellow-100 text-yellow-700";
  return "bg-red-100 text-red-700";
}

export default function WebsiteUrlsCheckerPage() {
  const [urlText, setUrlText] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = rows.length > 0 ? [
    { label: "Total Checked", count: rows.length, icon: "ri-checkbox-circle-line", color: "cyan" },
    { label: "Success (2xx)", count: rows.filter((r) => String(r.status_code).startsWith("2")).length, icon: "ri-checkbox-circle-fill", color: "green" },
    { label: "Errors", count: rows.filter((r) => !String(r.status_code).startsWith("2") && !String(r.status_code).startsWith("3")).length, icon: "ri-close-circle-line", color: "red" },
  ] : [];

  async function run() {
    const urls = urlText.split("\n").map((u) => u.trim()).filter(Boolean).slice(0, 50);
    if (!urls.length) { setError("Enter at least one URL."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/website_checker", { urls });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to check URLs."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "url_checker.csv"; a.click();
  }

  return (
    <div>
      {/* Stats */}
      {stats.length > 0 && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {stats.map((s) => (
            <div key={s.label} className="col-span-12 md:col-span-4">
              <div className="box"><div className="box-body">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-full bg-${s.color}-50 flex items-center justify-center`}>
                    <i className={`${s.icon} text-${s.color}-500 text-xl`} />
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
            <i className="ri-checkbox-circle-line text-cyan-600" /> Website URLs Checker
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">URLs (one per line, max 50)</label>
          <textarea
            className="ti-form-input min-h-[120px] font-mono text-sm"
            value={urlText}
            onChange={(e) => setUrlText(e.target.value)}
            placeholder={"https://example.com\nhttps://google.com\nhttps://broken-link.example"}
          />
          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Checking...</> : <><i className="ri-checkbox-circle-line" /> Check URLs</>}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-cyan-400 text-cyan-600 hover:bg-cyan-600 hover:text-white flex items-center gap-2"
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
                  <tr key={i} className={`${getRowClass(row.status_code)} hover:opacity-90`}>
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate">
                      <a href={row.url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline truncate block max-w-[200px]">{row.url}</a>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getBadgeClass(row.status_code)}`}>
                        {row.status_code || "error"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm dark:text-white/70">{row.status_text || "N/A"}</td>
                    <td className="px-4 py-3 text-sm dark:text-white/70">{row.response_time ?? "N/A"}</td>
                    <td className="px-4 py-3 text-sm max-w-xs truncate dark:text-white/70">
                      {row.redirect_url
                        ? <a href={row.redirect_url} target="_blank" rel="noreferrer" className="text-cyan-600 hover:underline truncate block max-w-[200px]">{row.redirect_url}</a>
                        : "—"}
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
