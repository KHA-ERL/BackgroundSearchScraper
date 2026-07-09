"use client";
import { useState } from "react";
import axios from "axios";

export default function LinkedInScraperPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [bulk, setBulk] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("single");

  async function search() {
    if (!input.trim()) { setError("Enter a LinkedIn URL."); return; }
    setError(""); setResult(null); setBulk([]); setLoading(true);
    try {
      if (mode === "single") {
        const res = await axios.post("/api/linkedin_scraper", { url: input.trim() });
        setResult(res.data);
      } else {
        const urls = input.split("\n").map((u) => u.trim()).filter(Boolean);
        const results = [];
        for (const url of urls.slice(0, 15)) {
          try {
            const res = await axios.post("/api/linkedin_scraper", { url });
            results.push(res.data);
          } catch { results.push({ url, profile_name: "Error", tagline: "N/A", followers: "N/A" }); }
        }
        setBulk(results);
      }
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape LinkedIn."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const data = bulk.length ? bulk : result ? [result] : [];
    const h = "URL,Profile Name,Tagline,Followers,About,Website";
    const b = data.map((r) => `"${r.url}","${r.profile_name}","${r.tagline}","${r.followers}","${(r.about || "").replace(/"/g, '""')}","${r.website || "N/A"}"`).join("\n");
    const blob = new Blob([h + "\n" + b], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "linkedin.csv"; a.click();
  }

  return (
    <div>
      <div className="box mb-5">
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-linkedin-line text-sky-600" /> LinkedIn Scraper <span className="text-xs bg-sky-100 text-sky-600 px-2 py-0.5 rounded font-semibold ml-1">v12</span></h5></div>
        <div className="box-body">
          <div className="flex gap-2 mb-4">
            {["single", "bulk"].map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${mode === m ? "bg-sky-600 border-sky-600 text-white" : "border-gray-200 text-gray-500 hover:border-sky-300"}`}>
                {m === "single" ? "Single Profile/Company" : "Bulk (one per line)"}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium text-gray-600 mb-1">{mode === "single" ? "LinkedIn URL" : "LinkedIn URLs (one per line, max 15)"}</label>
          {mode === "single"
            ? <input type="text" className="ti-form-input mb-3" value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://www.linkedin.com/company/example/" onKeyDown={(e) => e.key === "Enter" && search()} />
            : <textarea className="ti-form-input resize-y mb-3" rows={5} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"https://www.linkedin.com/company/microsoft/\nhttps://www.linkedin.com/in/username/"} />}
          <div className="flex gap-3 flex-wrap">
            <button onClick={search} disabled={loading} className="ti-btn ti-btn-outline border border-sky-600 bg-sky-600 text-white hover:bg-sky-700 flex items-center gap-2 disabled:opacity-60">
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-search-line" /> Scrape</>}
            </button>
            {(result || bulk.length > 0) && <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-sky-500 text-sky-600 hover:bg-sky-600 hover:text-white flex items-center gap-2"><i className="ri-download-2-line" /> Export CSV</button>}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {result && !bulk.length && (
        <div className="grid grid-cols-12 gap-5">
          {/* Profile card */}
          <div className="col-span-12 md:col-span-5">
            <div className="box h-full">
              <div className="box-body">
                <div className="flex items-center gap-4 mb-4">
                  {result.profile_image && result.profile_image !== "N/A" && (
                    <img src={result.profile_image} alt="Logo" className="w-16 h-16 rounded-lg object-cover border border-gray-100" onError={(e) => e.target.style.display = "none"} />
                  )}
                  <div>
                    <h2 className="text-lg font-bold dark:text-white">{result.profile_name}</h2>
                    <p className="text-sm text-gray-500">{result.tagline}</p>
                    <p className="text-xs text-sky-600 mt-0.5">{result.followers} followers</p>
                  </div>
                </div>
                {result.about && result.about !== "N/A" && <p className="text-sm text-gray-600 dark:text-white/70 line-clamp-5">{result.about}</p>}
                {result.website && result.website !== "N/A" && (
                  <a href={result.website} target="_blank" rel="noreferrer" className="text-sky-500 text-sm hover:underline mt-3 inline-flex items-center gap-1"><i className="ri-external-link-line" />{result.website}</a>
                )}
              </div>
            </div>
          </div>
          {/* Employees */}
          {result.employees?.length > 0 && (
            <div className="col-span-12 md:col-span-7">
              <div className="box">
                <div className="box-header"><h5 className="box-title">Employees</h5></div>
                <div className="box-body p-0">
                  <ul className="divide-y divide-gray-100 dark:divide-white/5">
                    {result.employees.map((e, i) => (
                      <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-8 h-8 rounded-full bg-sky-100 flex items-center justify-center text-sky-600 font-bold text-sm">{e.name?.[0] || "?"}</span>
                        <div className="flex-1 min-w-0">
                          <a href={e.profile_link} target="_blank" rel="noreferrer" className="text-sm font-medium text-sky-600 hover:underline truncate block">{e.name}</a>
                          <p className="text-xs text-gray-400 truncate">{e.role}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {bulk.length > 0 && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Results ({bulk.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Profile</th><th className="px-4 py-3 text-left font-medium text-gray-500">Tagline</th><th className="px-4 py-3 text-left font-medium text-gray-500">Followers</th><th className="px-4 py-3 text-left font-medium text-gray-500">Website</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {bulk.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3"><a href={r.url} target="_blank" rel="noreferrer" className="text-sky-600 hover:underline font-medium">{r.profile_name}</a></td>
                    <td className="px-4 py-3 text-gray-500 max-w-xs truncate">{r.tagline}</td>
                    <td className="px-4 py-3 dark:text-white/70">{r.followers}</td>
                    <td className="px-4 py-3">{r.website && r.website !== "N/A" ? <a href={r.website} target="_blank" rel="noreferrer" className="text-sky-500 hover:underline">{r.website}</a> : "N/A"}</td>
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
