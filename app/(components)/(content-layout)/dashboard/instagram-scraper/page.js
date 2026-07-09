"use client";
import { useState } from "react";
import axios from "axios";

export default function InstagramScraperPage() {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [bulk, setBulk] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState("single"); // single | bulk

  async function search() {
    if (!input.trim()) { setError("Enter an Instagram URL or username."); return; }
    setError(""); setResult(null); setBulk([]); setLoading(true);
    try {
      if (mode === "single") {
        const res = await axios.post("/api/instagram_scraper", { url: input.trim() });
        setResult(res.data);
      } else {
        const urls = input.split("\n").map((u) => u.trim()).filter(Boolean);
        const results = [];
        for (const url of urls.slice(0, 20)) {
          try {
            const res = await axios.post("/api/instagram_scraper", { url });
            results.push(res.data);
          } catch { results.push({ url, profile_name: "Error", followers: "N/A", following: "N/A", posts: "N/A", bio: "N/A" }); }
        }
        setBulk(results);
      }
    } catch (e) { setError(e?.response?.data?.error || "Failed to scrape Instagram."); }
    finally { setLoading(false); }
  }

  function exportCSV() {
    const data = bulk.length ? bulk : result ? [result] : [];
    const h = "URL,Profile Name,Full Name,Followers,Following,Posts,Bio,External Link";
    const b = data.map((r) => `"${r.url}","${r.profile_name}","${r.full_name || "N/A"}","${r.followers}","${r.following}","${r.posts}","${(r.bio || "").replace(/"/g, '""')}","${r.external_link || "N/A"}"`).join("\n");
    const blob = new Blob([h + "\n" + b], { type: "text/csv" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "instagram.csv"; a.click();
  }

  return (
    <div>
      <div className="box mb-5">
        <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-instagram-line text-pink-500" /> Instagram Scraper <span className="text-xs bg-pink-100 text-pink-600 px-2 py-0.5 rounded font-semibold ml-1">v11</span></h5></div>
        <div className="box-body">
          {/* Mode toggle */}
          <div className="flex gap-2 mb-4">
            {["single", "bulk"].map((m) => (
              <button key={m} onClick={() => setMode(m)} className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${mode === m ? "bg-pink-500 border-pink-500 text-white" : "border-gray-200 text-gray-500 hover:border-pink-300"}`}>
                {m === "single" ? "Single Profile" : "Bulk (one per line)"}
              </button>
            ))}
          </div>
          <label className="block text-sm font-medium text-gray-600 mb-1">{mode === "single" ? "Instagram URL or @username" : "Instagram URLs (one per line, max 20)"}</label>
          {mode === "single"
            ? <input type="text" className="ti-form-input mb-3" value={input} onChange={(e) => setInput(e.target.value)} placeholder="https://www.instagram.com/username/ or @username" onKeyDown={(e) => e.key === "Enter" && search()} />
            : <textarea className="ti-form-input resize-y mb-3" rows={5} value={input} onChange={(e) => setInput(e.target.value)} placeholder={"https://www.instagram.com/user1/\nhttps://www.instagram.com/user2/"} />}
          <div className="flex gap-3 flex-wrap">
            <button onClick={search} disabled={loading} className="ti-btn ti-btn-outline border border-pink-500 bg-pink-500 text-white hover:bg-pink-600 flex items-center gap-2 disabled:opacity-60">
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</> : <><i className="ri-search-line" /> Scrape</>}
            </button>
            {(result || bulk.length > 0) && <button onClick={exportCSV} className="ti-btn ti-btn-outline border border-pink-400 text-pink-600 hover:bg-pink-500 hover:text-white flex items-center gap-2"><i className="ri-download-2-line" /> Export CSV</button>}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Single result card */}
      {result && !bulk.length && (
        <div className="box">
          <div className="box-body">
            <div className="flex items-start gap-5 flex-wrap">
              {result.profile_image && result.profile_image !== "N/A" && (
                <img src={result.profile_image} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-pink-200" onError={(e) => e.target.style.display = "none"} />
              )}
              <div className="flex-1">
                <h2 className="text-xl font-bold dark:text-white">{result.profile_name}</h2>
                <p className="text-gray-500 text-sm">{result.full_name}</p>
                <p className="text-sm mt-2 dark:text-white/70">{result.bio}</p>
                <div className="flex gap-6 mt-3">
                  {[["Posts", result.posts], ["Followers", result.followers], ["Following", result.following]].map(([l, v]) => (
                    <div key={l} className="text-center"><p className="font-bold text-lg dark:text-white">{v}</p><p className="text-xs text-gray-500">{l}</p></div>
                  ))}
                </div>
                {result.external_link && result.external_link !== "N/A" && (
                  <a href={result.external_link} target="_blank" rel="noreferrer" className="text-pink-500 text-sm hover:underline mt-2 inline-block">{result.external_link}</a>
                )}
              </div>
            </div>
            {result.recent_posts?.length > 0 && (
              <div className="mt-5">
                <h4 className="font-semibold text-sm text-gray-600 mb-2">Recent Posts</h4>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-2">
                  {result.recent_posts.slice(0, 12).map((p, i) => (
                    p.thumbnail && <img key={i} src={p.thumbnail} alt={p.alt} className="w-full aspect-square object-cover rounded-md" onError={(e) => e.target.style.display = "none"} />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bulk results table */}
      {bulk.length > 0 && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Results ({bulk.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5"><tr><th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th><th className="px-4 py-3 text-left font-medium text-gray-500">Profile</th><th className="px-4 py-3 text-left font-medium text-gray-500">Followers</th><th className="px-4 py-3 text-left font-medium text-gray-500">Following</th><th className="px-4 py-3 text-left font-medium text-gray-500">Posts</th><th className="px-4 py-3 text-left font-medium text-gray-500">Bio</th></tr></thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {bulk.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3"><a href={r.url} target="_blank" rel="noreferrer" className="text-pink-500 hover:underline font-medium">{r.profile_name}</a></td>
                    <td className="px-4 py-3 dark:text-white/70">{r.followers}</td>
                    <td className="px-4 py-3 dark:text-white/70">{r.following}</td>
                    <td className="px-4 py-3 dark:text-white/70">{r.posts}</td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-sm truncate">{r.bio}</td>
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
