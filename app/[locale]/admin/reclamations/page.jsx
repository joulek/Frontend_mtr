"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";
import { FiXCircle, FiFileText } from "react-icons/fi";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

/* ------ Date helpers robustes ------ */
const toDate = (v) => {
  if (!v && v !== 0) return null;
  if (typeof v === "number") {
    const ms = String(v).length === 10 ? v * 1000 : v; // seconds -> ms
    const d = new Date(ms);
    return isNaN(d) ? null : d;
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const fmtDateTime = (v) => {
  const d = toDate(v);
  if (!d) return "—";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
};

export default function AdminReclamationsPage() {
  const t = useTranslations("auth.reclamationsAdmin");

  // Données de page (déjà paginées par le backend)
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Recherche (debounced)
  const [q, setQ] = useState("");
  const [qDeb, setQDeb] = useState("");
  useEffect(() => {
    const id = setTimeout(() => setQDeb(q), 300);
    return () => clearTimeout(id);
  }, [q]);

  // Pagination (client -> serveur)
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // UI état d’ouverture PDF
  const [openingId, setOpeningId] = useState(null);

  // Chargement depuis l’API (paginée + filtrée)
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          page: String(page),
          pageSize: String(pageSize),
          q: qDeb,
        }).toString();
        const res = await fetch(`${BACKEND}/api/reclamations/admin?${params}`, {
          credentials: "include",
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.success) {
          throw new Error(data?.message || `HTTP ${res.status}`);
        }
        setRows(Array.isArray(data.data) ? data.data : []);
        setTotal(Number(data.total || 0));
      } catch (e) {
        console.error(e);
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    })();
  }, [page, pageSize, qDeb]);

  // Reset à la page 1 quand la recherche change
  useEffect(() => {
    setPage(1);
  }, [qDeb]);

  async function viewPdfById(id) {
    try {
      setOpeningId(id);
      const res = await fetch(`${BACKEND}/api/reclamations/admin/${id}/pdf`, {
        credentials: "include",
      });
      if (!res.ok) {
        alert(t("errors.attachmentUnavailable"));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert(t("errors.openPdf"));
    } finally {
      setOpeningId(null);
    }
  }

  async function viewDocByIndex(id, index) {
    try {
      const res = await fetch(
        `${BACKEND}/api/reclamations/admin/${id}/document/${index}`,
        { credentials: "include" }
      );
      if (!res.ok) return alert(t("errors.attachmentUnavailable"));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank", "noopener,noreferrer");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert(t("errors.openAttachment"));
    }
  }

  return (
    <div className="px-3 sm:px-6 lg:px-8 py-6">
      {/* Titre */}
      <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A] text-center">
        {t("title")}
      </h1>

      {/* Recherche */}
      <div className="mt-4">
        <div className="relative w-full xs:max-w-sm sm:max-w-xl md:max-w-2xl lg:max-w-3xl mx-auto">
          {/* loupe */}
          <svg
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          >
            <path
              d="M21 21l-3.8-3.8M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round"
            />
          </svg>

          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-9 py-2 text-sm text-[#0B1E3A]
                       shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
            aria-label={t("searchAria")}
          />

          {/* clear */}
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label={t("clearSearch")}
              className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center
                         h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
            >
              <FiXCircle size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Etat de chargement / vide */}
      {loading ? (
        <div className="mt-6 text-center text-gray-500">{t("loading")}</div>
      ) : total === 0 ? (
        <div className="mt-6 text-center text-gray-500">{t("noData")}</div>
      ) : (
        <>
          {/* ===== Mobile (<md): cartes ===== */}
          <div className="mt-6 grid grid-cols-1 gap-4 md:hidden">
            {rows.map((r) => (
              <div key={r._id} className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-right">
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("table.number")}</p>
                    <p className="font-medium tabular-nums">{r.numero || "—"}</p>
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400 shrink-0" />
                      <p className="text-[#0B1E3A] font-semibold truncate">{r.client || "—"}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("table.typeDoc")}</p>
                    <p className="capitalize">{r.typeDoc?.replace("_", " ") || "—"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("table.date")}</p>
                    <p>{fmtDateTime(r.date || r.createdAt || r.updatedAt || r?.demandePdf?.generatedAt)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {r.pdf ? (
                    <button
                      onClick={() => viewPdfById(r._id)}
                      disabled={openingId === r._id}
                      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm
                                  ${openingId === r._id ? "cursor-wait animate-pulse" : "hover:bg-slate-50"} text-[#0B1E3A]`}
                      aria-label={t("actions.openPdf")} title={t("actions.openPdf")}
                    >
                      <FiFileText size={16} />
                      {openingId === r._id ? t("actions.openingPdf") : t("actions.openPdf")}
                    </button>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-gray-200 text-gray-600 px-3 py-1 text-xs">
                      {t("pdf.none")}
                    </span>
                  )}

                  {Array.isArray(r.piecesJointes) && r.piecesJointes.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {r.piecesJointes.map((p, idx) => (
                        <button
                          key={idx}
                          onClick={() => viewDocByIndex(r._id, idx)}
                          className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                          title={p?.mimetype || ""}
                        >
                          <FiFileText size={16} />
                          {p?.filename || `pj_${idx + 1}`}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-600">{t("attachments.none")}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ===== Desktop (≥md): tableau ===== */}
          <div className="mt-6 rounded-2xl border border-gray-200 overflow-hidden shadow-sm bg-white hidden md:block">
            <div className="w-full overflow-x-auto">
              <table className="min-w-[820px] w-full text-sm">
                <thead className="bg-white">
                  <tr>
                    <th className="p-4 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.number")}</div></th>
                    <th className="p-4 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.client")}</div></th>
                    <th className="p-4 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.typeDoc")}</div></th>
                    <th className="p-4 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.date")}</div></th>
                    <th className="p-4 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.pdf")}</div></th>
                    <th className="p-4 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.attachments")}</div></th>
                  </tr>
                  <tr>
                    <td colSpan={7}><div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" /></td>
                  </tr>
                </thead>

                <tbody className="divide-y divide-gray-100">
                  {rows.map((r, i) => (
                    <tr key={r._id} className={i % 2 ? "bg-white" : "bg-gray-50/40"}>
                      <td className="px-4 py-3 tabular-nums">{r.numero || "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2.5 w-2.5 rounded-full bg-yellow-400" />
                          <span className="text-[#0B1E3A] font-medium break-words">{r.client || "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 capitalize">{r.typeDoc?.replace("_", " ") || "—"}</td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {fmtDateTime(r.date || r.createdAt || r.updatedAt || r?.demandePdf?.generatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {r.pdf ? (
                          <button
                            onClick={() => viewPdfById(r._id)}
                            disabled={openingId === r._id}
                            className={`inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm text-[#0B1E3A] ${
                              openingId === r._id ? "cursor-wait animate-pulse" : "hover:bg-slate-50"
                            }`}
                            aria-label={t("actions.openPdf")} title={t("actions.openPdf")}
                          >
                            <FiFileText size={16} />
                            {openingId === r._id ? t("actions.opening") : t("actions.open")}
                          </button>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-gray-200 text-gray-600 px-2.5 py-1 text-xs">
                            {t("pdf.noneShort")}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {Array.isArray(r.piecesJointes) && r.piecesJointes.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {r.piecesJointes.map((p, idx) => (
                              <button
                                key={idx}
                                onClick={() => viewDocByIndex(r._id, idx)}
                                className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1.5 text-sm hover:bg-slate-50 text-[#0B1E3A]"
                                title={p?.mimetype || ""}
                              >
                                <FiFileText size={16} />
                                {t("actions.open")}
                              </button>
                            ))}
                          </div>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Pagination */}
      <div className="px-1 sm:px-0">
        <div className="mt-3">
          <Pagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={(sz) => { setPageSize(sz); setPage(1); }}
            pageSizeOptions={[5, 10, 20, 50]}
          />
        </div>
      </div>
    </div>
  );
}
