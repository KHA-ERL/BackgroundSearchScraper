"use client";
import { useState, useRef } from "react";
import axios from "axios";

export default function PhoneScraperPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const cancelRef = useRef(null);

  const totalPhones = rows.reduce((acc, r) => acc + (r.phones?.length || 0), 0);

  async function search() {
    const urls = input.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) { setError("Enter at least one URL."); return; }
    setError(""); setRows([]); setLoading(true);
    const source = axios.CancelToken.source(); cancelRef.current = source;
    try {
      const res = await axios.post("/api/phone_scraper", { urls }, { cancelToken: source.token });
      setRows(res.data.data || []);
    } catch (e) {
      if (!axios.isCancel(e)) setError(e?.response?.data?.error || "Failed.");
    } finally { setLoading(false); }
  }

  function stop() { cancelRef.current?.cancel(); setLoading(false); }

  function exportCSV() {
    const flatRows = rows.flatMap((r) =>
      (r.phones?.length ? r.phones : ["N/A"]).map((phone) => ({ website: r.url, title: r.title, phone }))
    );
    const blob = new Blob(["Website,Title,Phone\n" + flatRows.map((r) => `"${r.website}","${r.title}","${r.phone}"`).join("\n")], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "phones.csv"; a.click();
  }

  return (
    <div>
      <div className="grid grid-cols-12 gap-5 mb-5">
        {[
          { label: "URLs Processed", count: rows.length, icon: "ri-global-line" },
          { label: "Sites with Phones", count: rows.filter((r) => r.phones?.length > 0).length, icon: "ri-checkbox-circle-line" },
          { label: "Total Phones Found", count: totalPhones, icon: "ri-phone-line" },
        ].map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box"><div className="box-body">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-cyan-50 flex items-center justify-center"><i className={`${s.icon} text-cyan-500 text-xl`} /></span>
                <div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold dark:text-white">{s.count}</p></div>
              </div>
            </div></div>
          </div>
        ))}
      </div>

      <div className="box mb-5">
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-phone-line text-cyan-500" /> Phone Number Scraper <span className="text-xs bg-cyan-100 text-cyan-600 px-2 py-0.5 rounded font-semibold ml-1">v10</span></h5></div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">Enter URLs (one per line, max 30)</label>
          <textarea className="ti-form-input resize-y mb-3" rows={5} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"https://example.com\nhttps://another.com"} />
          <div className="flex gap-3 flex-wrap">
            {loading
              ? <button onClick={stop} className="ti-btn ti-btn-outline border border-red-400 text-red-500 hover:bg-red-500 hover:text-white flex items-center gap-2"><span className="ti-spinner w-4 h-4 border-red-400" /> Stop</button>
              : <button onClick={search} className="ti-btn ti-btn-outline border border-cyan-500 bg-cyan-500 text-white hover:bg-cyan-600 flex items-center gap-2"><i className="ri-search-line" /> Extract Phones</button>}
            {rows.length > 0 && <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-cyan-400 text-cyan-600 hover:bg-cyan-500 hover:text-white flex items-center gap-2"><i className="ri-download-2-line" /> Export CSV</button>}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      <div className="box">
        <div className="box-header"><h5 className="box-title">{loading ? <span className="flex items-center gap-2"><span className="ti-spinner w-4 h-4 border-cyan-400" />Processing...</span> : `Results (${rows.length} sites)`}</h5></div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Website</th><th className="px-4 py-3 text-left font-medium text-gray-500">Phone Numbers Found</th><th className="px-4 py-3 text-left font-medium text-gray-500">Count</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 max-w-xs truncate dark:text-white/70"><a href={row.url} target="_blank" rel="noreferrer" className="text-cyan-500 hover:underline">{row.url}</a></td>
                    <td className="px-4 py-3">
                      {row.phones?.length > 0
                        ? <div className="flex flex-wrap gap-1">{row.phones.map((p, j) => <span key={j} className="text-xs bg-cyan-50 text-cyan-600 border border-cyan-100 px-2 py-0.5 rounded">{p}</span>)}</div>
                        : <span className="text-gray-400 text-xs">No phones found</span>}
                    </td>
                    <td className="px-4 py-3 font-bold text-cyan-600">{row.phones?.length || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-center text-gray-400 py-10">{loading ? "Extracting phones..." : "No data"}</p>}
        </div>
      </div>
    </div>
  );
}
