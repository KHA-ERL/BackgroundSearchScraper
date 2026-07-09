"use client";
import { useState } from "react";
import axios from "axios";

export default function WhatsAppCheckerPage() {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const withWA = rows.filter((r) => r.has_whatsapp).length;
  const isBusiness = rows.filter((r) => r.is_business).length;
  const notFound = rows.filter((r) => !r.has_whatsapp).length;

  async function check() {
    const phones = input.split("\n").map((p) => p.trim()).filter(Boolean);
    if (!phones.length) { setError("Enter at least one phone number."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp_checker", { phones });
      setRows(res.data.data || []);
    } catch (e) { setError(e?.response?.data?.error || "Failed."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const h = "Phone,Has WhatsApp,Is Business,Status";
    const b = rows.map((r) => `"${r.phone}","${r.has_whatsapp}","${r.is_business}","${r.status}"`).join("\n");
    const blob = new Blob([h + "\n" + b], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "whatsapp-check.csv"; a.click();
  }

  const statusColor = (s) => {
    if (s === "WhatsApp Business") return "bg-green-100 text-green-700";
    if (s === "WhatsApp") return "bg-blue-100 text-blue-700";
    return "bg-red-100 text-red-600";
  };

  return (
    <div>
      <div className="grid grid-cols-12 gap-5 mb-5">
        {[
          { label: "Total Checked", count: rows.length, icon: "ri-phone-line", color: "emerald" },
          { label: "Has WhatsApp", count: withWA, icon: "ri-whatsapp-line", color: "emerald" },
          { label: "WhatsApp Business", count: isBusiness, icon: "ri-building-line", color: "emerald" },
          { label: "Not Found", count: notFound, icon: "ri-close-circle-line", color: "emerald" },
        ].map((s) => (
          <div key={s.label} className="col-span-12 sm:col-span-6 xl:col-span-3">
            <div className="box"><div className="box-body">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center"><i className={`${s.icon} text-emerald-500 text-xl`} /></span>
                <div><p className="text-sm text-gray-500">{s.label}</p><p className="text-xl font-bold dark:text-white">{s.count}</p></div>
              </div>
            </div></div>
          </div>
        ))}
      </div>

      <div className="box mb-5">
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-whatsapp-line text-emerald-500" /> WhatsApp Business Checker <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold ml-1">v11</span></h5></div>
        <div className="box-body">
          <p className="text-sm text-gray-500 mb-3">Enter phone numbers with country code (e.g. 919876543210). One per line. Max 50.</p>
          <textarea className="ti-form-input resize-y mb-3" rows={6} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"919876543210\n447911123456\n12025550100"} />
          <div className="flex gap-3 flex-wrap">
            <button onClick={check} disabled={loading} className="ti-btn ti-btn-outline border border-emerald-500 bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2 disabled:opacity-60">
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Checking...</> : <><i className="ri-whatsapp-line" /> Check WhatsApp</>}
            </button>
            {rows.length > 0 && <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-emerald-400 text-emerald-600 hover:bg-emerald-500 hover:text-white flex items-center gap-2"><i className="ri-download-2-line" /> Export CSV</button>}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      <div className="box">
        <div className="box-header"><h5 className="box-title">{loading ? <span className="flex items-center gap-2"><span className="ti-spinner w-4 h-4 border-emerald-400" />Checking...</span> : `Results (${rows.length})`}</h5></div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Phone Number</th><th className="px-4 py-3 text-left font-medium text-gray-500">Status</th><th className="px-4 py-3 text-left font-medium text-gray-500">WhatsApp</th><th className="px-4 py-3 text-left font-medium text-gray-500">Business</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono dark:text-white/80">{row.phone}</td>
                    <td className="px-4 py-3"><span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${statusColor(row.status)}`}>{row.status}</span></td>
                    <td className="px-4 py-3"><i className={`text-lg ${row.has_whatsapp ? "ri-checkbox-circle-fill text-emerald-500" : "ri-close-circle-fill text-red-400"}`} /></td>
                    <td className="px-4 py-3"><i className={`text-lg ${row.is_business ? "ri-checkbox-circle-fill text-emerald-500" : "ri-close-circle-fill text-red-400"}`} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <p className="text-center text-gray-400 py-10">{loading ? "Checking..." : "No data"}</p>}
        </div>
      </div>
    </div>
  );
}
