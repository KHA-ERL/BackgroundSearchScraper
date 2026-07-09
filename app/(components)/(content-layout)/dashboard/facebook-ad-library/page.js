"use client";
import { useState } from "react";
import axios from "axios";

const COUNTRIES = ["IN", "US", "GB", "CA", "AU", "DE", "FR", "SG", "JP", "BR"];

export default function FacebookAdLibraryPage() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("IN");
  const [adType, setAdType] = useState("ALL");
  const [maxResults, setMaxResults] = useState(20);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!query.trim()) {
      setError("Enter an advertiser name or keyword.");
      return;
    }
    setError("");
    setRows([]);
    setLoading(true);
    try {
      const res = await axios.post("/api/facebook_ad_library", {
        query,
        country,
        adType,
        maxResults: Number(maxResults),
      });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to scrape ads.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = [
      "advertiser",
      "ad_text",
      "status",
      "start_date",
      "platforms",
      "spend",
      "impressions",
      "url",
    ];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers
          .map((h) => `"${(r[h] || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "fb-ads.csv";
    a.click();
  }

  return (
    <div>
      <div className="box mb-5 border-l-4 border-l-orange-400">
        <div className="box-body py-3">
          <p className="text-sm text-gray-600">
            <i className="ri-information-line text-orange-500 mr-2" />
            Scrapes publicly available ads from Facebook Ad Library. Only public
            ad data is accessible. Results depend on active ads in the selected
            country and category.
          </p>
        </div>
      </div>

      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-advertisement-line text-orange-500" />
            Facebook Ad Library Scraper
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-semibold ml-1">
              v17 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-5">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Search Query
              </label>
              <input
                className="ti-form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Nike, Amazon, iPhone"
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="col-span-6 md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Country
              </label>
              <select
                className="ti-form-input"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-6 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Ad Type
              </label>
              <select
                className="ti-form-input"
                value={adType}
                onChange={(e) => setAdType(e.target.value)}
              >
                <option value="ALL">All Ads</option>
                <option value="POLITICAL_AND_ISSUE_ADS">
                  Political &amp; Issues
                </option>
              </select>
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Max Results
              </label>
              <input
                type="number"
                className="ti-form-input"
                value={maxResults}
                min={1}
                max={50}
                onChange={(e) => setMaxResults(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-orange-500 bg-orange-500 text-white hover:bg-orange-600 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" />
                  Scraping...
                </>
              ) : (
                <>
                  <i className="ri-advertisement-line" />
                  Scrape Ads
                </>
              )}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <i className="ri-download-line" /> Export CSV ({rows.length})
              </button>
            )}
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-2">
              <i className="ri-error-warning-line mr-1" />
              {error}
            </p>
          )}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="box">
          <div className="box-header">
            <h5 className="box-title">
              Ads Found ({rows.length})
            </h5>
          </div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "#",
                    "Advertiser",
                    "Ad Preview",
                    "Status",
                    "Started",
                    "Platforms",
                    "Spend",
                    "Impressions",
                    "Link",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {r.advertiser || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">
                      {r.ad_text || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                          r.status === "Active"
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {r.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {r.start_date || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.platforms || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.spend || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.impressions || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.url ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-500 hover:underline text-xs"
                        >
                          View
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!loading && rows.length === 0 && !error && (
        <div className="box">
          <div className="box-body text-center py-12">
            <i className="ri-advertisement-line text-5xl text-orange-200" />
            <p className="text-gray-400 mt-3">
              Enter a search query and click &quot;Scrape Ads&quot; to get started.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
