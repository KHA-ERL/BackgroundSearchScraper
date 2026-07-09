"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "domain", header: "Domain" },
  { key: "has_mx", header: "Has MX" },
  { key: "has_a", header: "Has A Record" },
  { key: "has_ns", header: "Has NS" },
  { key: "ssl_valid", header: "SSL Valid" },
  { key: "status", header: "Status" },
];

function BoolBadge({ value }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${value ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
      {value ? "Yes" : "No"}
    </span>
  );
}

export default function VerifiedDomainsPage() {
  const [domainText, setDomainText] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const stats = rows.length > 0 ? [
    { label: "Total Domains", count: rows.length, icon: "ri-verified-badge-line" },
    { label: "Valid DNS", count: rows.filter((r) => r.status === "Valid").length, icon: "ri-check-double-line" },
    { label: "SSL Secured", count: rows.filter((r) => r.ssl_valid).length, icon: "ri-shield-check-line" },
  ] : [];

  async function run() {
    const domains = domainText.split("\n").map((d) => d.trim()).filter(Boolean).slice(0, 30);
    if (!domains.length) { setError("Enter at least one domain."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/verified_domains", { domains });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to verify domains."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "verified_domains.csv"; a.click();
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
                  <span className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                    <i className={`${s.icon} text-green-500 text-xl`} />
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
            <i className="ri-verified-badge-line text-green-600" /> Verified Domains Checker
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">Domains (one per line, max 30)</label>
          <textarea
            className="ti-form-input min-h-[120px] font-mono text-sm"
            value={domainText}
            onChange={(e) => setDomainText(e.target.value)}
            placeholder={"example.com\ngoogle.com\nmicrosoft.com"}
          />
          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-green-600 bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Verifying...</> : <><i className="ri-verified-badge-line" /> Verify Domains</>}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-green-400 text-green-600 hover:bg-green-600 hover:text-white flex items-center gap-2"
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
                    <td className="px-4 py-3 text-sm font-medium dark:text-white/80">
                      <a href={"https://" + row.domain} target="_blank" rel="noreferrer" className="text-green-600 hover:underline">{row.domain}</a>
                    </td>
                    <td className="px-4 py-3"><BoolBadge value={row.has_mx} /></td>
                    <td className="px-4 py-3"><BoolBadge value={row.has_a} /></td>
                    <td className="px-4 py-3"><BoolBadge value={row.has_ns} /></td>
                    <td className="px-4 py-3"><BoolBadge value={row.ssl_valid} /></td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row.status === "Valid" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {row.status || "N/A"}
                      </span>
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
