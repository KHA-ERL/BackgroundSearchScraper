"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "domain", header: "Domain" },
  { key: "registrar", header: "Registrar" },
  { key: "created", header: "Created" },
  { key: "expires", header: "Expires" },
  { key: "status", header: "Status" },
  { key: "name_servers", header: "Name Servers" },
];

export default function WhoisDomainsPage() {
  const [domainText, setDomainText] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    const domains = domainText.split("\n").map((d) => d.trim()).filter(Boolean).slice(0, 10);
    if (!domains.length) { setError("Enter at least one domain."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/whois_lookup", { domains });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed to lookup WHOIS data."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "whois.csv"; a.click();
  }

  return (
    <div>
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-information-line text-indigo-600" /> WHOIS Domain Lookup
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">Domains (one per line, max 10)</label>
          <textarea
            className="ti-form-input min-h-[120px] font-mono text-sm"
            value={domainText}
            onChange={(e) => setDomainText(e.target.value)}
            placeholder={"example.com\ngoogle.com\namazon.com"}
          />
          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-indigo-600 bg-indigo-600 text-white hover:bg-indigo-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Looking up...</> : <><i className="ri-information-line" /> Lookup WHOIS</>}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-indigo-400 text-indigo-600 hover:bg-indigo-600 hover:text-white flex items-center gap-2"
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
                      <td key={c.key} className="px-4 py-3 text-sm max-w-xs dark:text-white/70">
                        {c.key === "domain"
                          ? <a href={"https://" + row[c.key]} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">{row[c.key]}</a>
                          : c.key === "status"
                          ? <span className={`px-2 py-0.5 rounded text-xs font-semibold ${row[c.key]?.toLowerCase().includes("active") ? "bg-green-100 text-green-700" : row[c.key]?.toLowerCase().includes("error") ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-700"}`}>{row[c.key] || "N/A"}</span>
                          : <span className="truncate block max-w-[200px]">{row[c.key] || "N/A"}</span>}
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
