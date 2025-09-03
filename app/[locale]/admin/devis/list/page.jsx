"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FiSearch, FiXCircle, FiFileText, FiChevronDown } from "react-icons/fi";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";

/* ---------- Config ---------- */
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";
const FETCH_OPTS = { method: "GET", cache: "no-store", credentials: "include" };

/* ---------- Helpers UI ---------- */
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
const uniq = (arr) => Array.from(new Set(arr || []));

const normalizeType = (x) => {
  const s = String(x || "").trim().toLowerCase();
  if (!s) return "";
  if (
    [
      "fil",
      "fil-dresse",
      "fil dresse",
      "fil_dresse",
      "fildresse",
      "fil dressé coupé",
      "fil dresse coupe",
    ].includes(s)
  ) {
    return "filDresse";
  }
  return s; // compression, torsion, traction, grille, autre…
};

/* Mapping UI → segments API connus */
const API_TYPE_MAP = {
  compression: "compression",
  torsion: "torsion",
  traction: "traction",
  filDresse: "fil",
  grille: "grille",
  autre: "autre",
};

/* ---------- Small utilities ---------- */
function useDebounced(value, delay = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return v;
}

async function fetchInBatches(fns, batchSize = 6) {
  const out = [];
  for (let i = 0; i < fns.length; i += batchSize) {
    const chunk = fns.slice(i, i + batchSize);
    const res = await Promise.all(chunk.map((fn) => fn().catch(() => null)));
    out.push(...res);
  }
  return out;
}

/* ===================================================================== */

