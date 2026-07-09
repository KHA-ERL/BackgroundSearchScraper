"use client";
/**
 * Reusable layout wrapper for all scraper pages.
 * Renders: stats row → input area (with CSV dropzone + history restore) → results table
 */
import { useState, useRef, useEffect, useCallback } from "react";
import axios from "axios";

// ── localStorage helpers ───────────────────────────────────────────────────────
function saveHistory(apiPath, rows) {
  if (typeof window === "undefined" || !rows.length) return;
  try {
    localStorage.setItem(`sg_history_${apiPath}`, JSON.stringify(rows.slice(0, 30)));
  } catch (_) {}
}
function loadHistory(apiPath) {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`sg_history_${apiPath}`);
    return raw ? JSON.parse(raw) : null;
  } catch (_) { return null; }
}

// ── CSV dropzone ───────────────────────────────────────────────────────────────
function CsvDropzone({ onLoad }) {
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef(null);

  function parseCSV(text) {
    const lines = text.trim().split(/\r?\n/);
    // If it looks like a header row (no URL/number pattern), skip first line
    const hasHeader = lines[0] && !/^https?:|^\+?\d{7,}/.test(lines[0].trim());
    const data = hasHeader ? lines.slice(1) : lines;
    return data
      .map((l) => l.split(",")[0].replace(/^"|"$/g, "").trim())
      .filter(Boolean)
      .join("\n");
  }

  function handleFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => onLoad(parseCSV(e.target.result));
    reader.readAsText(file);
  }

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, []);

  const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true); }, []);
  const onDragLeave = useCallback(() => setDragging(false), []);

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={() => fileRef.current?.click()}
      className={`mt-2 mb-3 border-2 border-dashed rounded-lg px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors text-sm ${
        dragging
          ? "border-sky-400 bg-sky-50 dark:bg-sky-900/20 text-sky-600"
          : "border-gray-200 dark:border-white/10 hover:border-sky-300 dark:hover:border-sky-500/50 text-gray-400 dark:text-gray-500 hover:text-sky-500"
      }`}
    >
      <i className="ri-file-upload-line text-xl shrink-0" />
      <span>Drop a CSV file here, or <span className="underline">click to browse</span> — first column values will be loaded</span>
      <input
        ref={fileRef}
        type="file"
        accept=".csv,text/csv"
        className="hidden"
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </div>
  );
}

