"use client";
import { useState } from "react";
import axios from "axios";

const CATEGORIES = [
  "E-Commerce",
  "Retail",
  "Real Estate",
  "Education",
  "Healthcare",
  "Automobile",
  "Food & Restaurants",
  "Fashion & Apparel",
  "Electronics",
  "Beauty & Wellness",
  "Travel & Tourism",
  "Finance & Banking",
  "Insurance",
  "Home Services",
  "Logistics",
];

const STATES = [
  "All India",
  "Andhra Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
];

const DATA_TYPES = [
  { value: "Consumer Contacts", label: "Consumer Contacts", icon: "ri-user-line" },
  { value: "Product Reviews", label: "Product Reviews", icon: "ri-star-line" },
  { value: "Social Media", label: "Social Media Profiles", icon: "ri-share-line" },
];

export default function B2CDataPage() {
  const [category, setCategory] = useState("E-Commerce");
  const [state, setState] = useState("All India");
  const [city, setCity] = useState("");
  const [dataType, setDataType] = useState("Consumer Contacts");
  const [maxResults, setMaxResults] = useState(20);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setError("");
    setRows([]);
    setLoading(true);
    try {
      const res = await axios.post("/api/b2c_data", {
        category,
        state,
        city,
        dataType,
        maxResults: Number(maxResults),
      });
      setRows(res.data.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to fetch B2C data.");
    } finally {
      setLoading(false);
    }
  }

  function exportCSV() {
    if (!rows.length) return;
    const headers = [
      "name",
      "phone",
      "email",
      "city",
      "state",
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
    a.download = `b2c-data-${category.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
  }

  return (
    <div>
      <div className="box mb-5 border-l-4 border-l-violet-400">
        <div className="box-body py-3">
          <p className="text-sm text-gray-600">
            <i className="ri-shield-check-line text-violet-500 mr-2" />
            This tool accesses only publicly available consumer data from public
            review platforms, directories, and social media profiles. No private
            or gated data is accessed.
          </p>
        </div>
      </div>

      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-database-line text-violet-600" />
            B2C Data Access
            <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded font-semibold ml-1">
              v18 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          {/* Data type selector */}
          <div className="flex gap-3 mb-5 flex-wrap">
            {DATA_TYPES.map((dt) => (
              <button
                key={dt.value}
                onClick={() => {
                  setDataType(dt.value);
                  setRows([]);
                  setError("");
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  dataType === dt.value
                    ? "bg-violet-600 text-white border-violet-600 shadow-sm"
                    : "border-gray-200 text-gray-600 hover:border-violet-300 hover:text-violet-600 bg-white"
                }`}
              >
                <i className={dt.icon} />
                {dt.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Category / Industry
              </label>
              <select
                className="ti-form-input"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                State
              </label>
              <select
                className="ti-form-input"
                value={state}
                onChange={(e) => setState(e.target.value)}
              >
                {STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="col-span-12 md:col-span-3">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                City (optional)
              </label>
              <input
                className="ti-form-input"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mumbai, Bangalore"
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
              className="ti-btn ti-btn-outline border border-violet-600 bg-violet-600 text-white hover:bg-violet-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" />
                  Fetching...
                </>
              ) : (
                <>
                  <i className="ri-database-line" />
                  Fetch B2C Data
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
              <i className="ri-database-line text-violet-600" />
              Results — {dataType} ({rows.length})
            </h5>
          </div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "#",
                    "Name",
                    "Phone",
                    "Email",
                    "City",
                    "State",
                    "Category",
                    "Source",
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
                      {r.name || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 text-sm whitespace-nowrap">
                      {r.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-blue-600 text-xs whitespace-nowrap">
                      {r.email ? (
                        <a
                          href={`mailto:${r.email}`}
                          className="hover:underline"
                        >
                          {r.email}
                        </a>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.city || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {r.state || "—"}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      <span className="bg-violet-50 text-violet-600 px-2 py-0.5 rounded-full font-medium">
                        {r.category || category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {r.source || "—"}
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
            <i className="ri-database-line text-5xl text-violet-200" />
            <p className="text-gray-400 mt-3">
              Select a category, state, and data type, then click &quot;Fetch B2C
              Data&quot;.
            </p>
            <p className="text-gray-300 text-xs mt-2">
              Only publicly available data is accessed.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
