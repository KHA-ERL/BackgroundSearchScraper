"use client";
import { useState } from "react";
import axios from "axios";

const columns = [
  { key: "name", header: "Product Name" },
  { key: "brand", header: "Brand" },
  { key: "price", header: "Price" },
  { key: "original_price", header: "Original Price" },
  { key: "discount", header: "Discount %" },
  { key: "rating", header: "Rating" },
  { key: "url", header: "URL" },
];

export default function SnapdealScraperPage() {
  const [query, setQuery] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!query.trim()) {
      setError("Enter a search query.");
      return;
    }
    setError("");
    setRows([]);
    setLoading(true);
    try {
      const res = await axios.post("/api/snapdeal_scraper", {
        query,
        maxResults: Math.min(Number(maxResults) || 20, 50),
      });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to scrape Snapdeal.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows
      .map((r) =>
        columns
          .map((c) => `"${(r[c.key] || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "snapdeal-products.csv";
    a.click();
  }

  const stats = [
    {
      label: "Total Products",
      count: rows.length,
      icon: "ri-store-line",
    },
    {
      label: "With Discount",
      count: rows.filter((r) => r.discount && r.discount !== "—" && r.discount !== "").length,
      icon: "ri-coupon-line",
    },
    {
      label: "Rated Products",
      count: rows.filter((r) => r.rating && r.rating !== "—" && r.rating !== "").length,
      icon: "ri-star-line",
    },
  ];

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                    <i className={`${s.icon} text-red-500 text-xl`} />
                  </span>
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-defaulttextcolor dark:text-white">
                      {s.count}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-store-line text-red-500" /> Snapdeal Scraper
            <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded font-semibold ml-1">
              v15 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-9">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Search Query
              </label>
              <input
                type="text"
                className="ti-form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. Mobile phones, Laptops, Kitchen appliances"
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Max Results (up to 50)
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
              className="ti-btn ti-btn-outline border border-red-500 bg-red-500 text-white hover:bg-red-600 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...
                </>
              ) : (
                <>
                  <i className="ri-search-line" /> Search Snapdeal
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
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Results */}
      <div className="box">
        <div className="box-header">
          <h5 className="box-title">Products ({rows.length})</h5>
        </div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-8">#</th>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap"
                    >
                      {c.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className="px-4 py-3 text-sm max-w-xs dark:text-white/70"
                      >
                        {c.key === "url" && row[c.key] ? (
                          <a
                            href={row[c.key]}
                            target="_blank"
                            rel="noreferrer"
                            className="text-red-500 hover:underline text-xs"
                          >
                            View
                          </a>
                        ) : c.key === "discount" && row[c.key] ? (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-medium">
                            {row[c.key]}
                          </span>
                        ) : c.key === "price" ? (
                          <span className="text-green-600 font-medium text-xs">
                            {row[c.key] || "—"}
                          </span>
                        ) : c.key === "original_price" ? (
                          <span className="text-gray-400 line-through text-xs">
                            {row[c.key] || "—"}
                          </span>
                        ) : c.key === "rating" && row[c.key] ? (
                          <span className="flex items-center gap-1 text-xs">
                            <i className="ri-star-fill text-yellow-400" />
                            {row[c.key]}
                          </span>
                        ) : (
                          <span className="text-xs">{row[c.key] || "—"}</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-10">
              {loading ? "Scraping Snapdeal..." : "No products to display"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
