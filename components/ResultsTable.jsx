"use client";
import { useState, useMemo } from "react";
import { useLanguage } from "./LanguageProvider";

// ─── Download helpers ─────────────────────────────────────────────────────────
function triggerDownload(content, filename, type) {
  const blob = new Blob([content], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}
function exportToCSV(rows, columns, filename) {
  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const body = rows
    .map((r) => columns.map((c) => `"${(r[c.key] ?? "").toString().replace(/"/g, '""')}"`).join(","))
    .join("\n");
  triggerDownload(headers + "\n" + body, `${filename || "export"}.csv`, "text/csv");
}
function exportToJSON(rows, filename) {
  triggerDownload(JSON.stringify(rows, null, 2), `${filename || "export"}.json`, "application/json");
}
function exportToTXT(rows, columns, filename) {
  const headers = columns.map((c) => c.header).join("\t");
  const body = rows
    .map((r) => columns.map((c) => (r[c.key] ?? "").toString().replace(/\t/g, " ")).join("\t"))
    .join("\n");
  triggerDownload(headers + "\n" + body, `${filename || "export"}.txt`, "text/plain");
}
async function exportToPDF(rows, columns, filename) {
  try {
    const { default: jsPDF } = await import("jspdf");
    await import("jspdf-autotable");
    const doc = new jsPDF("landscape");
    doc.text(filename || "Data Export", 14, 15);
    doc.autoTable({
      head: [columns.map((c) => c.header)],
      body: rows.map((r) => columns.map((c) => (r[c.key] ?? "").toString())),
      startY: 20,
      styles: { fontSize: 8 },
    });
    doc.save(`${filename || "export"}.pdf`);
  } catch (err) {
    console.error("PDF export failed:", err);
  }
}
async function exportToDOC(rows, columns, filename) {
  try {
    const { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun } = await import("docx");
    const headerRow = new TableRow({
      children: columns.map(c => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: c.header, bold: true })] })] }))
    });
    const dataRows = rows.map(r => new TableRow({
      children: columns.map(c => new TableCell({ children: [new Paragraph((r[c.key] ?? "").toString())] }))
    }));
    const doc = new Document({
      sections: [{ children: [new Paragraph({ children: [new TextRun({ text: filename || "Data Export", bold: true, size: 28 })] }), new Table({ rows: [headerRow, ...dataRows] })] }]
    });
    const blob = await Packer.toBlob(doc);
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${filename || "export"}.docx`;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (err) {
    console.error("DOC export failed:", err);
  }
}

// ─── Skeleton shimmer rows ────────────────────────────────────────────────────
function SkeletonRows({ columns, count = 8 }) {
  return Array.from({ length: count }).map((_, i) => (
    <tr key={i}>
      <td className="px-4 py-3.5">
        <div className="h-2.5 w-5 bg-gray-100 dark:bg-white/10 rounded animate-pulse" />
      </td>
      {columns.map((_, ci) => (
        <td key={ci} className="px-4 py-3.5">
          <div
            className="h-2.5 bg-gray-100 dark:bg-white/10 rounded animate-pulse"
            style={{ width: `${35 + ((i * 11 + ci * 17) % 50)}%` }}
          />
        </td>
      ))}
    </tr>
  ));
}

// ─── ResultsTable ─────────────────────────────────────────────────────────────
export default function ResultsTable({
  rows = [],
  columns = [],
  loading = false,
  emptyMsg = "No data to display. Run a search above.",
  filename = "export",
  filterKeys,
  dedupeKey,
  accentColor = "indigo",
  title,
}) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState({ key: null, dir: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [deduped, setDeduped] = useState(false);

  const searchKeys = filterKeys || columns.map((c) => c.key);

  const processed = useMemo(() => {
    let data = [...rows];
    if (deduped && dedupeKey) {
      const seen = new Set();
      data = data.filter((r) => {
        const val = (r[dedupeKey] ?? "").toString().toLowerCase().trim();
        if (!val || val === "n/a") return true;
        if (seen.has(val)) return false;
        seen.add(val);
        return true;
      });
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      data = data.filter((r) =>
        searchKeys.some((k) => (r[k] ?? "").toString().toLowerCase().includes(q))
      );
    }
    if (sort.key) {
      data = [...data].sort((a, b) => {
        const av = (a[sort.key] ?? "").toString().toLowerCase();
        const bv = (b[sort.key] ?? "").toString().toLowerCase();
        const na = parseFloat(av), nb = parseFloat(bv);
        if (!isNaN(na) && !isNaN(nb)) return sort.dir === "asc" ? na - nb : nb - na;
        return sort.dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return data;
  }, [rows, search, sort, deduped, dedupeKey, searchKeys]);

  // Count duplicates removed — computed independently of search filter
  const dedupRemovedCount = useMemo(() => {
    if (!dedupeKey || !deduped || !rows.length) return 0;
    const seen = new Set();
    let kept = 0;
    for (const r of rows) {
      const val = (r[dedupeKey] ?? "").toString().toLowerCase().trim();
      if (!val || val === "n/a" || !seen.has(val)) {
        kept++;
        if (val && val !== "n/a") seen.add(val);
      }
    }
    return rows.length - kept;
  }, [rows, dedupeKey, deduped]);

  const totalPages = Math.max(1, Math.ceil(processed.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const paginated = processed.slice((safePage - 1) * pageSize, safePage * pageSize);

  function handleSort(key) {
    setSort((s) => s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: "asc" });
    setPage(1);
  }
  function handleSearch(val) { setSearch(val); setPage(1); }

  const accent = {
    indigo:  { outline: "border-sky-300 text-sky-600 hover:bg-sky-600 hover:text-white",         ring: "focus:ring-sky-400",     active: "bg-sky-500 text-white" },
    sky:     { outline: "border-sky-300 text-sky-600 hover:bg-sky-600 hover:text-white",         ring: "focus:ring-sky-400",     active: "bg-sky-500 text-white" },
    green:   { outline: "border-green-400 text-green-600 hover:bg-green-600 hover:text-white",   ring: "focus:ring-green-400",   active: "bg-green-500 text-white" },
    fuchsia: { outline: "border-fuchsia-400 text-fuchsia-600 hover:bg-fuchsia-600 hover:text-white", ring: "focus:ring-fuchsia-400", active: "bg-fuchsia-500 text-white" },
    teal:    { outline: "border-teal-400 text-teal-600 hover:bg-teal-600 hover:text-white",      ring: "focus:ring-teal-400",    active: "bg-teal-500 text-white" },
    rose:    { outline: "border-rose-400 text-rose-600 hover:bg-rose-600 hover:text-white",      ring: "focus:ring-rose-400",    active: "bg-rose-500 text-white" },
  }[accentColor] || { outline: "border-sky-300 text-sky-600 hover:bg-sky-600 hover:text-white", ring: "focus:ring-sky-400", active: "bg-sky-500 text-white" };

  const isEmpty = !loading && rows.length === 0;
  const noMatch = !loading && rows.length > 0 && processed.length === 0;

  return (
    <div className="box">
      {/* Header */}
      <div className="box-header flex flex-wrap items-center justify-between gap-3">
        <h5 className="box-title">
          {title || t("table.results")}{" "}
          <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">
            ({processed.length}{rows.length !== processed.length ? ` of ${rows.length}` : ""})
          </span>
        </h5>

        {(rows.length > 0 || loading) && (
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <i className="ri-search-line absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder={t("table.filter")}
                className={`pl-7 pr-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 rounded-lg bg-gray-50 dark:bg-white/5 dark:text-white focus:outline-none focus:ring-2 ${accent.ring} w-36 sm:w-48`}
              />
            </div>

            {/* Dedupe + count badge */}
            {dedupeKey && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => { setDeduped((d) => !d); setPage(1); }}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${deduped ? accent.active + " border-transparent" : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:border-gray-300"}`}
                  title={`Deduplicate by ${dedupeKey}`}
                >
                  <i className="ri-filter-3-line" /> {t("table.dedup")}
                </button>
                {deduped && dedupRemovedCount > 0 && (
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 px-2 py-1 rounded-lg whitespace-nowrap">
                    {dedupRemovedCount} duplicate{dedupRemovedCount !== 1 ? "s" : ""} removed
                  </span>
                )}
              </div>
            )}

            {/* Page size */}
            <select
              value={pageSize}
              onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
              className="text-xs border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 bg-gray-50 dark:bg-white/5 dark:text-white focus:outline-none"
            >
              {[10, 20, 50, 100].map((n) => (
                <option key={n} value={n}>{n} {t("table.per_page")}</option>
              ))}
            </select>

            {/* CSV export */}
            <button
              onClick={() => exportToCSV(processed, columns, filename)}
              className={`ti-btn ti-btn-outline border text-xs py-1.5 px-3 flex items-center gap-1.5 ${accent.outline}`}
            >
              <i className="ri-table-line" /> CSV
            </button>

            {/* JSON export */}
            <button
              onClick={() => exportToJSON(processed, filename)}
              className="ti-btn ti-btn-outline border text-xs py-1.5 px-3 flex items-center gap-1.5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <i className="ri-braces-line" /> JSON
            </button>
            <button
              onClick={() => exportToTXT(processed, columns, filename)}
              className="ti-btn ti-btn-outline border text-xs py-1.5 px-3 flex items-center gap-1.5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <i className="ri-file-text-line" /> TXT
            </button>
            <button
              onClick={() => exportToPDF(processed, columns, filename)}
              className="ti-btn ti-btn-outline border text-xs py-1.5 px-3 flex items-center gap-1.5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <i className="ri-file-pdf-line" /> PDF
            </button>
            <button
              onClick={() => exportToDOC(processed, columns, filename)}
              className="ti-btn ti-btn-outline border text-xs py-1.5 px-3 flex items-center gap-1.5 border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/10 hover:text-gray-700 dark:hover:text-gray-200"
            >
              <i className="ri-file-word-line" /> DOC
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="box-body p-0 overflow-x-auto">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center py-14 px-4 text-center text-[#00FF41]">
            <p className="text-sm font-medium uppercase tracking-widest">[ SYSTEM IDLE // INPUT REQUIRED ]</p>
          </div>
        ) : noMatch ? (
          <div className="flex flex-col items-center justify-center py-14 text-center text-[#00FF41]/70">
            <p className="text-sm uppercase tracking-wide">NO MATCH FOUND :: QUERY_INVALID</p>
            <button onClick={() => setSearch("")} className="text-xs hover:underline mt-1 hover:text-[#00FF41] font-bold">[ CLEAR PARAMETERS ]</button>
          </div>
        ) : (
          <>
            <table className="w-full text-sm border-collapse">
              <thead className="bg-[#00FF41]/10 border-b border-[#00FF41]/40 sticky top-0 z-10 font-bold uppercase tracking-widest text-[#00FF41]">
                <tr>
                  <th className="px-4 py-3 text-left font-bold w-10 text-xs border-r border-[#00FF41]/20">ID</th>
                  {columns.map((c) => (
                    <th
                      key={c.key}
                      className="px-4 py-3 text-left font-bold whitespace-nowrap text-xs cursor-pointer select-none hover:bg-[#00FF41]/20 group border-r border-[#00FF41]/20 last:border-r-0"
                      style={c.width ? { width: c.width } : {}}
                      onClick={() => handleSort(c.key)}
                    >
                      <span className="flex items-center gap-1">
                        {c.header}
                        <span className="opacity-40 group-hover:opacity-100 font-normal">
                          {sort.key === c.key ? (sort.dir === "asc" ? "[^]" : "[v]") : "[-]"}
                        </span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#00FF41]/20 text-[#00FF41]/80">
                {loading ? (
                  <SkeletonRows columns={columns} count={8} />
                ) : (
                  paginated.map((row, i) => (
                    <tr key={i} className="hover:bg-[#00FF41]/10 transition-colors">
                      <td className="px-4 py-2.5 text-[#00FF41]/50 text-xs font-mono border-r border-[#00FF41]/20">
                        {String((safePage - 1) * pageSize + i + 1).padStart(4, '0')}
                      </td>
                      {columns.map((c) => (
                        <td key={c.key} className="px-4 py-2.5 text-sm max-w-xs border-r border-[#00FF41]/20 last:border-r-0">
                          {c.render
                            ? c.render(row[c.key], row)
                            : <span className="truncate block font-mono">{(row[c.key] ?? "NULL").toString().toUpperCase()}</span>}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {!loading && totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-[#00FF41]/40 bg-[#00FF41]/5 text-[#00FF41]">
                <p className="text-xs uppercase font-bold tracking-widest">
                  DATA_BUFFER: {(safePage - 1) * pageSize + 1} TO {Math.min(safePage * pageSize, processed.length)} // MAX: {processed.length}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={safePage === 1}
                    className="px-2 py-1 text-xs border border-gray-200 dark:border-white/10 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    <i className="ri-arrow-left-s-line" />
                  </button>
                  {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
                    const p = totalPages <= 7 ? idx + 1 : idx < 3 ? idx + 1 : idx === 3 ? "..." : totalPages - (6 - idx);
                    if (p === "...") return <span key="dots" className="px-1 text-gray-400 text-xs">…</span>;
                    return (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`w-7 h-7 text-xs rounded border ${safePage === p ? accent.active + " border-transparent" : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5"}`}
                      >
                        {p}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={safePage === totalPages}
                    className="px-2 py-1 text-xs border border-gray-200 dark:border-white/10 rounded text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-white/5 disabled:opacity-40"
                  >
                    <i className="ri-arrow-right-s-line" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