export default function DevisList() {
  const router = useRouter();
  const t = useTranslations("auth.admin.quotesListPage");

  const [err, setErr] = useState("");
  const [loadingDemandes, setLoadingDemandes] = useState(true);
  const [updatingDetails, setUpdatingDetails] = useState(false);

  const [demandes, setDemandes] = useState([]);

  const [q, setQ] = useState("");
  const dq = useDebounced(q, 300);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [typeFilter, setTypeFilter] = useState("all");

  /* Libellés i18n sûrs pour les types + fallback au code */
  const TYPE_LABELS = useMemo(
    () => ({
      compression: t("types.compression"),
      torsion: t("types.torsion"),
      traction: t("types.traction"),
      filDresse: t("types.filDresse"),
      grille: t("types.grille"),
      autre: t("types.autre"),
    }),
    [t]
  );
  const displayTypeLabel = useCallback(
    (code) => TYPE_LABELS[code] ?? code,
    [TYPE_LABELS]
  );

  // Cache détails: demandeId -> {devisNumero, devisPdf, demandeNumeros, types, date}
  const detailsCacheRef = useRef(new Map());
  const [tick, setTick] = useState(0);

  /* ---------- API helpers ---------- */
  const fetchOneType = useCallback(async (seg) => {
    const try1 = `${BACKEND}/api/admin/devis/${seg}`;
    const try2 = `${BACKEND}/api/admin/devis?type=${encodeURIComponent(seg)}`;
    let r = await fetch(try1, FETCH_OPTS);
    if (r.status === 404) r = await fetch(try2, FETCH_OPTS);
    return r;
  }, []);

  const fetchAllTypes = useCallback(async () => {
    const segs = Object.values(API_TYPE_MAP);
    const results = await Promise.all(
      segs.map(async (seg) => {
        try {
          const r = await fetchOneType(seg);
          if (r.status === 401) throw new Error("__401__");
          if (r.status === 403) throw new Error("__403__");
          if (!r.ok) return [];
          const j = await r.json().catch(() => null);
          return Array.isArray(j?.items) ? j.items : [];
        } catch (e) {
          if (String(e?.message) === "__401__") throw e;
          if (String(e?.message) === "__403__") throw e;
          return [];
        }
      })
    );
    return results.flat();
  }, [fetchOneType]);

  /* ---------- Step 1: charger demandes ---------- */
  const loadDemandes = useCallback(async () => {
    try {
      setErr("");
      setLoadingDemandes(true);

      let items = [];
      if (typeFilter === "all") {
        items = await fetchAllTypes();
      } else {
        const seg = API_TYPE_MAP[typeFilter];
        const res = await fetchOneType(seg);

        if (res.status === 401) {
          router.push(`/fr/login?next=${encodeURIComponent("/fr/admin/devis/list")}`);
          return;
        }
        if (res.status === 403) {
          router.push(`/fr/unauthorized?code=403`);
          return;
        }

        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) throw new Error(data?.message || `Erreur (${res.status})`);
        items = Array.isArray(data.items) ? data.items : [];
      }

      setDemandes(items);
    } catch (e) {
      if (String(e?.message) === "__401__" || String(e?.message) === "__403__") return;
      setErr(e?.message || "Network error");
      setDemandes([]);
    } finally {
      setLoadingDemandes(false);
    }
  }, [router, typeFilter, fetchAllTypes, fetchOneType]);

  useEffect(() => {
    loadDemandes();
  }, [loadDemandes]);

  /* ---------- Step 2: rows de base ---------- */
  const baseRows = useMemo(() => {
    return (demandes || []).map((d) => {
      const client = `${d?.user?.prenom || ""} ${d?.user?.nom || ""}`.trim();
      const types = [normalizeType(d?.type), typeFilter !== "all" ? typeFilter : null].filter(Boolean);
      return {
        demandeId: d._id,
        demandeNumero: d.numero,
        client,
        date: d?.createdAt || "",
        types: Array.from(new Set(types)),
        devisNumero: "",
        devisPdf: "",
        demandeNumeros: [d.numero],
      };
    });
  }, [demandes, typeFilter]);

  /* ---------- Step 3: merge cache + group by n° devis ---------- */
  const rows = useMemo(() => {
    const merged = baseRows.map((r) => {
      const det = detailsCacheRef.current.get(r.demandeId);
      if (!det) return r;
      return {
        ...r,
        ...det,
        demandeNumeros: det?.demandeNumeros?.length ? uniq(det.demandeNumeros) : [r.demandeNumero],
        types: uniq([...(r.types || []), ...(det.types || [])]),
        date: det?.date || r.date,
      };
    });

    const grouped = new Map();
    for (const r of merged) {
      const key = r.devisNumero || r.demandeId;
      const g = grouped.get(key);
      if (!g) {
        grouped.set(key, {
          ...r,
          demandeNumeros: uniq(r.demandeNumeros || [r.demandeNumero]),
          types: uniq(r.types || []),
        });
      } else {
        g.demandeNumeros = uniq([...(g.demandeNumeros || []), ...(r.demandeNumeros || [r.demandeNumero])]);
        g.types = uniq([...(g.types || []), ...(r.types || [])]);
        if (new Date(r.date).getTime() > new Date(g.date).getTime()) g.date = r.date;
      }
    }

    return Array.from(grouped.values()).sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }, [baseRows, tick]);

  /* ---------- Step 4: filtre recherche ---------- */
  const filtered = useMemo(() => {
    const needle = dq.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((r) => {
      const client = (r.client || "").toLowerCase();
      const devisNum = (r.devisNumero || "").toLowerCase();
      const demNums = ((r.demandeNumeros && r.demandeNumeros.join(" ")) || r.demandeNumero || "").toLowerCase();
      const typesStr = (r.types || []).map((code) => displayTypeLabel(code)).join(" ").toLowerCase();
      const dateStr = shortDate(r.date).toLowerCase();
      return client.includes(needle) || devisNum.includes(needle) || demNums.includes(needle) || typesStr.includes(needle) || dateStr.includes(needle);
    });
  }, [rows, dq, displayTypeLabel]);

  /* ---------- Step 5: pagination ---------- */
  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [filtered.length, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [dq, typeFilter]);

  const { pageItems, total } = useMemo(() => {
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { pageItems: filtered.slice(start, end), total };
  }, [filtered, page, pageSize]);

  /* ---------- Step 6: charger détails des items visibles ---------- */
  useEffect(() => {
    const idsToFetch = pageItems.map((r) => r.demandeId).filter((id) => id && !detailsCacheRef.current.has(id));
    if (idsToFetch.length === 0) return;

    let cancelled = false;
    const controller = new AbortController();
    setUpdatingDetails(true);

    (async () => {
      const jobs = idsToFetch.map((id) => {
        const r = pageItems.find((x) => x.demandeId === id);
        const numero = r?.demandeNumero || "";
        return async () => {
          const res = await fetch(
            `${BACKEND}/api/devis/admin/by-demande/${id}?numero=${encodeURIComponent(numero)}`,
            { credentials: "include", signal: controller.signal }
          );
          const j = await res.json().catch(() => null);
          if (!j?.success || !j?.exists) return;

          const metaNums = Array.isArray(j?.demandeNumeros)
            ? j.demandeNumeros
            : Array.isArray(j?.devis?.meta?.demandes)
              ? j.devis.meta.demandes.map((x) => x?.numero).filter(Boolean)
              : j?.devis?.demandeNumero
                ? [j.devis.demandeNumero]
                : [];

          const metaTypesRaw = Array.isArray(j?.devis?.meta?.demandes)
            ? j.devis.meta.demandes.map((x) => x?.type || x?.typeDemande || x?.kind).filter(Boolean)
            : j?.devis?.typeDemande || j?.devis?.type || j?.type
              ? [j?.devis?.typeDemande || j?.devis?.type || j?.type]
              : [];

          const det = {
            devisNumero: j?.devis?.numero || "",
            devisPdf: j?.pdf || "",
            demandeNumeros: metaNums.length ? uniq(metaNums) : undefined,
            types: uniq((metaTypesRaw || []).map(normalizeType)).filter(Boolean),
            date: j?.devis?.createdAt || "",
          };

          detailsCacheRef.current.set(id, det);
        };
      });

      await fetchInBatches(jobs, 6);
      if (!cancelled) setTick((t) => t + 1);
    })()
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setUpdatingDetails(false);
      });

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [pageItems]);

  /* ---------- Render ---------- */
  const isBusy = loadingDemandes && rows.length === 0;

  return (
    <div className="py-6 space-y-6 sm:space-y-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        {/* Header */}
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#002147]">
            {t("title")}
          </h1>
          {err && <p className="text-sm text-red-600">{err}</p>}

          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            {/* Type filter */}
            <div className="relative w-full sm:w-[240px]">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="peer appearance-none h-10 w-full rounded-xl border border-gray-300 bg-white pl-3 pr-10 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                title={t("filters.type.title")}
              >
                <option value="all">{t("filters.type.all")}</option>
                <option value="compression">{t("types.compression")}</option>
                <option value="torsion">{t("types.torsion")}</option>
                <option value="traction">{t("types.traction")}</option>
                <option value="filDresse">{t("types.filDresse")}</option>
                <option value="grille">{t("types.grille")}</option>
                <option value="autre">{t("types.autre")}</option>
              </select>
              <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                <FiChevronDown size={16} className="text-gray-500 peer-focus:text-[#F7C600]" />
              </span>
            </div>

            {/* Search */}
            <div className="relative w-full sm:w-[520px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("search.placeholder")}
                aria-label={t("search.aria")}
                className="w-full rounded-xl border border-gray-300 bg-white px-9 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
              {q && (
                <button
                  type="button"
                  onClick={() => setQ("")}
                  aria-label={t("search.clear")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>
          </div>
        </header>

        <section className="rounded-2xl border border-[#F7C60022] bg-white p-0 shadow-[0_6px_22px_rgba(0,0,0,.06)]">
          {isBusy ? (
            <div className="px-6 py-6 space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          ) : total === 0 ? (
            <p className="px-6 py-6 text-gray-500">{t("messages.noData")}</p>
          ) : (
            <>
              {/* ≥ md : Table */}
              <div className="hidden md:block">
                <div className="rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full table-auto">
                      <colgroup>
                        <col className="w-[16%]" />
                        <col className="w-[24%]" />
                        <col className="w-[18%]" />
                        <col className="w-[22%]" />
                        <col className="w-[12%]" />
                        <col className="w-[8%]" />
                      </colgroup>

                      <thead className="sticky top-0 z-10">
                        <tr className="bg-white">
                          {[
                            t("table.headers.devis"),
                            t("table.headers.demandes"),
                            t("table.headers.types"),
                            t("table.headers.client"),
                            t("table.headers.date"),
                            t("table.headers.pdf"),
                          ].map((h) => (
                            <th key={h} className={h === t("table.headers.pdf") ? "p-4 text-right" : "p-4 text-left"}>
                              <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                                {h}
                              </div>
                            </th>
                          ))}
                        </tr>
                        <tr>
                          <td colSpan={6}>
                            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                          </td>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-gray-100">
                        {pageItems.map((r) => (
                          <tr key={r.devisNumero || r.demandeId} className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors">
                            {/* N° Devis */}
                            <td className="p-4 align-top font-mono">
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#F7C600] inline-block" />
                                <span>{r.devisNumero || <span className="text-gray-400">—</span>}</span>
                              </div>
                            </td>

                            {/* N° demandes */}
                            <td className="p-4 align-top">
                              {r.demandeNumeros?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.demandeNumeros.map((n) => (
                                    <span key={n} className="inline-flex items-center rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] font-mono">
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="font-mono">{r.demandeNumero}</span>
                              )}
                            </td>

                            {/* Types */}
                            <td className="p-4 align-top">
                              {r.types?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.types.map((tcode) => (
                                    <span key={tcode} className="inline-flex items-center rounded-full bg-[#0B1E3A]/5 border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px]">
                                      {displayTypeLabel(tcode)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>

                            {/* Client */}
                            <td className="p-4 align-top">
                              <span className="block truncate" title={r.client}>{r.client}</span>
                            </td>

                            {/* Date */}
                            <td className="p-4 align-top">{shortDate(r.date)}</td>

                            {/* PDF */}
                            <td className="p-4 align-top">
                              <div className="flex items-center justify-end">
                                {r.devisPdf ? (
                                  <a
                                    href={r.devisPdf}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 rounded-full border border-[#0B1E3A]/20 bg-[#0B1E3A]/5 px-3 py-1 text-[12px] hover:bg-[#0B1E3A]/10"
                                    title={t("actions.openPdf")}
                                  >
                                    <FiFileText size={14} />
                                    {t("actions.openPdf")}
                                  </a>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* < md : Cards */}
              <div className="md:hidden grid grid-cols-1 gap-3 px-4 py-4">
                {pageItems.map((r) => (
                  <div key={r.devisNumero || r.demandeId} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500">{t("mobile.labels.devis")}</p>
                        <div className="mt-0.5 flex items-center gap-2 text-[#0B1E3A]">
                          <span className="h-3 w-3 rounded-full bg-[#F7C600] inline-block" />
                          <span className="font-mono">{r.devisNumero || "—"}</span>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-gray-500">{t("mobile.labels.demandes")}</p>
                        <p className="font-mono text-[#0B1E3A]">
                          {r.demandeNumeros?.length ? r.demandeNumeros.join(", ") : r.demandeNumero}
                        </p>

                        <p className="mt-3 text-xs font-semibold text-gray-500">{t("mobile.labels.types")}</p>
                        <p className="text-[#0B1E3A]">
                          {r.types?.length ? r.types.map((c) => displayTypeLabel(c)).join(", ") : <span className="text-gray-400">—</span>}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">{t("mobile.labels.client")}</p>
                            <p className="truncate" title={r.client}>{r.client}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">{t("mobile.labels.date")}</p>
                            <p>{shortDate(r.date)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {r.devisPdf ? (
                          <a
                            href={r.devisPdf}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center h-9 px-3 rounded-md border border-[#0B1E3A]/20 bg-[#0B1E3A]/5 text-[#0B1E3A] hover:bg-[#0B1E3A]/10 transition"
                            title={t("actions.openPdf")}
                            aria-label={t("actions.openPdf")}
                          >
                            <FiFileText size={18} />
                          </a>
                        ) : (
                          <span className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-gray-400">
                            —
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="px-4 pb-5">
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  pageSizeOptions={[5, 10, 20, 50]}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
