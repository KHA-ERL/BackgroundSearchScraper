"use client";
import { useState } from "react";
import axios from "axios";

export default function WhatsAppVerifierPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    const phones = input.split("\n").map((p) => p.trim()).filter(Boolean);
    if (!phones.length) { setError("Enter at least one phone number."); return; }
    setError(""); setRows([]); setSummary(null); setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp_verifier", { phones });
      setRows(res.data.data || []); setSummary(res.data.summary);
    } catch (e) { setError(e?.response?.data?.error || "Failed."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const h = "Phone,Has WhatsApp,Is Business,Account Type";
    const b = rows.map((r) => `"${r.phone}","${r.has_whatsapp}","${r.is_business}","${r.account_type}"`).join("\n");
    const blob = new Blob([h + "\n" + b], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "whatsapp-verification.csv"; a.click();
  }

  const typeColor = (t) => {
    if (t === "WhatsApp Business") return "bg-green-100 text-green-700";
    if (t === "WhatsApp Personal") return "bg-blue-100 text-blue-700";
    return "bg-gray-100 text-gray-500";
  };

  return (
    <div>
      {summary && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {[
            { label: "Total", count: summary.total, icon: "ri-phone-line", bg: "bg-indigo-50", text: "text-indigo-600" },
            { label: "Has WhatsApp", count: summary.has_whatsapp, icon: "ri-whatsapp-line", bg: "bg-green-50", text: "text-green-600" },
            { label: "WA Business", count: summary.is_business, icon: "ri-building-line", bg: "bg-emerald-50", text: "text-emerald-700" },
            { label: "No WhatsApp", count: summary.no_whatsapp, icon: "ri-close-circle-line", bg: "bg-red-50", text: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="col-span-12 sm:col-span-6 xl:col-span-3">
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
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-shield-check-line text-green-600" /> WhatsApp Business Verifier <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded font-semibold ml-1">v13</span></h5></div>
        <div className="box-body">
          <p className="text-sm text-gray-500 mb-3">Verifies whether each number has WhatsApp and whether it is a Business account. Enter numbers with country code (e.g. 919876543210). Max 30.</p>
          <textarea className="ti-form-input resize-y mb-3" rows={6} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"919876543210\n447911123456\n12025550100"} />
          <div className="flex gap-3 flex-wrap">
            <button onClick={verify} disabled={loading} className="ti-btn ti-btn-outline border border-green-600 bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-60">
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Verifying...</> : <><i className="ri-shield-check-line" /> Verify</>}
            </button>
            {rows.length > 0 && <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-green-400 text-green-600 hover:bg-green-500 hover:text-white flex items-center gap-2"><i className="ri-download-2-line" /> Export CSV</button>}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Results ({rows.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th><th className="px-4 py-3 text-left font-medium text-gray-500">Account Type</th><th className="px-4 py-3 text-left font-medium text-gray-500">WhatsApp</th><th className="px-4 py-3 text-left font-medium text-gray-500">Business</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono dark:text-white/80">{row.phone}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${typeColor(row.account_type)}`}>{row.account_type}</span></td>
                    <td className="px-4 py-3"><i className={`text-lg ${row.has_whatsapp ? "ri-checkbox-circle-fill text-green-500" : "ri-close-circle-fill text-red-400"}`} /></td>
                    <td className="px-4 py-3"><i className={`text-lg ${row.is_business ? "ri-checkbox-circle-fill text-emerald-600" : "ri-close-circle-fill text-red-400"}`} /></td>
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
