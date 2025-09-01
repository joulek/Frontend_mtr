"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";
import { FiSearch, FiXCircle } from "react-icons/fi";
import MultiDevisModal from "@/components/admin/devis/MultiDevisModal.jsx";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const WRAP = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";

/* Helpers */
function cleanFilename(name = "") {
  return name?.startsWith?.("~$") ? "" : name || "";
}
function shortDate(d) {
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  } catch {
    return "";
  }
}

export default function DevisAutreList() {
  const t = useTranslations("devisAutre");
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  // Recherche
  const [q, setQ] = useState("");

  // Sélection multiple
  const [selectedIds, setSelectedIds] = useState([]);
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiDemands, setMultiDemands] = useState([]);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Devis existants (si tu veux t’en servir plus tard)
  const [devisMap, setDevisMap] = useState({});

  // Toast
  const [toast, setToast] = useState(null); // { text, kind }
  const toastTimer = useRef(null);
  const showToast = useCallback((text, kind = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // Charger données
  const load = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch(`${BACKEND}/api/admin/devis/autre`, {
        method: "GET",
        cache: "no-store",
        credentials: "include",
      });

      if (res.status === 401) {
        router.push(`/fr/login?next=${encodeURIComponent("/fr/admin/devis/autre")}`);
        return;
      }
      if (res.status === 403) {
        router.push(`/fr/unauthorized?code=403`);
        return;
      }

      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) throw new Error(data?.message || `Erreur (${res.status})`);
      setItems(data.items || []);
      setPage(1);
    } catch (e) {
      setErr(e.message || "Erreur réseau");
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  // (Optionnel) Vérif devis existants
  useEffect(() => {
    if (!items.length) {
      setDevisMap({});
      return;
    }
    let cancelled = false;
    (async () => {
      const pairs = await Promise.all(
        items.map(async (d) => {
          try {
            const r = await fetch(
              `${BACKEND}/api/devis/admin/by-demande/${d._id}?numero=${encodeURIComponent(d?.numero || "")}`,
              { credentials: "include" }
            );
            const j = await r.json().catch(() => null);
            if (j?.success && j?.exists) return [d._id, { numero: j.devis?.numero, pdf: j.pdf }];
            return null;
          } catch {
            return null;
          }
        })
      );
      if (cancelled) return;
      const map = {};
      for (const p of pairs) if (p) map[p[0]] = p[1];
      setDevisMap(map);
    })();
    return () => { cancelled = true; };
  }, [items]);

  // Filtrage
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter((d) => {
      const numero = String(d?.numero || "").toLowerCase();
      const client = `${d?.user?.prenom || ""} ${d?.user?.nom || ""}`.trim().toLowerCase();
      let dateStr = "";
      try { dateStr = new Date(d?.createdAt).toLocaleDateString().toLowerCase(); } catch { }
      return numero.includes(needle) || client.includes(needle) || dateStr.includes(needle);
    });
  }, [items, q]);

  // Clamp pagination + reset sur recherche
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page, pageSize]);
  useEffect(() => { setPage(1); }, [q]);

  const { pageItems, total } = useMemo(() => {
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { pageItems: filtered.slice(start, end), total };
  }, [filtered, page, pageSize]);

  // Ouverture PDF / doc
  async function viewPdfById(id) {
    try {
      const res = await fetch(`${BACKEND}/api/admin/devis/autre/${id}/pdf`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) { showToast(t("errors.pdfUnavailable"), "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { showToast(t("errors.pdfOpenError"), "error"); }
  }
  async function viewDocByIndex(id, index) {
    try {
      const res = await fetch(`${BACKEND}/api/admin/devis/autre/${id}/document/${index}`, {
        method: "GET",
        credentials: "include",
      });
      if (!res.ok) { showToast(t("errors.docUnavailable"), "error"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch { showToast(t("errors.docOpenError"), "error"); }
  }

  // Ouvrir la modale multi-devis à partir de la sélection
  function openMultiFromSelection() {
    const chosen = items.filter((it) => selectedIds.includes(it._id));
    if (!chosen.length) return;
    const c0 = chosen[0]?.user?._id?.toString?.();
    if (!chosen.every((x) => (x?.user?._id?.toString?.()) === c0)) {
      showToast("Sélectionne des demandes appartenant au même client.", "warning");
      return;
    }
    setMultiDemands(chosen);
    setMultiOpen(true);
  }

  // ---- UI ----
  return (
    <div className="py-6 space-y-6">
      {/* Toolbar */}
      <div className={WRAP}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-1xl lg:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          {/* Recherche + bouton */}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[320px] lg:w-[420px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchAria")}
                className="w-full rounded-xl border border-gray-300 bg-white px-10 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label={t("clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>

            <button
              disabled={selectedIds.length === 0}
              onClick={openMultiFromSelection}
              className="inline-flex items-center justify-center rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold shadow disabled:opacity-50"
            >
              {t("createDevis")}

            </button>
          </div>
        </div>

        {err && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">{err}</p>
        )}
      </div>

      {/* Table / Liste */}
      <div className={WRAP}>
        {loading ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : total === 0 ? (
          <p className="text-gray-500">{t("noData")}</p>
        ) : (
          <>
            {/* TABLE >= md (même design que Compression) */}
            <div className="hidden md:block">
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <table className="min-w-[760px] w-full table-auto text-[13px] lg:text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="p-2.5 text-left w-12">
                        <input
                          type="checkbox"
                          checked={pageItems.length > 0 && pageItems.every((it) => selectedIds.includes(it._id))}
                          onChange={(e) => {
                            const pageIds = pageItems.map((it) => it._id);
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, ...pageIds]))
                                : prev.filter((id) => !pageIds.includes(id))
                            );
                          }}
                        />
                      </th>
                      <th className="p-2.5 text-left">{t("columns.number")}</th>
                      <th className="p-2.5 text-left">{t("columns.client")}</th>
                      <th className="p-2.5 text-left whitespace-nowrap">{t("columns.date")}</th>
                      <th className="p-2.5 text-left whitespace-nowrap">{t("columns.pdf")}</th>
                      <th className="p-2.5 text-left whitespace-nowrap hidden lg:table-cell">
                        {t("columns.attachments")}
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {pageItems.map((d) => {
                      const hasPdf = !!d?.hasDemandePdf;
                      const docs = (d?.documents || [])
                        .map((doc, i) => ({ ...doc, index: i, filename: cleanFilename(doc.filename) }))
                        .filter((doc) => doc.filename && (doc.size ?? 0) > 0);

                      return (
                        <tr key={d._id} className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.04] transition-colors">
                          <td className="p-2.5 border-b border-gray-200 w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(d._id)}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked ? [...prev, d._id] : prev.filter((id) => id !== d._id)
                                )
                              }
                            />
                          </td>

                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                              <span className="font-mono">{d.numero}</span>
                            </div>
                          </td>

                          <td className="p-2.5 border-b border-gray-200">
                            <span className="block truncate max-w-[18rem]" title={`${d.user?.prenom || ""} ${d.user?.nom || ""}`}>
                              {d.user?.prenom} {d.user?.nom}
                            </span>
                          </td>

                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {shortDate(d.createdAt)}
                          </td>

                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {hasPdf ? (
                              <button
                                onClick={() => viewPdfById(d._id)}
                                className="inline-flex rounded-full border px-3 py-1 text-[12px] hover:bg-[#0B1E3A]/5"
                              >
                                {t("open")}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          <td className="p-2.5 border-b border-gray-200 hidden lg:table-cell">
                            {docs.length === 0 ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {docs.map((doc) => (
                                  <button
                                    key={doc.index}
                                    onClick={() => viewDocByIndex(d._id, doc.index)}
                                    className="inline-flex rounded-full border px-3 py-1 text-[12px] hover:bg-[#0B1E3A]/5"
                                  >
                                    {t("open")}
                                  </button>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="mt-3">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={(n) => setPage(Number(n))}
                  onPageSizeChange={(s) => setPageSize(Number(s))}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            </div>

            {/* LISTE MOBILE < md */}
            <div className="md:hidden divide-y divide-gray-200">
              {pageItems.map((d) => {
                const hasPdf = !!d?.hasDemandePdf;
                const docs = (d?.documents || [])
                  .map((doc, i) => ({ ...doc, index: i, filename: cleanFilename(doc.filename) }))
                  .filter((doc) => doc.filename && (doc.size ?? 0) > 0);

                return (
                  <div key={d._id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedIds.includes(d._id)}
                          onChange={(e) =>
                            setSelectedIds((prev) => (e.target.checked ? [...prev, d._id] : prev.filter((id) => id !== d._id)))
                          }
                        />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                        <span className="font-mono">{d.numero}</span>
                      </div>

                      {hasPdf ? (
                        <button
                          onClick={() => viewPdfById(d._id)}
                          className="inline-flex rounded-full border px-3 py-1 text-[12px]"
                        >
                          {t("open")}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">{t("columns.client")}</p>
                        <p className="truncate">{d.user?.prenom} {d.user?.nom}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">{t("columns.date")}</p>
                        <p className="truncate">{shortDate(d.createdAt)}</p>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] font-semibold text-gray-500">{t("columns.attachments")}</p>
                    {docs.length === 0 ? (
                      <p className="text-gray-500">—</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {docs.map((doc) => (
                          <button
                            key={doc.index}
                            onClick={() => viewDocByIndex(d._id, doc.index)}
                            className="inline-flex rounded-full border px-2 py-0.5 text-[12px]"
                          >
                            {t("open")}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <Pagination
                page={page}
                pageSize={pageSize}
                total={total}
                onPageChange={(n) => setPage(Number(n))}
                onPageSizeChange={(s) => setPageSize(Number(s))}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            </div>
          </>
        )}
      </div>

      <MultiDevisModal
        open={multiOpen}
        onClose={() => setMultiOpen(false)}
        demands={multiDemands}
        onCreated={() => { setMultiOpen(false); setSelectedIds([]); load(); }}
        demandKinds={["autre"]}
        articleKinds={["autre"]}
      />

      {/* Toast */}
      {toast && (
        <div className="fixed z-50 top-4 right-4 rounded-xl border px-4 py-2 shadow-lg bg-blue-50 border-blue-200 text-blue-800">
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.text}</span>
            <button onClick={() => setToast(null)} className="ml-1 inline-flex rounded-md border px-2 py-0.5 text-xs">
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
