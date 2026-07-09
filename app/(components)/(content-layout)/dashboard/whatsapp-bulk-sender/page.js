"use client";
import { useState } from "react";
import axios from "axios";
import { useToast } from "../../../../../components/ToastProvider";
import { trackRun } from "../home/page";

export default function WhatsAppBulkSenderPage() {
  const { toast } = useToast();
  const [phones, setPhones] = useState("");
  const [message, setMessage] = useState("");
  const [countryCode, setCountryCode] = useState("91");
  const [delaySec, setDelaySec] = useState(5);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  const phoneList = phones.split("\n").map((p) => p.trim()).filter(Boolean);

  async function send() {
    if (!phoneList.length) { setError("Enter at least one phone number."); return; }
    if (!message.trim()) { setError("Enter a message."); return; }
    if (!confirmed) { setError("Please confirm that you have permission to message these recipients."); return; }
    setError(""); setRows([]); setSummary(null); setLoading(true);
    try {
      const res = await axios.post("/api/whatsapp_sender/", {
        phones: phoneList,
        message,
        country_code: countryCode,
        delay_seconds: Number(delaySec),
      });
      const data = res.data.data || [];
      setRows(data);
      setSummary(res.data.summary);
      trackRun("WA Bulk Sender");
      const s = res.data.summary || {};
      toast({
        type: s.failed === 0 ? "success" : s.sent > 0 ? "warning" : "error",
        title: `${s.sent || 0} sent, ${s.failed || 0} failed`,
        message: `Total: ${s.total || 0} messages processed`,
      });
    } catch (e) {
      const msg = e?.response?.data?.error || "Failed to send messages.";
      setError(msg);
      toast({ type: "error", title: "Send failed", message: msg });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="box mb-5 border-l-4 border-l-amber-400">
        <div className="box-body py-3">
          <div className="flex items-start gap-3">
            <i className="ri-information-line text-amber-500 text-xl mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-700">Requirements</p>
              <ul className="text-sm text-gray-600 mt-1 space-y-0.5 list-disc list-inside">
                <li>WhatsApp Web must be logged in (a browser window will open on first use)</li>
                <li>Only send messages to people who have opted in</li>
                <li>Bulk messaging violates WhatsApp ToS — use responsibly</li>
                <li>Add country code prefix (e.g. 91 for India, 1 for US)</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className="ri-send-plane-line text-lime-600" /> Bulk WhatsApp Sender
            <span className="text-xs bg-lime-100 text-lime-700 px-2 py-0.5 rounded font-semibold ml-1">v13</span>
          </h5>
        </div>
        <div className="box-body">
          <div className="grid grid-cols-12 gap-4 mb-4">
            <div className="col-span-12 md:col-span-8">
              <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                Phone Numbers (one per line, max 50)
              </label>
              <textarea
                className="ti-form-input resize-y"
                rows={6}
                value={phones}
                onChange={(e) => setPhones(e.target.value)}
                placeholder={"9876543210\n9123456789\n8765432109"}
              />
            </div>
            <div className="col-span-12 md:col-span-4 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Country Code</label>
                <input
                  type="text"
                  className="ti-form-input"
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  placeholder="91"
                  maxLength={4}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
                  Delay between messages
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min="2" max="30" step="1"
                    value={delaySec}
                    onChange={(e) => setDelaySec(Number(e.target.value))}
                    className="flex-1 accent-lime-600"
                  />
                  <span className="text-sm font-semibold text-lime-600 w-12 text-right">{delaySec}s</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Longer delay = less likely to get rate-limited</p>
              </div>
              <div>
                <p className="text-sm text-gray-400">Numbers entered</p>
                <p className="text-2xl font-bold text-lime-600">{phoneList.length}</p>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">Message</label>
            <textarea
              className="ti-form-input resize-y"
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type your WhatsApp message here..."
            />
            <p className="text-xs text-gray-400 mt-1">{message.length} characters</p>
          </div>

          <label className="flex items-start gap-2 mb-4 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-0.5 w-4 h-4 accent-lime-600"
            />
            <span className="text-sm text-gray-600 dark:text-gray-300">
              I confirm that all recipients have consented to receive WhatsApp messages from me and I am complying with applicable laws.
            </span>
          </label>

          {phoneList.length > 0 && (
            <div className="mb-4 p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-200 dark:border-white/10">
              <p className="text-xs text-gray-500">
                <i className="ri-time-line mr-1 text-lime-500" />
                Estimated time: ~{Math.ceil(phoneList.length * delaySec / 60)} min
                ({phoneList.length} messages × {delaySec}s delay)
              </p>
            </div>
          )}

          <div className="flex gap-3 flex-wrap items-center">
            <button
              onClick={send}
              disabled={loading}
              className="ti-btn ti-btn-outline border border-lime-600 bg-lime-600 text-white hover:bg-lime-700 flex items-center gap-2 disabled:opacity-60"
            >
              {loading
                ? <><span className="ti-spinner w-4 h-4 border-white/60" /> Sending…</>
                : <><i className="ri-send-plane-line" /> Send Messages</>}
            </button>
            {loading && (
              <p className="text-xs text-gray-400 animate-pulse">
                <i className="ri-time-line mr-1" />Sending with {delaySec}s delay between each message…
              </p>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2"><i className="ri-error-warning-line mr-1" />{error}</p>}
        </div>
      </div>

      {summary && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {[
            { label: "Total", count: summary.total, icon: "ri-phone-line", color: "text-gray-600" },
            { label: "Sent", count: summary.sent, icon: "ri-checkbox-circle-fill", color: "text-green-600" },
            { label: "Failed", count: summary.failed, icon: "ri-close-circle-fill", color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="col-span-12 md:col-span-4">
              <div className="box">
                <div className="box-body">
                  <div className="flex items-center gap-3">
                    <i className={`${s.icon} ${s.color} text-3xl`} />
                    <div>
                      <p className="text-sm text-gray-500">{s.label}</p>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.count}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="box">
          <div className="box-header"><h5 className="box-title">Send Log ({rows.length})</h5></div>
          <div className="box-body p-0 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Phone</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Sent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                {rows.map((row, i) => (
                  <tr key={i} className="hover:bg-gray-50 dark:hover:bg-white/5">
                    <td className="px-4 py-3 text-gray-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-mono dark:text-white/80">{row.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{row.status}</td>
                    <td className="px-4 py-3">
                      <i className={`text-lg ${row.sent ? "ri-checkbox-circle-fill text-green-500" : "ri-close-circle-fill text-red-400"}`} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
