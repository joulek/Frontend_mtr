"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { FiX, FiTrash2, FiPlus, FiSearch } from "react-icons/fi";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";
const DEFAULT_KINDS = ["compression", "torsion", "traction", "fil", "forme"];

export default function MultiDevisModal({
  open,
  onClose,
  demands,
  onCreated,
  demandKinds,
}) {
  const t = useTranslations("auth.admin.devisMulti");

  const [articles, setArticles] = useState([]);
  const [loadingArticles, setLoadingArticles] = useState(false);

  const [lines, setLines] = useState([]);
  const [creating, setCreating] = useState(false);

  // Pool d'autres demandes (même client) à ajouter
  const [pool, setPool] = useState([]);
  const [poolLoading, setPoolLoading] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerQ, setPickerQ] = useState("");

  const client = demands?.[0]?.user;

  // ---------- helpers ----------
  const getPU = (articleId) => {
    const a = articles.find((x) => x._id === articleId);
    return Number(a?.prixHT ?? a?.priceHT ?? 0) || 0;
  };
  const fmtDate = (d) => {
    try {
      const dt = new Date(d || "");
      return dt.toLocaleDateString();
    } catch {
      return "";
    }
  };

  // ---------- init ----------
  useEffect(() => {
    if (!open) return;

    // Lignes depuis la sélection
    setLines(
      (demands || []).map((d) => ({
        demandeId: d._id,
        ddvNumber: d.numero,
        articleId: "",
        qty: Number(d?.quantite ?? 1) || 1,
        remisePct: 0,
        tvaPct: 19,
      }))
    );

    // Articles (affichés SANS filtrage)
    (async () => {
      setLoadingArticles(true);
      try {
        const r = await fetch(`${BACKEND}/api/articles?limit=2000`, {
          cache: "no-store",
          credentials: "include",
        });
        const j = await r.json().catch(() => null);

        // Accepte plusieurs formats de payload
        const arr =
          (Array.isArray(j) ? j : null) ?? j?.data ?? j?.items ?? j?.results ?? [];

        setArticles(arr);
      } catch {
        setArticles([]);
      } finally {
        setLoadingArticles(false);
      }
    })();
  }, [open, demands]);

  // ---------- pool multi-types (filtrage par type ici SEULEMENT) ----------
  const loadPool = useCallback(async () => {
    if (!client?._id) return;
    setPoolLoading(true);
    try {
      const kindsToLoad =
        demandKinds && demandKinds.length ? demandKinds : DEFAULT_KINDS;

      const results = await Promise.all(
        kindsToLoad.map(async (k) => {
          try {
            const res = await fetch(
              `${BACKEND}/api/admin/devis/${encodeURIComponent(k)}`,
              { cache: "no-store", credentials: "include" }
            );
            const json = await res.json().catch(() => null);
            const arr = json?.items ?? [];
            return arr.map((x) => ({ ...x, __type: k }));
          } catch {
            return [];
          }
        })
      );

      // même client + dédup
      const all = results.flat().filter((x) => x?.user?._id === client._id);
      const uniq = new Map();
      for (const d of all) if (!uniq.has(d._id)) uniq.set(d._id, d);
      setPool(Array.from(uniq.values()));
    } catch {
      setPool([]);
    } finally {
      setPoolLoading(false);
    }
  }, [client?._id, demandKinds]);

  // Précharge le pool à l'ouverture
  useEffect(() => {
    if (open) loadPool();
  }, [open, loadPool]);

  // ---------- recherche dans le picker ----------
  const availableToAdd = useMemo(() => {
    const taken = new Set(lines.map((l) => l.demandeId));
    const base = pool.filter((d) => !taken.has(d._id));
    if (!pickerQ.trim()) return base;
    const needle = pickerQ.trim().toLowerCase();
    return base.filter((d) => {
      const numero = String(d?.numero || "").toLowerCase();
      const date = fmtDate(d?.createdAt).toLowerCase();
      const type = String(d?.__type || "").toLowerCase();
      return numero.includes(needle) || date.includes(needle) || type.includes(needle);
    });
  }, [pool, lines, pickerQ]);

  // ---------- totaux ----------
  const totals = useMemo(() => {
    let ht = 0,
      ttc = 0;
    for (const l of lines) {
      const pu = getPU(l.articleId);
      const q = Number(l.qty || 0);
      const r = Number(l.remisePct || 0);
      const v = Number(l.tvaPct || 0);
      const lht = Math.max(0, pu * q * (1 - r / 100));
      const lttc = lht * (1 + v / 100);
      ht += lht;
      ttc += lttc;
    }
    const mfodec = +(ht * 0.01).toFixed(3);
    return { ht: +ht.toFixed(3), ttc: +(ttc + mfodec).toFixed(3) };
  }, [lines, articles]);

  const canSubmit = lines.length > 0 && lines.every((l) => l.articleId && l.qty > 0);

  // ---------- actions ----------
  const addLineFromDemand = (d) => {
    if (!d?._id) return;
    setLines((ls) => [
      ...ls,
      {
        demandeId: d._id,
        ddvNumber: d.numero,
        articleId: "",
        qty: Number(d?.quantite ?? 1) || 1,
        remisePct: 0,
        tvaPct: 19,
      },
    ]);
    setPickerOpen(false);
    setPickerQ("");
  };

  async function submit() {
    if (!canSubmit) return;
    setCreating(true);
    try {
      const payload = {
        demandeIds: Array.from(new Set(lines.map((l) => l.demandeId))),
        lines: lines.map((l) => ({
          demandeId: l.demandeId,
          articleId: l.articleId,
          qty: Number(l.qty || 1),
          remisePct: Number(l.remisePct || 0),
          tvaPct: Number(l.tvaPct || 0),
        })),
        sendEmail: true,
      };
      const r = await fetch(`${BACKEND}/api/devis/admin/from-demande`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const j = await r.json().catch(() => null);
      if (!j?.success) throw new Error(j?.message || t("errors.create"));
      onClose?.();
      onCreated?.();
      if (j.pdf) window.open(j.pdf, "_blank", "noopener,noreferrer");
    } catch (e) {
      alert(e?.message || t("errors.network"));
    } finally {
      setCreating(false);
    }
  }

  if (!open) return null;

  // ---------- UI ----------
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 backdrop-blur-sm p-3"
      role="dialog"
      aria-modal="true"
      aria-labelledby="multi-devis-title"
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div className="w-[min(96vw,1100px)] max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl ring-1 ring-black/5">
        {/* Header */}
        <div className="sticky top-0 z-10 rounded-t-2xl border-b bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 id="multi-devis-title" className="text-lg sm:text-xl font-semibold text-[#0B1E3A]">
                {t("header.title")} <span className="text-slate-500">{t("header.multi")}</span>
              </h3>

              {client && (
                <div className="mt-1 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-700">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F7C600] text-[#0B1E3A] font-semibold">
                    {String(client?.prenom || client?.nom || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="truncate">
                    {`${client?.prenom || ""} ${client?.nom || ""}`.trim() || client?.email}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"
              aria-label={t("aria.close")}
              title={t("aria.close")}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Bouton Ajouter - Nouvelle position */}
          <div className="mb-4 flex justify-between items-center">
            <h4 className="text-sm font-semibold text-slate-700">
              {t("header.selectedDemands", { count: lines.length })}
            </h4>

            <div className="relative">
              <button
                onClick={() => {
                  setPickerOpen((p) => !p);
                  if (!pool.length && !poolLoading) loadPool();
                }}
                disabled={!poolLoading && availableToAdd.length === 0}
                className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 font-semibold text-emerald-700 hover:bg-emerald-100 disabled:opacity-50"
                title={t("picker.addFromList")}
                aria-label={t("picker.addFromList")}
              >
                {poolLoading ? (
                  <span className="h-4 w-4 rounded-full border-2 border-[#0B1E3A] border-t-transparent animate-spin" />
                ) : (
                  <FiPlus size={16} />
                )}
                {t("picker.addBtn")}
              </button>

              {/* Popin */}
              {pickerOpen && (
                <div className="absolute right-0 mt-2 w-[460px] max-h-[60vh] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl z-20">
                  <div className="p-2 border-b bg-slate-50">
                    <div className="relative">
                      <FiSearch className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        value={pickerQ}
                        onChange={(e) => setPickerQ(e.target.value)}
                        placeholder={t("picker.searchPlaceholder")}
                        className="w-full rounded-lg border border-slate-300 bg-white pl-8 pr-3 py-2 text-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={t("picker.searchAria")}
                      />
                    </div>
                  </div>

                  <div className="max-h-[50vh] overflow-y-auto">
                    {poolLoading ? (
                      <div className="p-4 text-sm text-slate-500">{t("common.loading")}</div>
                    ) : availableToAdd.length === 0 ? (
                      <div className="p-4 text-sm text-slate-500">{t("picker.empty")}</div>
                    ) : (
                      <ul className="divide-y">
                        {availableToAdd.map((d) => (
                          <li key={d._id}>
                            <button
                              onClick={() => addLineFromDemand(d)}
                              className="w-full text-left px-3 py-2 hover:bg-slate-50"
                              aria-label={t("picker.addOne")}
                              title={t("picker.addOne")}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2">
                                  <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                                  <span className="font-mono">{d.numero}</span>
                                  {d.__type && (
                                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-wide text-slate-600">
                                      {d.__type}
                                    </span>
                                  )}
                                </div>
                                <span className="text-xs text-slate-500">{fmtDate(d.createdAt)}</span>
                              </div>
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Desktop */}
          <div className="hidden md:block">
            <table className="w-full table-auto border-separate border-spacing-0 text-sm">
              <thead>
                <tr className="text-left text-[12px] uppercase tracking-wide text-slate-500">
                  <th className="p-2">{t("table.ddv")}</th>
                  <th className="p-2">{t("table.article")}</th>
                  <th className="p-2 text-right">{t("table.puht")}</th>
                  <th className="p-2 text-right">{t("table.qty")}</th>
                  <th className="p-2 text-right">{t("table.remisePct")}</th>
                  <th className="p-2 text-right">{t("table.tvaPct")}</th>
                  <th className="p-2 text-right">{t("table.totalHT")}</th>
                  <th className="p-2 text-right">{t("table.actions")}</th>
                </tr>
                <tr>
                  <td colSpan={8}>
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-slate-200 to-transparent" />
                  </td>
                </tr>
              </thead>

              <tbody className="text-[#0B1E3A]">
                {lines.map((ln, i) => {
                  const pu = getPU(ln.articleId);
                  const lht = Math.max(
                    0,
                    pu * Number(ln.qty || 0) * (1 - Number(ln.remisePct || 0) / 100)
                  );

                  return (
                    <tr
                      key={`${ln.demandeId}:${i}`}
                      className="odd:bg-slate-50/40 hover:bg-[#0B1E3A]/[0.03] transition-colors"
                    >
                      <td className="p-2 align-middle">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                          <span className="font-mono">{ln.ddvNumber}</span>
                        </div>
                      </td>

                      <td className="p-2 align-middle">
                        <select
                          className="w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          value={ln.articleId}
                          onChange={(e) => {
                            const v = e.target.value;
                            setLines((ls) =>
                              ls.map((x, idx) => (idx === i ? { ...x, articleId: v } : x))
                            );
                          }}
                        >
                          <option value="">{t("selects.articlePlaceholder")}</option>
                          {articles.map((a) => (
                            <option key={a._id} value={a._id}>
                              {a.reference} — {a.designation}
                            </option>
                          ))}
                        </select>
                        {loadingArticles && (
                          <p className="text-xs text-slate-400 mt-1">{t("common.loading")}</p>
                        )}
                      </td>

                      <td className="p-2 align-middle text-right tabular-nums">
                        {getPU(ln.articleId).toFixed(3)}
                      </td>

                      <td className="p-2 align-middle text-right">
                        <input
                          type="number"
                          min={1}
                          value={ln.qty}
                          onChange={(e) => {
                            const v = Math.max(1, Number(e.target.value || 1));
                            setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, qty: v } : x)));
                          }}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          aria-label={t("inputs.qty")}
                        />
                      </td>

                      <td className="p-2 align-middle text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={ln.remisePct}
                          onChange={(e) => {
                            const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                            setLines((ls) =>
                              ls.map((x, idx) => (idx === i ? { ...x, remisePct: v } : x))
                            );
                          }}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          aria-label={t("inputs.remise")}
                        />
                      </td>

                      <td className="p-2 align-middle text-right">
                        <input
                          type="number"
                          min={0}
                          max={100}
                          value={ln.tvaPct}
                          onChange={(e) => {
                            const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                            setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, tvaPct: v } : x)));
                          }}
                          className="w-24 rounded-lg border border-slate-300 px-2 py-1.5 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                          aria-label={t("inputs.tva")}
                        />
                      </td>

                      <td className="p-2 align-middle text-right font-medium tabular-nums">
                        {lht.toFixed(3)}
                      </td>

                      <td className="p-2 align-middle text-right">
                        <button
                          onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-red-600 hover:bg-red-100"
                          title={t("actions.removeLine")}
                          aria-label={t("actions.removeLine")}
                        >
                          <FiTrash2 size={16} />
                          {t("actions.remove")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {lines.map((ln, i) => {
              const pu = getPU(ln.articleId);
              const lht = Math.max(
                0,
                pu * Number(ln.qty || 0) * (1 - Number(ln.remisePct || 0) / 100)
              );
              return (
                <div
                  key={`${ln.demandeId}:${i}`}
                  className="rounded-xl border border-slate-200 p-3 shadow-sm"
                >
                  <div className="flex items-center gap-2 text-[#0B1E3A]">
                    <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                    <span className="font-mono">{ln.ddvNumber}</span>
                    <button
                      onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                      className="ml-auto inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                      aria-label={t("actions.removeLine")}
                      title={t("actions.removeLine")}
                    >
                      <FiTrash2 size={16} />
                    </button>
                  </div>

                  <div className="mt-3">
                    <label className="text-xs font-semibold text-slate-600">
                      {t("table.article")}
                    </label>
                    <select
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                      value={ln.articleId}
                      onChange={(e) => {
                        const v = e.target.value;
                        setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, articleId: v } : x)));
                      }}
                    >
                      <option value="">{t("selects.articlePlaceholder")}</option>
                      {articles.map((a) => (
                        <option key={a._id} value={a._id}>
                          {a.reference} — {a.designation}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {t("table.puht")}
                      </label>
                      <div className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-right tabular-nums">
                        {pu.toFixed(3)}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {t("table.qty")}
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={ln.qty}
                        onChange={(e) => {
                          const v = Math.max(1, Number(e.target.value || 1));
                          setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, qty: v } : x)));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={t("inputs.qty")}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {t("table.remisePct")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ln.remisePct}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                          setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, remisePct: v } : x)));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={t("inputs.remise")}
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-600">
                        {t("table.tvaPct")}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={ln.tvaPct}
                        onChange={(e) => {
                          const v = Math.min(100, Math.max(0, Number(e.target.value || 0)));
                          setLines((ls) => ls.map((x, idx) => (idx === i ? { ...x, tvaPct: v } : x)));
                        }}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-right shadow-sm focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none"
                        aria-label={t("inputs.tva")}
                      />
                    </div>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-sm text-slate-600">{t("table.totalHT")}</span>
                    <span className="text-base font-semibold text-[#0B1E3A] tabular-nums">
                      {lht.toFixed(3)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Totaux */}
          <div className="mt-6 flex flex-col items-end gap-2 md:flex-row md:justify-end md:gap-8 text-right">
            <div>
              <div className="text-sm text-slate-500">{t("totals.ht")}</div>
              <div className="text-lg font-semibold text-[#0B1E3A] tabular-nums">
                {totals.ht.toFixed(3)}
              </div>
            </div>
            <div>
              <div className="text-sm text-slate-500">{t("totals.ttc")}</div>
              <div className="text-lg font-semibold text-[#0B1E3A] tabular-nums">
                {totals.ttc.toFixed(3)}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 z-10 rounded-b-2xl border-t bg-white/95 backdrop-blur px-6 py-4">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50"
              aria-label={t("actions.cancel")}
              title={t("actions.cancel")}
            >
              {t("actions.cancel")}
            </button>
            <button
              onClick={submit}
              disabled={!canSubmit || creating}
              className="inline-flex items-center justify-center rounded-xl bg-[#F7C600] px-4 py-2 font-semibold text-[#0B1E3A] shadow hover:brightness-95 disabled:opacity-50"
              aria-label={creating ? t("actions.creating") : t("actions.createAndSend")}
              title={creating ? t("actions.creating") : t("actions.createAndSend")}
            >
              {creating ? t("actions.creating") : t("actions.createAndSend")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
