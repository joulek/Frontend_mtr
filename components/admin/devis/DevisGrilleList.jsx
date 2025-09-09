"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";
import { FiSearch, FiXCircle, FiFileText } from "react-icons/fi";
import MultiDevisModal from "@/components/admin/devis/MultiDevisModal.jsx";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";
const WRAP = "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8";
const CACHE_KEY = "devisGrille.items.v1";

function cleanFilename(name = "") {
  return name?.startsWith?.("~$") ? "" : name || "";
}
function shortDate(d) {
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "";
  }
}

export default function DevisGrilleList() {
  const t = useTranslations("devisGrille");
  const router = useRouter();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);   // skeleton فقط لما ما عناش بيانات
  const [syncing, setSyncing] = useState(false);  // refresh صامت

  // بحث (debounce)
  const [q, setQ] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(q.trim()), 300);
    return () => clearTimeout(id);
  }, [q]);

  // اختيار متعدد
  const [selectedIds, setSelectedIds] = useState([]);
  const [multiOpen, setMultiOpen] = useState(false);
  const [multiDemands, setMultiDemands] = useState([]);

  // pagination سيرفر
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Toast
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);
  const showToast = useCallback((text, kind = "info") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ text, kind });
    toastTimer.current = setTimeout(() => setToast(null), 4000);
  }, []);
  useEffect(() => () => toastTimer.current && clearTimeout(toastTimer.current), []);

  // cache أولي
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw);
        if (Array.isArray(cached.items) && cached.items.length) {
          setItems(cached.items);
          setTotal(cached.total || cached.items.length);
          setLoading(false);
        }
      }
    } catch {}
  }, []);

  // fetch paginé
  const load = useCallback(
    async (silent = false) => {
      try {
        setErr("");
        if (silent) setSyncing(true);
        else if (items.length === 0) setLoading(true);

        const params = new URLSearchParams({
          q: debouncedQ || "",
          page: String(page),
          pageSize: String(pageSize),
        });

        const res = await fetch(`${BACKEND}/api/devis/grille/paginated?` + params.toString(), {
          credentials: "include",
          cache: "no-store",
        });

        if (res.status === 401) {
          router.push(`/fr/login?next=${encodeURIComponent("/fr/admin/devis/grille")}`);
          return;
        }
        if (res.status === 403) {
          router.push(`/fr/unauthorized?code=403`);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.message || `Erreur (${res.status})`);

        setItems(data.items || []);
        setTotal(data.total || 0);
        sessionStorage.setItem(
          CACHE_KEY,
          JSON.stringify({ items: data.items || [], total: data.total || 0 })
        );
      } catch (e) {
        setErr(e.message || "Erreur réseau");
      } finally {
        if (silent) setSyncing(false);
        else setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedQ, page, pageSize, router, items.length]
  );

  // initial + on q/page/pageSize change
  useEffect(() => {
    load(items.length > 0);
  }, [load]);

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

  return (
    <div className="py-6 space-y-6">
      {/* Toolbar */}
      <div className={WRAP}>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <h1 className="text-1xl lg:text-2xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:w-[320px] lg:w-[420px]">
              <FiSearch
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchAria")}
                className="w-full rounded-xl border border-gray-300 bg-white px-10 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => {
                    setQ("");
                    setPage(1);
                  }}
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

        {syncing && (
          <div className="mt-2 inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1 text-sm text-blue-800">
            <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
            {t("states.syncing") ?? "Mise à jour…"}
          </div>
        )}

        {err && (
          <p className="mt-3 rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-red-700">
            {err}
          </p>
        )}
      </div>

      {/* Table / List */}
      <div className={WRAP}>
        {loading && items.length === 0 ? (
          <div className="space-y-2 animate-pulse">
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
            <div className="h-10 bg-gray-100 rounded" />
          </div>
        ) : total === 0 ? (
          <p className="text-gray-500">{t("noData")}</p>
        ) : (
          <>
            {/* TABLE >= md */}
            <div className="hidden md:block">
              <div className="-mx-4 md:mx-0 overflow-x-auto">
                <table className="min-w-[760px] w-full table-auto text-[13px] lg:text-sm border-separate border-spacing-0">
                  <thead>
                    <tr>
                      <th className="p-2.5 text-left w-12">
                        <input
                          type="checkbox"
                          checked={
                            items.length > 0 &&
                            items.every((it) => selectedIds.includes(it._id))
                          }
                          onChange={(e) => {
                            const ids = items.map((it) => it._id);
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? Array.from(new Set([...prev, ...ids]))
                                : prev.filter((id) => !ids.includes(id))
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
                    {items.map((d) => {
                      const hasPdf = Boolean(d?.hasDemandePdf);
                      const docs = (d?.documents || [])
                        .map((doc, i) => ({
                          ...doc,
                          index: i,
                          filename: cleanFilename(doc.filename),
                        }))
                        .filter((doc) => !!doc.filename);

                      return (
                        <tr
                          key={d._id}
                          className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.04] transition-colors"
                        >
                          <td className="p-2.5 border-b border-gray-200 w-12">
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(d._id)}
                              onChange={(e) =>
                                setSelectedIds((prev) =>
                                  e.target.checked
                                    ? [...prev, d._id]
                                    : prev.filter((id) => id !== d._id)
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
                            <span
                              className="block truncate max-w-[18rem]"
                              title={`${d.user?.prenom || ""} ${d.user?.nom || ""}`}
                            >
                              {d.user?.prenom} {d.user?.nom}
                            </span>
                          </td>

                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {shortDate(d.createdAt)}
                          </td>

                          {/* PDF button pill */}
                          <td className="p-2.5 border-b border-gray-200 whitespace-nowrap">
                            {hasPdf ? (
                              <button
                                onClick={() => viewPdfById(d._id)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                              >
                                <FiFileText size={16} />
                                {t("open")}
                              </button>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>

                          {/* Attachments buttons pill */}
                          <td className="p-2.5 border-b border-gray-200 hidden lg:table-cell">
                            {docs.length === 0 ? (
                              <span className="text-gray-400">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-2">
                                {docs.map((doc) => (
                                  <button
                                    key={doc.index}
                                    onClick={() => viewDocByIndex(d._id, doc.index)}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                                  >
                                    <FiFileText size={16} />
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
                  onPageSizeChange={(s) => {
                    setPageSize(Number(s));
                    setPage(1);
                  }}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            </div>

            {/* LISTE < md */}
            <div className="md:hidden divide-y divide-gray-200">
              {items.map((d) => {
                const hasPdf = Boolean(d?.hasDemandePdf);
                const docs = (d?.documents || [])
                  .map((doc, i) => ({
                    ...doc,
                    index: i,
                    filename: cleanFilename(doc.filename),
                  }))
                  .filter((doc) => !!doc.filename);

                return (
                  <div key={d._id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          className="mt-0.5"
                          checked={selectedIds.includes(d._id)}
                          onChange={(e) =>
                            setSelectedIds((prev) =>
                              e.target.checked
                                ? [...prev, d._id]
                                : prev.filter((id) => id !== d._id)
                            )
                          }
                        />
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600]" />
                        <span className="font-mono">{d.numero}</span>
                      </div>

                      {hasPdf ? (
                        <button
                          onClick={() => viewPdfById(d._id)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                          aria-label={t("open")}
                          title={t("open")}
                        >
                          <FiFileText size={16} />
                          {t("open")}
                        </button>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </div>

                    <div className="mt-2 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">
                          {t("columns.client")}
                        </p>
                        <p className="truncate">
                          {d.user?.prenom} {d.user?.nom}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold text-gray-500">
                          {t("columns.date")}
                        </p>
                        <p className="truncate">{shortDate(d.createdAt)}</p>
                      </div>
                    </div>

                    <p className="mt-2 text-[11px] font-semibold text-gray-500">
                      {t("columns.attachments")}
                    </p>
                    {docs.length === 0 ? (
                      <p className="text-gray-500">—</p>
                    ) : (
                      <div className="mt-1 flex flex-wrap gap-2">
                        {docs.map((doc) => (
                          <button
                            key={doc.index}
                            onClick={() => viewDocByIndex(d._id, doc.index)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                          >
                            <FiFileText size={16} />
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
                onPageSizeChange={(s) => {
                  setPageSize(Number(s));
                  setPage(1);
                }}
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
        onCreated={() => {
          setMultiOpen(false);
          setSelectedIds([]);
          load(false);
        }}
        demandKinds={["grille"]}
        articleKinds={["grille"]}
      />

      {toast && (
        <div className="fixed z-50 top-4 right-4 rounded-xl border px-4 py-2 shadow-lg bg-blue-50 border-blue-200 text-blue-800">
          <div className="flex items-center gap-3">
            <span className="text-sm">{toast.text}</span>
            <button
              onClick={() => setToast(null)}
              className="ml-1 inline-flex rounded-md border px-2 py-0.5 text-xs"
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// فتح مباشر (stream من السيرفر)
function viewPdfById(id) {
  window.open(`${BACKEND}/api/devis/grille/${id}/pdf`, "_blank", "noopener,noreferrer");
}
function viewDocByIndex(id, index) {
  window.open(`${BACKEND}/api/devis/grille/${id}/document/${index}`, "_blank", "noopener,noreferrer");
}
