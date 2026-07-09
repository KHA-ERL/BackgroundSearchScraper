"use client";
import { useState } from "react";
import axios from "axios";

const TABS = ["Private Limited", "GST Lookup"];

export default function CorporateScraperPage() {
  const [tab, setTab] = useState("Private Limited");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!query.trim()) {
      setError("Enter a company name or GST number.");
      return;
    }
    setError("");
    setRows([]);
    setLoading(true);
    try {
      const endpoint =
        tab === "Private Limited" ? "/api/corporate_scraper" : "/api/gst_lookup";
      const res = await axios.post(endpoint, { query });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = Object.keys(rows[0]);
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
    a.download = `${tab.toLowerCase().replace(/ /g, "-")}.csv`;
    a.click();
  }

  const isPL = tab === "Private Limited";
  const plHeaders = [
    "company_name",
    "cin",
    "roc",
    "incorporation_date",
    "status",
    "state",
    "authorized_capital",
    "paidup_capital",
  ];
  const gstHeaders = [
    "gstin",
    "legal_name",
    "trade_name",
    "state",
    "status",
    "registration_type",
    "registration_date",
  ];
  const headers = isPL ? plHeaders : gstHeaders;

  const stats = [
    {
      label: "Total Results",
      count: rows.length,
      icon: "ri-building-4-line",
      color: "blue",
    },
    {
      label: "Active",
      count: rows.filter(
        (r) =>
          (r.status || "").toLowerCase() === "active" ||
          (r.status || "").toLowerCase() === "active company"
      ).length,
      icon: "ri-checkbox-circle-line",
      color: "green",
    },
    {
      label: "Inactive / Struck Off",
      count: rows.filter(
        (r) =>
          (r.status || "").toLowerCase().includes("struck") ||
          (r.status || "").toLowerCase().includes("inactive")
      ).length,
      icon: "ri-close-circle-line",
      color: "red",
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
                  <span
                    className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      s.color === "blue"
                        ? "bg-blue-50"
                        : s.color === "green"
                        ? "bg-green-50"
                        : "bg-red-50"
                    }`}
                  >
                    <i
                      className={`${s.icon} text-xl ${
                        s.color === "blue"
                          ? "text-blue-600"
                          : s.color === "green"
                          ? "text-green-600"
                          : "text-red-500"
                      }`}
                    />
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

      {/* Input Card */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-building-4-line text-blue-700" /> Corporate Scraper
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-semibold ml-1">
              v15 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => {
                  setTab(t);
                  setRows([]);
                  setError("");
                  setQuery("");
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                  tab === t
                    ? t === "Private Limited"
                      ? "bg-blue-700 text-white border-blue-700"
                      : "bg-green-600 text-white border-green-600"
                    : "border-gray-200 text-gray-600 hover:border-blue-300"
                }`}
              >
                <i
                  className={`${
                    t === "Private Limited"
                      ? "ri-building-line"
                      : "ri-government-line"
                  } mr-1.5`}
                />
                {t}
              </button>
            ))}
          </div>

          {/* Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-1">
              {isPL ? "Company Name" : "GST Number (GSTIN)"}
            </label>
            <input
              type="text"
              className="ti-form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                isPL
                  ? "e.g. Tata Consultancy Services"
                  : "e.g. 29AABCT1332L000"
              }
              onKeyDown={(e) => e.key === "Enter" && run()}
            />
            <p className="text-xs text-gray-400 mt-1">
              {isPL
                ? "Search MCA India company database for Private Limited companies."
                : "Enter a valid 15-character GSTIN to look up GST registration details."}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={run}
              disabled={loading}
              className={`ti-btn ti-btn-outline flex items-center gap-2 disabled:opacity-60 text-white ${
                isPL
                  ? "border border-blue-700 bg-blue-700 hover:bg-blue-800"
                  : "border border-green-600 bg-green-600 hover:bg-green-700"
              }`}
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" />{" "}
                  Searching...
                </>
              ) : (
                <>
                  <i className="ri-search-line" /> Search
                </>
              )}
            </button>
            {rows.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <i className="ri-download-line" /> Export CSV
              </button>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Results Table */}
      {rows.length > 0 && (
        <div className="box">
          <div className="box-header">
            <h5 className="box-title">
              {isPL ? "Companies" : "GST Records"} ({rows.length})
            </h5>
          </div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-8">
                    #
                  </th>
                  {headers.map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left font-medium text-gray-500 capitalize whitespace-nowrap"
                    >
                      {h.replace(/_/g, " ")}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    {headers.map((h) => (
                      <td
                        key={h}
                        className="px-4 py-3 text-gray-600 text-xs dark:text-white/70 max-w-xs"
                      >
                        {h === "status" ? (
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              (r[h] || "").toLowerCase().includes("active")
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-600"
                            }`}
                          >
                            {r[h] || "—"}
                          </span>
                        ) : (
                          r[h] || "—"
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {rows.length === 0 && !loading && (
        <div className="box">
          <div className="box-body">
            <p className="text-center text-gray-400 py-10">
              No results yet. Enter a {isPL ? "company name" : "GSTIN"} and
              click Search.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
