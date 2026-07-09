"use client";
import { useState } from "react";
import axios from "axios";

export default function WhatsappNumberScraperPage() {
  const [urlsText, setUrlsText] = useState("");
  const [rows, setRows] = useState([]);
  const [allNumbers, setAllNumbers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function parseUrls() {
    return urlsText
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));
  }

  async function run() {
    const urls = parseUrls();
    if (!urls.length) {
      setError("Enter at least one valid URL (starting with http:// or https://).");
      return;
    }
    if (urls.length > 20) {
      setError("Maximum 20 URLs allowed at a time.");
      return;
    }
    setError("");
    setRows([]);
    setAllNumbers([]);
    setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp_number_scraper", { urls });
      const data = res.data.data || [];
      setRows(data);
      // Collect all unique numbers
      const numSet = new Set();
      data.forEach((r) => (r.numbers || []).forEach((n) => numSet.add(n)));
      setAllNumbers(Array.from(numSet));
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to scrape URLs.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = ["url", "numbers", "count"];
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        [
          `"${(r.url || "").replace(/"/g, '""')}"`,
          `"${(r.numbers || []).join(", ").replace(/"/g, '""')}"`,
          r.count || 0,
        ].join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "whatsapp-numbers.csv";
    a.click();
  }

  function copyAllNumbers() {
    if (!allNumbers.length) return;
    navigator.clipboard.writeText(allNumbers.join("\n")).catch(() => {});
  }

  function exportAllNumbersCSV() {
    if (!allNumbers.length) return;
    const csv = ["whatsapp_number", ...allNumbers].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "all-whatsapp-numbers.csv";
    a.click();
  }

  const urlList = parseUrls();
  const stats = [
    {
      label: "URLs Processed",
      count: rows.length,
      icon: "ri-global-line",
    },
    {
      label: "Total Unique Numbers",
      count: allNumbers.length,
      icon: "ri-whatsapp-line",
    },
    {
      label: "URLs with Numbers",
      count: rows.filter((r) => r.count > 0).length,
      icon: "ri-checkbox-circle-line",
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
                  <span className="w-10 h-10 rounded-full bg-lime-50 flex items-center justify-center">
                    <i className={`${s.icon} text-lime-600 text-xl`} />
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
            <i className="ri-whatsapp-line text-lime-600" /> WhatsApp Number Scraper
            <span className="text-xs bg-lime-100 text-lime-700 px-2 py-0.5 rounded font-semibold ml-1">
              v16 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              URLs to Scrape{" "}
              <span className="text-gray-400 font-normal">(one per line, max 20)</span>
            </label>
            <textarea
              className="ti-form-input min-h-[140px] font-mono text-xs"
              value={urlsText}
              onChange={(e) => setUrlsText(e.target.value)}
              placeholder={
                "https://www.example.com/contact\nhttps://www.business.com/about\nhttps://www.shop.com"
              }
            />
            <p className="text-xs text-gray-400 mt-1">
              {urlList.length} valid URL{urlList.length !== 1 ? "s" : ""} detected.
              Scraper will find WhatsApp numbers from wa.me links, whatsapp:// URIs, and
              WhatsApp API links.
            </p>
          </div>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-lime-600 bg-lime-600 text-white hover:bg-lime-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" /> Scraping...
                </>
              ) : (
                <>
                  <i className="ri-whatsapp-line" /> Scrape Numbers
                </>
              )}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <i className="ri-download-line" /> Export by URL
              </button>
            )}
            {allNumbers.length > 0 && (
              <button
                onClick={exportAllNumbersCSV}
                className="ti-btn ti-btn-outline border border-lime-500 text-lime-600 hover:bg-lime-50 flex items-center gap-2"
              >
                <i className="ri-download-2-line" /> Export All Numbers
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* All Numbers Combined */}
      {allNumbers.length > 0 && (
        <div className="box mb-5">
          <div className="box-header flex items-center justify-between">
            <h5 className="box-title flex items-center gap-2">
              <i className="ri-whatsapp-line text-lime-600" /> All Unique WhatsApp Numbers (
              {allNumbers.length})
            </h5>
            <button
              onClick={copyAllNumbers}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-lime-300 text-lime-700 hover:bg-lime-50 transition-colors"
            >
              <i className="ri-clipboard-line" /> Copy All
            </button>
          </div>
          <div className="box-body">
            <div className="flex flex-wrap gap-2">
              {allNumbers.map((num, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-lime-50 border border-lime-200 text-lime-800 text-xs px-3 py-1.5 rounded-full font-mono"
                >
                  <i className="ri-whatsapp-line" />
                  {num}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Per-URL Results */}
      <div className="box">
        <div className="box-header">
          <h5 className="box-title">Results by URL ({rows.length})</h5>
        </div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-8">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">URL</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">
                    WhatsApp Numbers Found
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-20">Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 max-w-[260px]">
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-lime-600 hover:underline text-xs break-all"
                      >
                        {r.url}
                      </a>
                    </td>
                    <td className="px-4 py-3">
                      {r.numbers && r.numbers.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {r.numbers.map((num, j) => (
                            <span
                              key={j}
                              className="inline-flex items-center gap-1 bg-lime-50 border border-lime-200 text-lime-800 text-xs px-2 py-0.5 rounded-full font-mono"
                            >
                              <i className="ri-whatsapp-line" />
                              {num}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">No numbers found</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-bold ${
                          (r.count || 0) > 0 ? "text-lime-600" : "text-gray-400"
                        }`}
                      >
                        {r.count || 0}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-10">
              {loading
                ? "Scraping URLs for WhatsApp numbers..."
                : "Enter URLs above and click Scrape Numbers to begin."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
