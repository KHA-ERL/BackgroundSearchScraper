"use client";
import { useState, useEffect } from "react";
import axios from "axios";

const STATUSES = ["New", "Contacted", "Quoted", "Order Placed", "Not Interested"];

const STATUS_COLORS = {
  New: "bg-blue-100 text-blue-700",
  Contacted: "bg-yellow-100 text-yellow-700",
  Quoted: "bg-purple-100 text-purple-700",
  "Order Placed": "bg-green-100 text-green-700",
  "Not Interested": "bg-red-100 text-red-600",
};

export default function IndiaмартEnquiryPage() {
  const [url, setUrl] = useState("");
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("im_enquiry_leads");
      if (saved) setLeads(JSON.parse(saved));
    } catch (_) {}
  }, []);

  function saveLeads(newLeads) {
    setLeads(newLeads);
    try {
      localStorage.setItem("im_enquiry_leads", JSON.stringify(newLeads));
    } catch (_) {}
  }

  async function importLeads() {
    if (!url.trim()) {
      setError("Enter an Indiamart seller or product URL.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const res = await axios.post("/api/indiamart_enquiry", { url });
      const newLeads = (res.data.data || []).map((l, i) => ({
        ...l,
        id: Date.now() + i,
        status: "New",
        notes: "",
      }));
      if (newLeads.length === 0) {
        setError(
          "No leads found at this URL. The page may require seller login or have no public enquiry data."
        );
      } else {
        saveLeads([...leads, ...newLeads]);
        setUrl("");
      }
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to import leads.");
    } finally {
      setLoading(false);
    }
  }

  function updateLead(id, field, value) {
    const updated = leads.map((l) =>
      l.id === id ? { ...l, [field]: value } : l
    );
    saveLeads(updated);
  }

  function deleteLead(id) {
    saveLeads(leads.filter((l) => l.id !== id));
  }

  function exportCSV() {
    if (!leads.length) return;
    const headers = [
      "buyer_name",
      "company",
      "phone",
      "email",
      "product",
      "quantity",
      "date",
      "status",
      "notes",
    ];
    const csv = [
      headers.join(","),
      ...leads.map((r) =>
        headers
          .map((h) => `"${(r[h] || "").toString().replace(/"/g, '""')}"`)
          .join(",")
      ),
    ].join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "indiamart-leads.csv";
    a.click();
  }

  const filteredLeads = leads.filter((l) => {
    const matchStatus = statusFilter === "All" || l.status === statusFilter;
    const matchSearch =
      !search ||
      (l.buyer_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.company || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.phone || "").includes(search) ||
      (l.email || "").toLowerCase().includes(search.toLowerCase()) ||
      (l.product || "").toLowerCase().includes(search.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div>
      {/* Import Section */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-customer-service-line text-teal-600" />
            Indiamart Enquiry CRM
            <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded font-semibold ml-1">
              v18 NEW
            </span>
          </h5>
        </div>
        <div className="box-body">
          <p className="text-sm text-gray-500 mb-4">
            Import buyer enquiry leads from an Indiamart seller or product
            listing page. CRM data is stored locally in your browser.
          </p>
          <div className="flex gap-3 items-end flex-wrap">
            <div className="flex-1 min-w-[240px]">
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Indiamart Seller / Product URL
              </label>
              <input
                className="ti-form-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://www.indiamart.com/..."
                onKeyDown={(e) => e.key === "Enter" && importLeads()}
              />
            </div>
            <button
              onClick={importLeads}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-teal-600 bg-teal-600 text-white hover:bg-teal-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <span className="ti-spinner w-4 h-4 border-white/60" />
                  Importing...
                </>
              ) : (
                <>
                  <i className="ri-download-cloud-line" />
                  Import Leads
                </>
              )}
            </button>
            {leads.length > 0 && (
              <button
                onClick={exportCSV}
                className="ti-btn ti-btn-outline border border-gray-300 text-gray-600 hover:bg-gray-50 flex items-center gap-2"
              >
                <i className="ri-download-line" /> Export CSV
              </button>
            )}
            {leads.length > 0 && (
              <button
                onClick={() => {
                  if (confirm("Clear all leads? This cannot be undone."))
                    saveLeads([]);
                }}
                className="ti-btn ti-btn-outline border border-red-200 text-red-500 hover:bg-red-50 flex items-center gap-2"
              >
                <i className="ri-delete-bin-line" /> Clear All
              </button>
            )}
          </div>
          {error && (
            <p className="text-red-500 text-sm mt-3">
              <i className="ri-error-warning-line mr-1" />
              {error}
            </p>
          )}
        </div>
      </div>

      {/* Stats */}
      {leads.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 mb-5">
          {STATUSES.map((s) => (
            <div
              key={s}
              className="box mb-0 cursor-pointer"
              onClick={() =>
                setStatusFilter(statusFilter === s ? "All" : s)
              }
            >
              <div
                className={`box-body py-3 rounded-lg transition-all ${
                  statusFilter === s ? "ring-2 ring-teal-400" : ""
                }`}
              >
                <p className="text-xs text-gray-500 truncate">{s}</p>
                <p className="text-2xl font-bold text-gray-800">
                  {leads.filter((l) => l.status === s).length}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      {leads.length > 0 && (
        <div className="box mb-4">
          <div className="box-body py-3">
            <div className="flex gap-3 flex-wrap items-center">
              <div className="flex-1 min-w-[200px]">
                <input
                  className="ti-form-input text-sm"
                  placeholder="Search by name, company, phone, email, product..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <div>
                <select
                  className="ti-form-input text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="All">All Statuses</option>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <p className="text-sm text-gray-400">
                Showing {filteredLeads.length} of {leads.length} leads
              </p>
            </div>
          </div>
        </div>
      )}

      {/* CRM Table */}
      {leads.length > 0 && (
        <div className="box">
          <div className="box-header">
            <h5 className="box-title">Leads ({leads.length})</h5>
          </div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  {[
                    "#",
                    "Buyer Name",
                    "Company",
                    "Phone",
                    "Email",
                    "Product",
                    "Qty",
                    "Date",
                    "Status",
                    "Notes",
                    "",
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
                {filteredLeads.map((l, i) => (
                  <tr key={l.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-gray-800 whitespace-nowrap">
                      {l.buyer_name || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-sm whitespace-nowrap">
                      {l.company || "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-gray-600 whitespace-nowrap text-sm">
                      {l.phone || "—"}
                    </td>
                    <td className="px-4 py-3 text-blue-600 text-xs whitespace-nowrap">
                      {l.email ? (
                        <a href={`mailto:${l.email}`} className="hover:underline">
                          {l.email}
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700 text-xs max-w-[140px] truncate">
                      {l.product || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                      {l.quantity || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {l.date || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={l.status}
                        onChange={(e) =>
                          updateLead(l.id, "status", e.target.value)
                        }
                        className={`text-xs rounded-full px-2 py-1 font-medium border-0 outline-none cursor-pointer ${
                          STATUS_COLORS[l.status] || "bg-gray-100 text-gray-600"
                        }`}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      <input
                        className="ti-form-input text-xs py-1"
                        value={l.notes}
                        onChange={(e) =>
                          updateLead(l.id, "notes", e.target.value)
                        }
                        placeholder="Add note..."
                      />
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => deleteLead(l.id)}
                        className="text-red-400 hover:text-red-600 transition-colors"
                        title="Delete lead"
                      >
                        <i className="ri-delete-bin-line" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {leads.length === 0 && (
        <div className="box">
          <div className="box-body text-center py-14">
            <i className="ri-customer-service-line text-5xl text-teal-200" />
            <p className="text-gray-400 mt-3 text-base">No leads yet.</p>
            <p className="text-gray-400 text-sm mt-1">
              Paste an Indiamart seller or product URL above and click &quot;Import
              Leads&quot;.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
