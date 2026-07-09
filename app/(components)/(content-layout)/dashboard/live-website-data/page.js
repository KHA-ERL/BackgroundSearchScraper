"use client";
import { useState } from "react";
import axios from "axios";

export default function LiveWebsiteDataPage() {
  const [url, setUrl] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!url.trim()) { setError("Enter a URL."); return; }
    setError(""); setResult(null); setLoading(true);
    try {
      const res = await axios.post("/api/live_website", { urls: [url.trim()] });
      const data = res.data.data?.[0] || null;
      setResult(data);
    } catch (e) { setError(e?.response?.data?.error || "Failed to extract website data."); }
    finally { setLoading(false); }
  }

  return (
    <div>
      {/* Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-database-2-line text-blue-600" /> Live Website Data Extractor
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 mb-1">Website URL</label>
          <input
            type="text"
            className="ti-form-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            onKeyDown={(e) => e.key === "Enter" && run()}
          />
          <div className="flex gap-3 flex-wrap mt-4">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Extracting...</> : <><i className="ri-database-2-line" /> Extract All Data</>}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Results */}
      {result && (
        <div className="grid grid-cols-12 gap-5">
          {/* Basic Info */}
          <div className="col-span-12 md:col-span-6">
            <div className="box h-full">
              <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-information-line text-blue-500" /> Page Info</h5></div>
              <div className="box-body">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">URL</p>
                    <a href={result.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm break-all">{result.url}</a>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Title</p>
                    <p className="text-sm dark:text-white/80">{result.title || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Meta Description</p>
                    <p className="text-sm dark:text-white/80">{result.meta_description || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-0.5">Status</p>
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold ${String(result.status).startsWith("2") ? "bg-green-100 text-green-700" : String(result.status).startsWith("3") ? "bg-yellow-100 text-yellow-700" : "bg-red-100 text-red-700"}`}>
                      {result.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* H1s */}
          <div className="col-span-12 md:col-span-6">
            <div className="box h-full">
              <div className="box-header"><h5 className="box-title flex items-center gap-2"><i className="ri-heading text-blue-500" /> Headings & Counts</h5></div>
              <div className="box-body">
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-400 uppercase font-semibold mb-1">H1 Tags (first 3)</p>
                    {result.h1s && result.h1s.length > 0
                      ? result.h1s.map((h, i) => <p key={i} className="text-sm dark:text-white/80 bg-blue-50 dark:bg-blue-900/20 rounded px-2 py-1 mb-1">{h}</p>)
                      : <p className="text-sm text-gray-400">No H1 tags found</p>}
                  </div>
                  <div className="flex gap-4 mt-2">
                    <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded p-3 flex-1">
                      <p className="text-2xl font-bold text-blue-600">{result.links_count ?? 0}</p>
                      <p className="text-xs text-gray-500">Total Links</p>
                    </div>
                    <div className="text-center bg-blue-50 dark:bg-blue-900/20 rounded p-3 flex-1">
                      <p className="text-2xl font-bold text-blue-600">{result.images_count ?? 0}</p>
                      <p className="text-xs text-gray-500">Total Images</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
