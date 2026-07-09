"use client";
import { useState } from "react";
import axios from "axios";

export default function SulekhaScraperPage() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("mumbai");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const columns = [
    { key: "name", header: "Provider Name" },
    { key: "phone", header: "Phone" },
    { key: "address", header: "Area" },
    { key: "category", header: "Category" },
    { key: "rating", header: "Rating" },
    { key: "experience", header: "Experience" },
  ];

  async function search() {
    if (!query.trim()) { setError("Please enter a service."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/sulekha_scraper", { query, city });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const h = columns.map((c) => c.header).join(",");
    const b = rows.map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([h + "\n" + b], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "sulekha.csv"; a.click();
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-5 mb-5">
        {[
          { label: "Total Providers", count: rows.length, icon: "ri-service-line", color: "violet" },
          { label: "With Phone", count: rows.filter((r) => r.phone && r.phone !== "N/A").length, icon: "ri-phone-line", color: "violet" },
          { label: "Rated", count: rows.filter((r) => r.rating && r.rating !== "N/A").length, icon: "ri-star-line", color: "violet" },
        ].map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box"><div className="box-body">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-violet-50 flex items-center justify-center">
                  <i className={`${s.icon} text-violet-500 text-xl`} />
                </span>
                <div>
                  <p className="text-sm text-gray-500">{s.label}</p>
                  <p className="text-xl font-bold dark:text-white">{s.count}</p>
                </div>
              </div>
            </div></div>
          </div>
        ))}
      </div>

      <div className="box mb-5">
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-service-line text-violet-500" /> Sulekha Scraper <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-semibold ml-1">v10</span></h5></div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-8">
              <label className="block text-sm font-medium text-gray-600 mb-1">Service</label>
              <input type="text" className="ti-form-input" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. Packers Movers, Interior Designer" onKeyDown={(e) => e.key === "Enter" && search()} />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">City</label>
              <input type="text" className="ti-form-input" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. mumbai, delhi" />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={search} disabled={loading} className="ti-btn ti-btn-outline border border-violet-500 bg-violet-500 text-white hover:bg-violet-600 flex items-center gap-2 disabled:opacity-60">
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-search-line" /> Search</>}
            </button>
            {rows.length > 0 && <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-violet-400 text-violet-600 hover:bg-violet-500 hover:text-white flex items-center gap-2"><i className="ri-download-2-line" /> Export CSV</button>}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      <div className="box">
        <div className="box-header"><h5 className="box-title">Providers ({rows.length})</h5></div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th>{columns.map((c) => <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">{c.header}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (<tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5"><td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>{columns.map((c) => <td key={c.key} className="px-4 py-3 text-sm max-w-xs truncate dark:text-white/70">{row[c.key] || "N/A"}</td>)}</tr>))}
              </tbody>
            </table>
          ) : <p className="text-center text-gray-400 py-10">{loading ? "Scraping Sulekha..." : "No data"}</p>}
        </div>
      </div>
    </div>
  );
}
