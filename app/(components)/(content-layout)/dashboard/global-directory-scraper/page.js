"use client";
import { useState } from "react";
import axios from "axios";

const DIRS = [
  { id: "yellowpages", label: "Yellow Pages", icon: "ri-pages-line" },
  { id: "yelp", label: "Yelp", icon: "ri-star-line" },
  { id: "foursquare", label: "Foursquare", icon: "ri-map-2-line" },
  { id: "hotfrog", label: "Hotfrog", icon: "ri-fire-line" },
];

export default function GlobalDirectoryScraperPage() {
  const [directory, setDirectory] = useState("yellowpages");
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!query.trim()) {
      setError("Enter a business type or keywords.");
      return;
    }
    setError("");
    setRows([]);
    setLoading(true);
    try {
      const res = await axios.post("/api/global_directory", {
        directory,
        query,
        location,
        maxResults: Number(maxResults),
      });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to scrape directory.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = [
      "name",
      "phone",
      "address",
      "website",
      "rating",
      "category",
      "source",
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
    a.download = `${directory}-directory.csv`;
    a.click();
  }

  const activeDir = DIRS.find((d) => d.id === directory);

  return (
    <div>
      <div className="box mb-5 border-l-4 border-l-cyan-400">
        <div className="box-body py-3">
          <p className="text-sm text-gray-600">
            <i className="ri-information-line text-cyan-500 mr-2" />
            Scrapes publicly listed business data from global directories including
            Yellow Pages, Yelp, Foursquare, and Hotfrog. Results may vary by
            region and directory availability.
          </p>
        </div>
      </div>

      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-earth-line text-cyan-600" />
            Global Directory Scraper
            <span className="text-xs bg-cyan-100 text-cyan-700 px-2 py-0.5 rounded font-semibold ml-1">
              v17 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          {/* Directory tabs */}
          <div className="flex gap-2 mb-5 flex-wrap">
            {DIRS.map((d) => (
              <button
                key={d.id}
                onClick={() => {
                  setDirectory(d.id);
                  setRows([]);
                  setError("");
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                  directory === d.id
                    ? "bg-cyan-600 text-white border-cyan-600 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:border-cyan-300 hover:text-cyan-600 bg-white"
                }`}
              >
                <i className={d.icon} />
                {d.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-5">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Business Type / Keywords
              </label>
              <input
                className="ti-form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="e.g. plumbers, restaurants, electricians"
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Location / City
              </label>
              <input
                className="ti-form-input"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. New York, London, Sydney"
                onKeyDown={(e) => e.key === "Enter" && run()}
              />
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Max Results
              </label>
              <input
                type="number"
                className="ti-form-input"
                value={maxResults}
                min={5}
                max={50}
                onChange={(e) => setMaxResults(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" />
                  Scraping...
                </>
              ) : (
                <>
                  <i className="ri-search-line" />
                  Scrape {activeDir?.label || "Directory"}
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
            <h5 className="box-title flex items-center gap-2">
              <i className={activeDir?.icon + " text-cyan-600"} />
              {activeDir?.label} Results ({rows.length})
            </h5>
          </div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "#",
                    "Business Name",
                    "Phone",
                    "Address",
                    "Website",
                    "Rating",
                    "Category",
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
                    <td className="px-4 py-3 font-medium text-gray-800">
                      {r.name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm font-mono whitespace-nowrap">
                      {r.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs max-w-[180px] truncate">
                      {r.address || "—"}
                    </td>
                    <td className="px-4 py-3">
                      {r.website && r.website !== "—" ? (
                        <a
                          href={
                            r.website.startsWith("http")
                              ? r.website
                              : `https://${r.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-600 hover:underline text-xs truncate block max-w-[120px]"
                        >
                          {r.website}
                        </a>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {r.rating ? (
                        <span className="flex items-center gap-1 text-yellow-500">
                          <i className="ri-star-fill text-xs" />
                          {r.rating}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {r.category || "—"}
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
            <i className="ri-earth-line text-5xl text-cyan-200" />
            <p className="text-gray-400 mt-3">
              Select a directory, enter a business type and location, then click
              &quot;Scrape Directory&quot;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
