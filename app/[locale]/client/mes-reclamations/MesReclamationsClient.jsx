"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useLocale, useTranslations } from "next-intl";
import { FiSearch, FiXCircle, FiFileText } from "react-icons/fi";
import Pagination from "@/components/Pagination";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

/* -------------------- helpers -------------------- */
function getCookie(name) {
  if (typeof document === "undefined") return "";
  const v = document.cookie.split("; ").find((c) => c.startsWith(name + "="));
  return v ? decodeURIComponent(v.split("=")[1]) : "";
}
/* ------------------------------------------------- */

export default function MesReclamationsPage() {
  const t = useTranslations("auth.client.claimsPage");
  const tAuth = useTranslations("auth");
  const locale = useLocale();

  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const NOT_YET = t("notYet");

  /* --------- fetch --------- */
  const fetchAll = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const token =
        getCookie("token") ||
        (typeof localStorage !== "undefined" &&
          (localStorage.getItem("token") || localStorage.getItem("authToken"))) ||
        "";

      const headers = {};
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch(`${BACKEND}/api/reclamations/me`, {
        credentials: "include",
        headers,
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || tAuth("errors.network"));
      setAllItems(data.items || []);
    } catch (e) {
      setError(e.message || tAuth("errors.network"));
    } finally {
      setLoading(false);
    }
  }, [tAuth]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  /* --------- helpers UI --------- */
  const prettyDateTime = (iso) => {
    try {
      const d = new Date(iso);
      return d.toLocaleString(locale || "fr-FR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso || "-";
    }
  };

  const openUrlInNewTab = async (url) => {
    try {
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        setError(t("errors.fileNotFound"));
        return;
      }
      const blob = await res.blob();
      const obj = URL.createObjectURL(blob);
      window.open(obj, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(obj), 60000);
    } catch {
      setError(t("errors.cannotOpen"));
    }
  };

  const openPdf = (id) => {
    const url = `${BACKEND}/api/reclamations/${id}/pdf`;
    openUrlInNewTab(url);
  };

  const norm = (s) =>
    (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  /* --------- filtre --------- */
  const filtered = useMemo(() => {
    const nq = norm(q);
    if (!nq) return allItems;

    return allItems.filter((it) => {
      const number = `${it?.commande?.numero || ""}`;
      const type = `${it?.commande?.typeDoc || ""}`;
      const nature = `${it?.nature || ""}`;
      const attente = `${it?.attente || ""}`;
      const dateText = prettyDateTime(it?.createdAt);
      const haystack = norm([number, type, nature, attente, dateText].join(" "));
      return haystack.includes(nq);
    });
  }, [allItems, q]);

  useEffect(() => {
    setPage(1);
  }, [q]);

  /* --------- pagination --------- */
  const total = filtered.length;
  const pageStart = (page - 1) * pageSize;
  const pageItems = filtered.slice(pageStart, pageStart + pageSize);

  /* --------- render --------- */
  return (
    <div className="mx-auto w-full max-w-6xl px-3 sm:px-6 py-6 space-y-6 sm:space-y-8">
      <header className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
          {t("title")}
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">{t("subtitle")}</p>
        {error && <p className="mt-1 text-sm text-rose-600">{error}</p>}
      </header>

      {/* recherche */}
      <div className="w-full mt-1">
        <div className="relative mx-auto w-full max-w-2xl">
          <FiSearch
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={18}
          />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-gray-300 bg-white px-9 pr-9 py-2 text-sm sm:text-base text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t("clear")}
              title={t("clear")}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <FiXCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* ====== LISTE RESPONSIVE ======
          - Mobile (<md): cartes empilées
          - Desktop (md+): tableau avec overflow-x-auto
      */}
      <div className="rounded-2xl border border-[#F7C60022] bg-white shadow-[0_6px_22px_rgba(0,0,0,.06)]">
        {loading ? (
          <p className="px-4 sm:px-6 py-6 text-slate-500">{t("loading")}</p>
        ) : error ? (
          <p className="px-4 sm:px-6 py-6 text-rose-600">{error}</p>
        ) : pageItems.length === 0 ? (
          <p className="px-4 sm:px-6 py-6 text-slate-500">{t("noData")}</p>
        ) : (
          <>
            {/* --- Cartes Mobile --- */}
            <ul className="md:hidden divide-y divide-gray-100">
              {pageItems.map((it) => {
                const typeDoc = (it?.commande?.typeDoc || "-").toUpperCase();
                const numero = it?.commande?.numero || "—";
                const hasPdf = !!it?.demandePdf?.generatedAt;

                return (
                  <li key={it._id} className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#F7C600] shrink-0" />
                          <span className="text-[#0B1E3A] font-semibold text-sm">
                            {typeDoc}
                          </span>
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          {t("table.quoteNumber")}{" "}
                          <span className="font-mono text-[#0B1E3A]">{numero}</span>
                        </div>

                        <div className="mt-2 grid grid-cols-1 gap-1 text-sm">
                          <div>
                            <span className="text-slate-500">{t("table.nature")}:</span>{" "}
                            <span className="text-[#0B1E3A]">{it?.nature || "-"}</span>
                          </div>
                          <div>
                            <span className="text-slate-500">{t("table.attente")}:</span>{" "}
                            <span className="text-[#0B1E3A]">{it?.attente || "-"}</span>
                          </div>
                          <div className="text-xs text-slate-500">
                            {prettyDateTime(it?.createdAt)}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {hasPdf ? (
                          <button
                            type="button"
                            onClick={() => openPdf(it._id)}
                            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-xs font-medium hover:bg-slate-50 text-[#0B1E3A]"
                            title={t("aria.openPdf")}
                          >
                            <FiFileText size={16} />
                            {t("actions.open")}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">{NOT_YET}</span>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* --- Tableau Desktop --- */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full min-w-[720px] table-auto">
                <thead>
                  <tr className="bg-white">
                    <th className="p-3 text-left">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("table.document")}
                      </div>
                    </th>
                    <th className="p-3 text-left">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("table.quoteNumber")}
                      </div>
                    </th>
                    <th className="p-3 text-left">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("table.nature")}
                      </div>
                    </th>
                    <th className="p-3 text-left">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("table.attente")}
                      </div>
                    </th>
                    <th className="p-3 text-left">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("table.createdAt")}
                      </div>
                    </th>
                    <th className="p-3 text-left">
                      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("table.pdf")}
                      </div>
                    </th>
                  </tr>
                  <tr>
                    <td colSpan={6}>
                      <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                    </td>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {pageItems.map((it) => {
                    const typeDoc = (it?.commande?.typeDoc || "-").toUpperCase();
                    const numero = it?.commande?.numero || "—";
                    const hasPdf = !!it?.demandePdf?.generatedAt;

                    return (
                      <tr
                        key={it._id}
                        className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors"
                      >
                        <td className="p-3 align-top">
                          <span className="inline-flex items-center gap-2 text-[#0B1E3A] font-medium">
                            <span className="h-2 w-2 rounded-full bg-[#F7C600] shrink-0" />
                            <span>{typeDoc}</span>
                          </span>
                        </td>

                        <td className="p-3 align-top font-mono text-[#0B1E3A]">
                          {numero}
                        </td>

                        <td className="p-3 align-top text-[#0B1E3A]">
                          {it?.nature || "-"}
                        </td>
                        <td className="p-3 align-top text-[#0B1E3A]">
                          {it?.attente || "-"}
                        </td>
                        <td className="p-3 align-top text-[#0B1E3A]">
                          {prettyDateTime(it?.createdAt)}
                        </td>

                        <td className="p-3 align-top">
                          {hasPdf ? (
                            <button
                              type="button"
                              onClick={() => openPdf(it._id)}
                              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                              title={t("aria.openPdf")}
                            >
                              <FiFileText size={16} />
                              {t("actions.open")}
                            </button>
                          ) : (
                            <span className="text-slate-500">{NOT_YET}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="px-3 sm:px-4 pb-5">
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
      </div>
    </div>
  );
}
