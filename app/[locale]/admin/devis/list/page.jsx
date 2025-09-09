"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { FiSearch, FiXCircle, FiFileText, FiChevronDown } from "react-icons/fi";
import Pagination from "@/components/Pagination";

/* --------------------------- Constants --------------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");
const FETCH_OPTS = { method: "GET", cache: "no-store", credentials: "include" };

/* ---------------------------- Helpers ---------------------------- */
function shortDate(d) {
  try {
    const dt = new Date(String(d));
    if (Number.isNaN(dt.getTime())) return "";
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "";
  }
}

const uniq = (arr) => Array.from(new Set(arr || []));

const normalizeType = (x) => {
  const s = String(x ?? "").trim().toLowerCase();
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
      "fil dressé",
      "fil dresse",
    ].includes(s)
  ) {
    return "filDresse";
  }
  return s; // compression, torsion, traction, grille, autre…
};

/* ================================================================= */

export default function AllDevisList() {
  const t = useTranslations("auth.admin.quotesListPage");
  const router = useRouter();

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

  const displayType = useCallback(
    (code) => TYPE_LABELS[code] ?? String(code),
    [TYPE_LABELS]
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  /* ----------------------- Open PDF (static/api) ----------------------- */
  const openPdf = useCallback(async (numero) => {
    if (!numero) return;
    const staticUrl = `${BACKEND}/files/devis/${encodeURIComponent(numero)}.pdf`;
    try {
      const head = await fetch(staticUrl, { method: "HEAD", credentials: "include" });
      if (head.ok) {
        window.open(staticUrl, "_blank", "noopener,noreferrer");
        return;
      }
    } catch {
      /* noop */
    }
    // Fallback (API qui reconstruit le PDF si absent)
    const apiUrl = `${BACKEND}/api/devis/admin/pdf/${encodeURIComponent(numero)}`;
    window.open(apiUrl, "_blank", "noopener,noreferrer");
  }, []);

  /* ----------------------------- Fetch list ---------------------------- */
  const load = useCallback(async () => {
    try {
      setErr("");
      setLoading(true);

      let r = await fetch(`${BACKEND}/api/devis/devis/list`, FETCH_OPTS);
      if (r.status === 404) r = await fetch(`${BACKEND}/api/admin/devis/list`, FETCH_OPTS);

      if (r.status === 401) {
        router.push(`/fr/login?next=${encodeURIComponent("/fr/admin/devis/all")}`);
        return;
      }
      if (r.status === 403) {
        router.push(`/fr/unauthorized?code=403`);
        return;
      }

      const data = (await r.json().catch(() => null)) || null;
      if (!r.ok || !data) throw new Error(data?.message || `Erreur (${r.status})`);

      const raw = Array.isArray(data.items) ? data.items : [];

      const mapped = raw.map((it) => {
        const demandes =
          Array.isArray(it?.demandeNumeros) && it.demandeNumeros.length
            ? it.demandeNumeros
            : Array.isArray(it?.meta?.demandes)
              ? (it.meta.demandes || [])
                .map((d) => d?.numero)
                .filter(Boolean)
              : it?.demandeNumero
                ? [String(it.demandeNumero)]
                : [];

        const typesRaw =
          Array.isArray(it?.types) && it.types.length
            ? it.types
            : Array.isArray(it?.meta?.demandes)
              ? (it.meta.demandes || [])
                .map((d) => d?.type || d?.typeDemande || d?.kind)
                .filter(Boolean)
              : it?.type
                ? [it.type]
                : [];

        const types = uniq(typesRaw.map(normalizeType)).filter(Boolean);

        const client =
          typeof it?.client === "string"
            ? it.client
            : `${it?.client?.prenom || ""} ${it?.client?.nom || ""}`.trim();

        const numero = it?.numero || it?.devisNumero || it?.devis?.numero || "";

        return {
          id: it?._id || numero || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Math.random())),
          numero,
          date: it?.createdAt || it?.devis?.createdAt || it?.date || "",
          client,
          demandes: uniq(demandes),
          types,
        };
      });

      setItems(
        mapped.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
      );
    } catch (e) {
      setErr(e?.message || "Network error");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  /* ------------------------------- Filters ------------------------------ */
  const filtered = useMemo(() => {
    let out = items;
    if (typeFilter !== "all") out = out.filter((x) => (x.types || []).includes(typeFilter));
    const needle = q.trim().toLowerCase();
    if (!needle) return out;
    return out.filter((r) => {
      const inClient = (r.client || "").toLowerCase().includes(needle);
      const inNumero = (r.numero || "").toLowerCase().includes(needle);
      const inDemandes = (r.demandes || []).join(" ").toLowerCase().includes(needle);
      const inTypes = (r.types || []).map(displayType).join(" ").toLowerCase().includes(needle);
      const inDate = shortDate(r.date).toLowerCase().includes(needle);
      return inClient || inNumero || inDemandes || inTypes || inDate;
    });
  }, [items, q, typeFilter, displayType]);

  /* ----------------------------- Pagination ----------------------------- */
  useEffect(() => {
    setPage(1);
  }, [q, typeFilter, pageSize]);

  const { pageItems, total } = useMemo(() => {
    const totalCount = filtered.length;
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return { pageItems: filtered.slice(start, end), total: totalCount };
  }, [filtered, page, pageSize]);

  /* -------------------------------- UI --------------------------------- */
  return (
    <div className="py-6 space-y-6 sm:space-y-8">
      <div className="mx-auto w-full max-w-6xl space-y-8">
        <header className="space-y-4 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
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
              <FiSearch
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
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
          {loading ? (
            <div className="px-6 py-6 space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          ) : total === 0 ? (
            <p className="px-6 py-6 text-gray-500">{t("messages.noData")}</p>
          ) : (
            <>
              {/* Desktop */}
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
                            <th
                              key={h}
                              className={h === t("table.headers.pdf") ? "p-4 text-right" : "p-4 text-left"}
                            >
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
                          <tr key={r.id} className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors">
                            <td className="p-4 align-top font-mono">
                              <div className="flex items-center gap-2">
                                <span className="h-3 w-3 rounded-full bg-[#F7C600]" />
                                <span>{r.numero || <span className="text-gray-400">—</span>}</span>
                              </div>
                            </td>
                            <td className="p-4 align-top">
                              {r.demandes?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.demandes.map((n) => (
                                    <span
                                      key={n}
                                      className="inline-flex items-center rounded-full border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px] font-mono"
                                    >
                                      {n}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="p-4 align-top">
                              {r.types?.length ? (
                                <div className="flex flex-wrap gap-1">
                                  {r.types.map((c) => (
                                    <span
                                      key={c}
                                      className="inline-flex items-center rounded-full bg-[#0B1E3A]/5 border border-[#0B1E3A]/20 px-2 py-0.5 text-[11px]"
                                    >
                                      {displayType(c)}
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="p-4 align-top">
                              <span className="block truncate" title={r.client}>
                                {r.client}
                              </span>
                            </td>
                            <td className="p-4 align-top">{shortDate(r.date)}</td>
                            <td className="p-4 align-top">
                              <div className="flex items-center justify-end">
                                {r.numero ? (
                                  <button
                                    onClick={() => openPdf(r.numero)}
                                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                                    title={t("actions.openPdf")}
                                  >
                                    <FiFileText size={16} />
                                    {t("actions.openPdf")}
                                  </button>

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

              {/* Mobile */}
              <div className="md:hidden grid grid-cols-1 gap-3 px-4 py-4">
                {pageItems.map((r) => (
                  <div key={r.id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500">
                          {t("mobile.labels.devis")}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2 text-[#0B1E3A]">
                          <span className="h-3 w-3 rounded-full bg-[#F7C600]" />
                          <span className="font-mono">{r.numero || "—"}</span>
                        </div>

                        <p className="mt-3 text-xs font-semibold text-gray-500">
                          {t("mobile.labels.demandes")}
                        </p>
                        <p className="font-mono text-[#0B1E3A]">
                          {r.demandes?.length ? r.demandes.join(", ") : "—"}
                        </p>

                        <p className="mt-3 text-xs font-semibold text-gray-500">
                          {t("mobile.labels.types")}
                        </p>
                        <p className="text-[#0B1E3A]">
                          {r.types?.length ? r.types.map(displayType).join(", ") : <span className="text-gray-400">—</span>}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">
                              {t("mobile.labels.client")}
                            </p>
                            <p className="truncate" title={r.client}>
                              {r.client}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">
                              {t("mobile.labels.date")}
                            </p>
                            <p>{shortDate(r.date)}</p>
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {r.numero ? (
                          <button
                            onClick={() => openPdf(r.numero)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                            title={t("actions.openPdf")}
                          >
                            <FiFileText size={16} />
                            {t("actions.openPdf")}
                          </button>

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
