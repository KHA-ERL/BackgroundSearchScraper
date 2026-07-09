"use client";
import { useState } from "react";
import axios from "axios";

export default function PhoneVerifierPage() {
  const [input, setInput] = useState("");
  const [country, setCountry] = useState("IN");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    const phones = input.split("\n").map((p) => p.trim()).filter(Boolean);
    if (!phones.length) { setError("Enter at least one phone number."); return; }
    setError(""); setRows([]); setSummary(null); setLoading(true);
    try {
      const res = await axios.post("/api/phone_verifier", { phones, country });
      setRows(res.data.data || []);
      setSummary(res.data.summary);
    } catch (e) { setError(e?.response?.data?.error || "Failed."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const h = "Input,Valid,Country Code,International,National,Type";
    const b = rows.map((r) => `"${r.input}","${r.valid}","${r.country_code}","${r.international}","${r.national}","${r.type}"`).join("\n");
    const blob = new Blob([h + "\n" + b], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "phone-verification.csv"; a.click();
  }

  return (
    <div>
      {summary && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {[
            { label: "Total", count: summary.total, icon: "ri-phone-line", bg: "bg-amber-50", text: "text-amber-600" },
            { label: "Valid", count: summary.valid, icon: "ri-checkbox-circle-line", bg: "bg-green-50", text: "text-green-600" },
            { label: "Invalid", count: summary.invalid, icon: "ri-close-circle-line", bg: "bg-red-50", text: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="col-span-12 md:col-span-4">
              <div className="box"><div className="box-body">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center`}><i className={`${s.icon} ${s.text} text-xl`} /></span>
                  <div><p className="text-sm text-gray-500">{s.label}</p><p className={`text-2xl font-bold ${s.text}`}>{s.count}</p></div>
                </div>
              </div></div>
            </div>
          ))}
        </div>
      )}

      <div className="box mb-5">
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-phone-find-line text-amber-600" /> Phone Number Verifier <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded font-semibold ml-1">v13</span></h5></div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-9">
              <label className="block text-sm font-medium text-gray-600 mb-1">Phone Numbers (one per line, max 500)</label>
              <textarea className="ti-form-input resize-y" rows={6} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"9876543210\n+447911123456\n12025550100"} />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Default Country</label>
              <input type="text" className="ti-form-input" value={country} onChange={(e) => setCountry(e.target.value.toUpperCase())} placeholder="IN, US, GB..." maxLength={2} />
              <p className="text-xs text-gray-400 mt-1">2-letter ISO code for local numbers</p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button onClick={verify} disabled={loading} className="ti-btn ti-btn-outline border border-amber-500 bg-amber-500 text-white hover:bg-amber-600 flex items-center gap-2 disabled:opacity-60">
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Verifying...</> : <><i className="ri-shield-check-line" /> Verify Phones</>}
            </button>
            {rows.length > 0 && <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-amber-400 text-amber-600 hover:bg-amber-500 hover:text-white flex items-center gap-2"><i className="ri-download-2-line" /> Export CSV</button>}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Verification Results ({rows.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Input</th><th className="px-4 py-3 text-left font-medium text-gray-500">Valid</th><th className="px-4 py-3 text-left font-medium text-gray-500">International</th><th className="px-4 py-3 text-left font-medium text-gray-500">Country</th><th className="px-4 py-3 text-left font-medium text-gray-500">Type</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono text-sm dark:text-white/80">{row.input}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${row.valid ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>{row.valid ? "Valid" : "Invalid"}</span></td>
                    <td className="px-4 py-3 font-mono text-sm text-indigo-600">{row.international}</td>
                    <td className="px-4 py-3 dark:text-white/70">{row.country_code}</td>
                    <td className="px-4 py-3 text-gray-500">{row.type}</td>
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
