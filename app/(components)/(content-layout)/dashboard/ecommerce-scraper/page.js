"use client";
import { useState } from "react";
import axios from "axios";

const PLATFORMS = [
  { id: "amazon", label: "Amazon.in", icon: "ri-shopping-bag-line", color: "text-orange-500", accentClass: "border-orange-500 bg-orange-500" },
  { id: "flipkart", label: "Flipkart", icon: "ri-store-2-line", color: "text-blue-500", accentClass: "border-blue-500 bg-blue-500" },
];

export default function EcommerceScraperPage() {
  const [platform, setPlatform] = useState("amazon");
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const activePlatform = PLATFORMS.find(p => p.id === platform);

  function switchPlatform(pid) {
    setPlatform(pid);
    setRows([]);
    setError("");
  }

  async function run() {
    if (!query.trim()) { setError("Enter a product search query."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/ecommerce_scraper", {
        platform,
        query: query.trim(),
        maxResults: Math.min(50, Math.max(1, Number(maxResults))),
      });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to scrape. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = ["Name", "Price", "Rating", "Reviews", "Seller", "URL", "Image"];
    const csv = [
      headers.join(","),
      ...rows.map(r =>
        [r.name, r.price, r.rating, r.reviews, r.seller, r.url, r.image]
          .map(v => `"${(v || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = `${platform}-products.csv`;
    a.click();
  }

  const stats = [
    {
      label: "Total Products",
      value: rows.length,
      icon: "ri-shopping-cart-line",
      bg: "bg-orange-50",
      iconColor: "text-orange-500",
    },
    {
      label: "With Rating",
      value: rows.filter(r => r.rating && r.rating !== "N/A").length,
      icon: "ri-star-line",
      bg: "bg-yellow-50",
      iconColor: "text-yellow-500",
    },
    {
      label: "With Price",
      value: rows.filter(r => r.price && r.price !== "N/A").length,
      icon: "ri-price-tag-3-line",
      bg: "bg-green-50",
      iconColor: "text-green-500",
    },
  ];

  return (
    <div>
      {/* Info Banner */}
      <div className="box mb-5 border-l-4 border-l-orange-500">
        <div className="box-body py-3">
          <p className="text-sm text-gray-600">
            <i className="ri-information-line text-orange-500 mr-2" />
            eCommerce product scraper — extract product listings, prices, ratings, and seller info from Amazon.in and Flipkart.
          </p>
        </div>
      </div>

      {/* Stats row */}
      {rows.length > 0 && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {stats.map(s => (
            <div key={s.label} className="col-span-12 md:col-span-4">
              <div className="box">
                <div className="box-body">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center`}>
                      <i className={`${s.icon} ${s.iconColor} text-xl`} />
                    </span>
                    <div>
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <p className="text-xl font-bold text-defaulttextcolor dark:text-white">{s.value}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Input Box */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-shopping-cart-line text-orange-500" />
            eCommerce Seller Scraper
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-semibold ml-1">NEW v14</span>
          </h5>
        </div>
        <div className="box-body">
          {/* Platform tabs */}
          <div className="flex gap-2 flex-wrap mb-5">
            {PLATFORMS.map(p => (
              <button
                key={p.id}
                onClick={() => switchPlatform(p.id)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  platform === p.id
                    ? `${p.accentClass} text-white shadow-sm`
                    : "border-gray-200 text-gray-600 hover:border-gray-300"
                }`}
              >
                <i className={`${p.icon} ${platform === p.id ? "text-white" : p.color}`} />
                {p.label}
              </button>
            ))}
          </div>

          {/* Inputs */}
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-9">
              <label className="block text-sm font-medium text-gray-600 mb-1">Product Search Query</label>
              <input
                type="text"
                className="ti-form-input"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => e.key === "Enter" && run()}
                placeholder={platform === "amazon" ? "e.g. wireless earphones, laptop stand" : "e.g. mobile phones under 15000"}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">Max Results (1–50)</label>
              <input
                type="number"
                className="ti-form-input"
                value={maxResults}
                min={1}
                max={50}
                onChange={e => setMaxResults(Math.min(50, Math.max(1, Number(e.target.value))))}
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className={`ti-btn ti-btn-outline border text-white flex items-center gap-2 disabled:opacity-60 ${activePlatform?.accentClass} hover:opacity-90`}
            >
              {loading ? (
                <><span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...</>
              ) : (
                <><i className="ri-search-line" /> Scrape {activePlatform?.label}</>
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
          {error && <p className="text-red-500 text-sm mt-3"><i className="ri-error-warning-line mr-1" />{error}</p>}
        </div>
      </div>

      {/* Results Table */}
      {rows.length > 0 && (
        <div className="box">
          <div className="box-header flex items-center justify-between">
            <h5 className="box-title flex items-center gap-2">
              <i className={`${activePlatform?.icon} ${activePlatform?.color}`} />
              {rows.length} Products from {activePlatform?.label}
            </h5>
          </div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 w-8">#</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500 w-14">Image</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Product Name</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Price</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Rating</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Reviews</th>
                  <th className="px-3 py-3 text-left font-medium text-gray-500">Seller</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-3 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-3 py-3">
                      {r.image && r.image !== "N/A" ? (
                        <img
                          src={r.image}
                          alt={r.name}
                          className="w-12 h-12 object-contain rounded border border-gray-100"
                          onError={e => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-12 h-12 bg-gray-100 rounded flex items-center justify-center">
                          <i className="ri-image-line text-gray-300" />
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-3 max-w-xs">
                      {r.url && r.url !== "N/A" ? (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-orange-600 hover:underline font-medium line-clamp-2 text-sm"
                        >
                          {r.name || "N/A"}
                        </a>
                      ) : (
                        <span className="font-medium text-gray-800 dark:text-white line-clamp-2">{r.name || "N/A"}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 font-semibold text-green-600 whitespace-nowrap">
                      {r.price && r.price !== "N/A" ? r.price : <span className="text-gray-400 font-normal">N/A</span>}
                    </td>
                    <td className="px-3 py-3">
                      {r.rating && r.rating !== "N/A" ? (
                        <span className="flex items-center gap-1 text-yellow-500 font-medium">
                          <i className="ri-star-fill text-xs" /> {r.rating}
                        </span>
                      ) : <span className="text-gray-400">N/A</span>}
                    </td>
                    <td className="px-3 py-3 text-gray-500 text-xs">{r.reviews || "N/A"}</td>
                    <td className="px-3 py-3 text-gray-500 text-xs max-w-xs truncate">{r.seller || "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && rows.length === 0 && !error && (
        <div className="box">
          <div className="box-body py-12 text-center">
            <i className="ri-shopping-cart-line text-5xl text-orange-200 mb-3 block" />
            <p className="text-gray-400 text-sm">Select a platform, enter a product query, and click Scrape.</p>
          </div>
        </div>
      )}
    </div>
  );
}
