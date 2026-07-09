"use client";
import { useState, useEffect, useRef } from "react";
import axios from "axios";
import ResultsTable from "../../../../../components/ResultsTable";
import { useToast } from "../../../../../components/ToastProvider";
import { trackRun } from "../home/page";

const columns = [
  { key: "name",         header: "Name",     width: "180px" },
  { key: "rating",       header: "Rating",   width: "70px" },
  { key: "review_count", header: "Reviews",  width: "80px" },
  { key: "phone",        header: "Phone",    width: "140px" },
  { key: "address",      header: "Address",  width: "200px" },
  {
    key: "website",
    header: "Website",
    width: "160px",
    render: (val) =>
      val && val !== "N/A" ? (
        <a href={val} target="_blank" rel="noreferrer" className="text-green-600 hover:underline truncate block max-w-[150px]">
          {val.replace(/^https?:\/\//, "")}
        </a>
      ) : "N/A",
  },
  { key: "category", header: "Category", width: "130px" },
];

export default function GoogleMapScraperPage() {
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");
  const [maxResults, setMaxResults] = useState(20);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    if (loading) {
      const start = Date.now();
      timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    } else {
      clearInterval(timerRef.current);
      setElapsed(0);
    }
    return () => clearInterval(timerRef.current);
  }, [loading]);

  const stats = [
    { label: "Total Results", count: rows.length, icon: "ri-map-pin-line", color: "green" },
    { label: "With Phone", count: rows.filter((r) => r.phone && r.phone !== "N/A").length, icon: "ri-phone-line", color: "teal" },
    { label: "With Website", count: rows.filter((r) => r.website && r.website !== "N/A").length, icon: "ri-global-line", color: "blue" },
  ];

  async function run() {
    if (!query.trim()) { setError("Enter a search query."); return; }
    setError(""); setRows([]); setLoading(true);
    try {
      const res = await axios.post("/api/google_map_scraper/", { query, city, maxResults: Number(maxResults) });
      const data = res.data.data || [];
      setRows(data);
      trackRun("Google Maps");
      toast({
        type: data.length > 0 ? "success" : "warning",
        title: data.length > 0 ? `Found ${data.length} results` : "No results found",
        message: data.length > 0 ? "Scrape completed successfully" : "Try a different query or location",
      });
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to scrape Google Maps.";
      setError(msg);
      toast({ type: "error", title: "Scrape failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-12 gap-5 mb-5">
        {stats.map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-4">
            <div className="box">
              <div className="box-body">
                <div className="flex items-center gap-3">
                  <span className={`w-10 h-10 rounded-full bg-${s.color}-50 flex items-center justify-center`}>
                    <i className={`${s.icon} text-${s.color}-500 text-xl`} />
                  </span>
                  <div>
                    <p className="text-sm text-gray-500">{s.label}</p>
                    <p className="text-xl font-bold text-defaulttextcolor dark:text-white">{s.count}</p>
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
            <i className="ri-map-pin-line text-green-600" /> Google Maps Scraper
          </h5>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-6">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Search Query</label>
              <input
                type="text"
                className="ti-form-input"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="e.g. Restaurants, Plumbers, Coffee shops"
              />
            </div>
            <div className="col-span-12 md:col-span-4">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">City (optional)</label>
              <input
                type="text"
                className="ti-form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="e.g. New York, London"
              />
            </div>
            <div className="col-span-12 md:col-span-2">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Max Results</label>
              <input
                type="number"
                className="ti-form-input"
                value={maxResults}
                onChange={(e) => setMaxResults(Math.min(50, Math.max(1, Number(e.target.value))))}
                min="1" max="50"
              />
            </div>
          </div>
          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-green-600 bg-green-600 text-white hover:bg-green-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" />
                  Scraping… {elapsed > 0 && <span className="text-green-100 text-xs">({elapsed}s)</span>}
                </>
              ) : (
                <><i className="ri-search-line" /> Scrape Maps</>
              )}
            </button>
            {loading && (
              <p className="text-xs text-gray-400 animate-pulse">
                <i className="ri-time-line mr-1" />Google Maps typically takes 30–90s…
              </p>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2"><i className="ri-error-warning-line mr-1" />{error}</p>}
        </div>
      </div>

      <ResultsTable
        rows={rows}
        columns={columns}
        loading={loading}
        title="Maps Results"
        filename="google_maps"
        accentColor="green"
        dedupeKey="phone"
        filterKeys={["name", "phone", "address", "category", "website"]}
        emptyMsg="No results yet. Enter a query and click Scrape Maps."
      />
    </div>
  );
}