// ── Main layout ────────────────────────────────────────────────────────────────
export default function ScraperLayout({
  title,
  icon = "ri-global-line",
  inputLabel = "Enter URL or query",
  inputPlaceholder = "https://example.com",
  multiline = false,
  columns = [],
  apiPath,
  buildPayload,       // fn(inputValue) → POST body object
  transformResponse,  // fn(responseData) → array of row objects
  csvFilename = "data.csv",
  statFields = [],    // [{ key, label, icon }] to count in results
  extraInputs,        // optional JSX rendered below main input
}) {
  const [input, setInput] = useState("");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasHistory, setHasHistory] = useState(false);
  const [historyRestored, setHistoryRestored] = useState(false);
  const cancelRef = useRef(null);

  // Check for saved history on mount
  useEffect(() => {
    if (apiPath) {
      const saved = loadHistory(apiPath);
      if (saved && saved.length > 0) setHasHistory(true);
    }
  }, [apiPath]);

  const stats = statFields.map((f) => ({
    ...f,
    count: rows.filter((r) => r[f.key] && r[f.key] !== "N/A").length,
  }));

  async function handleSearch() {
    if (!input.trim()) {
      setError("Please provide a value.");
      return;
    }
    setError("");
    setRows([]);
    setLoading(true);
    setHistoryRestored(false);
    const source = axios.CancelToken.source();
    cancelRef.current = source;
    try {
      const payload = buildPayload ? buildPayload(input) : { query: input };
      const res = await axios.post(apiPath, payload, {
        cancelToken: source.token,
      });
      const data = transformResponse ? transformResponse(res.data) : res.data;
      const finalRows = Array.isArray(data) ? data : [];
      setRows(finalRows);
      if (finalRows.length > 0) {
        saveHistory(apiPath, finalRows);
        setHasHistory(true);
      }
    } catch (e) {
      if (!axios.isCancel(e)) {
        setError(e?.response?.data?.error || "Failed to fetch data.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleRestoreHistory() {
    const saved = loadHistory(apiPath);
    if (saved) {
      setRows(saved);
      setHistoryRestored(true);
      setError("");
    }
  }

  function handleStop() {
    cancelRef.current?.cancel();
    setLoading(false);
  }

  function handleClear() {
    setInput("");
    setRows([]);
    setError("");
    setHistoryRestored(false);
  }

  function downloadCSV() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join(",");
    const body = rows
      .map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = csvFilename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function downloadTXT() {
    if (!rows.length) return;
    const headers = columns.map((c) => c.header).join("\t");
    const body = rows
      .map((r) => columns.map((c) => (r[c.key] ?? "").toString().replace(/\t/g, " ")).join("\t"))
      .join("\n");
    const blob = new Blob([headers + "\n" + body], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const fn = csvFilename.replace(".csv", ".txt");
    a.download = fn;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function downloadPDF() {
    if (!rows.length) return;
    try {
      const { default: jsPDF } = await import("jspdf");
      await import("jspdf-autotable");
      const doc = new jsPDF("landscape");
      const fn = csvFilename.replace(".csv", "");
      doc.text(fn, 14, 15);
      doc.autoTable({
        head: [columns.map((c) => c.header)],
        body: rows.map((r) => columns.map((c) => (r[c.key] ?? "").toString())),
        startY: 20,
        styles: { fontSize: 8 },
      });
      doc.save(`${fn}.pdf`);
    } catch (err) {
      console.error("PDF export failed:", err);
    }
  }

  async function downloadDOC() {
    if (!rows.length) return;
    try {
      const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = await import("docx");
      const headerRow = new TableRow({
        children: columns.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.header, bold: true })] })] }))
      });
      const dataRows = rows.map(r => new TableRow({
        children: columns.map(c => new TableCell({ children: [new Paragraph((r[c.key] ?? "").toString())] }))
      }));
      const fn = csvFilename.replace(".csv", "");
      const doc = new Document({
        sections: [{ children: [new Paragraph({ children: [new TextRun({ text: fn, bold: true, size: 28 })] }), new Table({ rows: [headerRow, ...dataRows] })] }]
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fn}.docx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("DOC export failed:", err);
    }
  }

  return (
    <div>
      {/* Stats */}
      {statFields.length > 0 && (
        <div className="grid grid-cols-12 gap-5 mb-5">
          {stats.map((s) => (
            <div key={s.key} className="col-span-12 md:col-span-4">
              <div className="box">
                <div className="box-body">
                  <div className="flex items-center space-x-3">
                    <span className={`avatar w-10 h-10 rounded-full p-2.5 bg-primary/10 text-primary leading-none`}>
                      <i className={`${s.icon} text-xl text-sky-500`} />
                    </span>
                    <div>
                      <div className="text-sm text-gray-500">{s.label}</div>
                      <div className="text-xl font-bold text-defaulttextcolor dark:text-white">{s.count}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="box mb-5">
        <div className="box-header">
          <h5 className="box-title flex items-center gap-2">
            <i className={`${icon} text-sky-500`} />
            {title}
          </h5>
          {/* Restore history banner */}
          {hasHistory && !historyRestored && rows.length === 0 && !loading && (
            <button
              onClick={handleRestoreHistory}
              className="flex items-center gap-1.5 text-xs text-sky-500 hover:text-sky-600 border border-sky-200 dark:border-sky-500/30 px-2.5 py-1.5 rounded-lg hover:bg-sky-50 dark:hover:bg-sky-900/20 transition-colors"
            >
              <i className="ri-history-line" />
              Restore last results
            </button>
          )}
          {historyRestored && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2.5 py-1.5 rounded-lg">
              <i className="ri-information-line" />
              Showing last saved results
            </span>
          )}
        </div>
        <div className="box-body">
          <label className="block text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
            {inputLabel}
          </label>
          {multiline ? (
            <>
              <textarea
                className="ti-form-input resize-y mb-1"
                rows={4}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={inputPlaceholder}
              />
              <CsvDropzone onLoad={(text) => setInput((prev) => prev ? prev + "\n" + text : text)} />
            </>
          ) : (
            <input
              type="text"
              className="ti-form-input mb-3"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={inputPlaceholder}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          )}
          {extraInputs}
          <div className="flex gap-3 mt-2">
            {loading ? (
              <button onClick={handleStop} className="ti-btn ti-btn-outline border border-red-400 text-red-500 hover:bg-red-500 hover:text-white flex items-center gap-2">
                <div className="ti-spinner w-4 h-4 border-red-400" />
                Stop
              </button>
            ) : (
              <button onClick={handleSearch} className="ti-btn ti-btn-outline border border-sky-500 bg-sky-500 text-white hover:bg-sky-600 flex items-center gap-2">
                <i className="ri-search-line" /> Search
              </button>
            )}
            {rows.length > 0 && (
              <>
                <button onClick={downloadCSV} className="ti-btn ti-btn-outline border border-sky-400 text-sky-500 hover:bg-sky-500 hover:text-white flex items-center gap-2">
                  <i className="ri-table-line" /> CSV
                </button>
                <button onClick={downloadTXT} className="ti-btn ti-btn-outline border border-sky-400 text-sky-500 hover:bg-sky-500 hover:text-white flex items-center gap-2">
                  <i className="ri-file-text-line" /> TXT
                </button>
                <button onClick={downloadPDF} className="ti-btn ti-btn-outline border border-sky-400 text-sky-500 hover:bg-sky-500 hover:text-white flex items-center gap-2">
                  <i className="ri-file-pdf-line" /> PDF
                </button>
                <button onClick={downloadDOC} className="ti-btn ti-btn-outline border border-sky-400 text-sky-500 hover:bg-sky-500 hover:text-white flex items-center gap-2">
                  <i className="ri-file-word-line" /> DOC
                </button>
                <button onClick={handleClear} className="ti-btn ti-btn-outline border border-gray-300 text-gray-500 hover:bg-gray-100 flex items-center gap-2">
                  <i className="ri-delete-bin-line" /> Clear
                </button>
              </>
            )}
          </div>
          {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
        </div>
      </div>

      {/* Results */}
      <div className="box">
        <div className="box-header justify-between">
          <h5 className="box-title">
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="ti-spinner w-4 h-4 border-sky-400 text-sky-500" />
                Processing...
              </span>
            ) : (
              `Records (${rows.length})`
            )}
          </h5>
        </div>
        <div className="box-body p-0 overflow-x-auto">
          {rows.length > 0 ? (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-white/5 sticky top-0 z-10">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-12">#</th>
                  {columns.map((c) => (
                    <th key={c.key} className="px-4 py-3 text-left font-medium text-gray-500 whitespace-nowrap">
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
                      <td key={c.key} className="px-4 py-3 text-defaulttextcolor dark:text-white/70 max-w-xs truncate">
                        {c.render ? c.render(row[c.key], row) : (row[c.key] ?? "N/A")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-400 py-10">No data to display</p>
          )}
        </div>
      </div>
    </div>
  );
}
