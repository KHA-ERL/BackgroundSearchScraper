"use client";
import { useState } from "react";
import axios from "axios";
import ResultsTable from "../../../../../components/ResultsTable";
import { useToast } from "../../../../../components/ToastProvider";
import { trackRun } from "../home/page";

const columns = [
  { key: "input", header: "Email", width: "220px" },
  {
    key: "valid",
    header: "Valid",
    width: "80px",
    render: (val) => (
      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${val ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
        {val ? "Valid" : "Invalid"}
      </span>
    ),
  },
  {
    key: "mx",
    header: "MX Record",
    width: "90px",
    render: (val) => <i className={`text-lg ${val ? "ri-checkbox-circle-fill text-green-500" : "ri-close-circle-fill text-red-400"}`} />,
  },
  {
    key: "disposable",
    header: "Disposable",
    width: "100px",
    render: (val) => <i className={`text-lg ${val ? "ri-spam-2-fill text-orange-400" : "ri-checkbox-circle-fill text-green-500"}`} />,
  },
  { key: "domain", header: "Domain", width: "150px" },
  { key: "reason", header: "Reason / Status", width: "180px" },
];

export default function EmailVerifierPage() {
  const { toast } = useToast();
  const [input, setInput] = useState("");
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function verify() {
    const emails = input.split("\n").map((e) => e.trim()).filter(Boolean);
    if (!emails.length) { setError("Enter at least one email address."); return; }
    setError(""); setRows([]); setSummary(null); setLoading(true);
    try {
      const res = await axios.post("/api/email_verifier/", { emails });
      const data = res.data.data || [];
      setRows(data);
      setSummary(res.data.summary);
      trackRun("Email Verifier");
      toast({
        type: "success",
        title: `Verified ${data.length} email${data.length !== 1 ? "s" : ""}`,
        message: `${res.data.summary?.valid || 0} valid · ${res.data.summary?.invalid || 0} invalid`,
      });
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to verify emails.";
      setError(msg);
      toast({ type: "error", title: "Verification failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {summary && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {[
            { label: "Total", count: summary.total, icon: "ri-mail-line", bg: "bg-fuchsia-50", text: "text-fuchsia-600" },
            { label: "Valid", count: summary.valid, icon: "ri-mail-check-line", bg: "bg-green-50", text: "text-green-600" },
            { label: "Invalid", count: summary.invalid, icon: "ri-mail-close-line", bg: "bg-red-50", text: "text-red-500" },
            { label: "Disposable", count: summary.disposable, icon: "ri-spam-2-line", bg: "bg-orange-50", text: "text-orange-500" },
          ].map((s) => (
            <div key={s.label} className="col-span-12 sm:col-span-6 xl:col-span-3">
              <div className="box">
                <div className="box-body">
                  <div className="flex items-center gap-3">
                    <span className={`w-10 h-10 rounded-full ${s.bg} flex items-center justify-center`}>
                      <i className={`${s.icon} ${s.text} text-xl`} />
                    </span>
                    <div>
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.text}`}>{s.count}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-mail-check-line text-fuchsia-500" /> Email Verifier
            <span className="text-xs bg-fuchsia-100 text-fuchsia-600 px-2 py-0.5 rounded font-semibold ml-1">v13</span>
          </h5>
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
            Email Addresses (one per line, max 200)
          </label>
          <p className="text-xs text-gray-400 mb-2">
            Checks syntax, domain MX records, and disposable email detection.
            With a ListClean API key, performs full SMTP delivery verification.
          </p>
          <textarea
            className="ti-form-input resize-y mb-2"
            rows={7}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && e.ctrlKey && verify()}
            placeholder={"hello@example.com\ntest@gmail.com\nfake@mailinator.com"}
          />
          <p className="text-xs text-gray-400 mb-3">
            Tip: Press <kbd className="px-1 py-0.5 bg-gray-100 dark:bg-white/10 rounded text-[10px]">Ctrl+Enter</kbd> to verify
          </p>
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={verify}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-fuchsia-500 bg-fuchsia-500 text-white hover:bg-fuchsia-600 flex items-center gap-2 disabled:opacity-60"
            >
              {loading
                ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Verifying…</>
                : <><i className="ri-mail-check-line" /> Verify Emails</>}
            </button>
          </div>
          {error && <p className="text-red-500 text-sm mt-2"><i className="ri-error-warning-line mr-1" />{error}</p>}
        </div>
      </div>

      <ResultsTable
        rows={rows}
        columns={columns}
        loading={loading}
        title="Verification Results"
        filename="email-verification"
        accentColor="fuchsia"
        dedupeKey="input"
        filterKeys={["input", "domain", "reason"]}
        emptyMsg="No emails verified yet. Paste email addresses above and click Verify."
      />
    </div>
  );
}
