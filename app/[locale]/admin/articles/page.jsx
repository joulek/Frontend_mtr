"use client";

import { useEffect, useMemo, useState } from "react";
import {
  FiSearch,
  FiXCircle,
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiX,
  FiCheck,
} from "react-icons/fi";
import { useTranslations } from "next-intl";
import Pagination from "@/components/Pagination";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");
const API = `${BACKEND}/api`;

const CARD_WRAPPER = "mx-auto w-full max-w-6xl px-3 sm:px-6";

export default function AdminArticlesPage() {
  const t = useTranslations("auth.articles");

  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [isOpen, setIsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const emptyForm = {
    _id: null,
    reference: "",
    designation: "",
    prixHT: "",
    type: "",
  };
  const [form, setForm] = useState(emptyForm);
  const isEditing = !!(form && form._id);

  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toDelete, setToDelete] = useState(null);

  /* ================= API ================= */

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/articles`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);

      const arr = json?.data ?? json?.items ?? [];
      setItems(Array.isArray(arr) ? arr : []);
      setPage(1);
    } catch (e) {
      console.error("fetchItems:", e);
      setItems([]);
      alert(e.message || "Erreur de chargement.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch(`${API}/produits`, {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);

      const arr = data?.data ?? data?.items ?? data?.produits ?? data ?? [];
      const normalized = (Array.isArray(arr) ? arr : []).map((p) => ({
        _id: p?._id,
        name_fr: p?.name_fr || p?.label || p?.name || p?.translations?.fr || "",
      }));
      setProducts(normalized.filter((p) => p._id));
    } catch (e) {
      console.error("fetchProducts:", e);
      setProducts([]);
    } finally {
      setLoadingProducts(false);
    }
  };

  const fetchNextRef = async () => {
    const tryOnce = async (path) => {
      const res = await fetch(`${BACKEND}${path}`, {
        cache: "no-store",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message || `HTTP ${res.status}`);
      return json?.data || "";
    };

    try {
      const ref =
        (await tryOnce(`/api/articles/nextRef`).catch(() => "")) ||
        (await tryOnce(`/api/articles/next-ref`).catch(() => ""));
      if (ref) setForm((f) => ({ ...f, reference: ref }));
    } catch (e) {
      console.error("fetchNextRef:", e);
    }
  };

  useEffect(() => {
    fetchItems();
    fetchProducts();
  }, []);

  /* =============== Actions UI =============== */

  const openAdd = () => {
    setForm(emptyForm);
    setIsOpen(true);
    fetchNextRef();
  };

  const openEdit = (it) => {
    if (it.isArchived || it.archived) return;
    setForm({
      _id: it._id,
      reference: it.reference ?? "",
      designation: it.designation ?? "",
      prixHT: (it.prixHT ?? "").toString(),
      type: it.type?._id || it.type || "",
    });
    setIsOpen(true);
  };

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({
      ...f,
      [name]: name === "prixHT" ? value.replace(",", ".") : value,
    }));
  };

  const onTypeChange = (e) => {
    const value = e.target.value;
    const prod = products.find((p) => p._id === value);
    setForm((f) => ({
      ...f,
      type: value,
      designation: prod?.name_fr || f.designation || "",
    }));
  };

  const validForm = () => {
    if (!form.type) return t("errors.requiredType", { default: "Type requis." });
    if (!form.designation?.trim())
      return t("errors.requiredDesignation", { default: "Désignation requise." });
    if (form.prixHT === "" || isNaN(Number(form.prixHT)) || Number(form.prixHT) < 0) {
      return t("errors.invalidHT", { default: "Prix HT invalide." });
    }
    return null;
  };

  const submitForm = async (e) => {
    e?.preventDefault?.();
    const err = validForm();
    if (err) return alert(err);

    setSubmitting(true);
    try {
      const payload = {
        designation: form.designation.trim(),
        prixHT: Number(form.prixHT),
        type: form.type,
      };

      const url = isEditing ? `${API}/articles/${form._id}` : `${API}/articles`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || `HTTP ${res.status}`);

      setIsOpen(false);
      setForm(emptyForm);
      await fetchItems();
    } catch (e) {
      console.error("submitForm:", e);
      alert(e.message || "Erreur réseau (CORS/credentials).");
    } finally {
      setSubmitting(false);
    }
  };

  const confirmDelete = (it) => {
    setToDelete(it);
    setDeleteOpen(true);
  };

  const doDelete = async () => {
    if (!toDelete?._id) return;
    setDeleting(true);
    try {
      const res = await fetch(`${API}/articles/${toDelete._id}`, {
        method: "DELETE",
        credentials: "include",
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.success) throw new Error(json?.message || `HTTP ${res.status}`);

      setDeleteOpen(false);
      setToDelete(null);
      await fetchItems();
    } catch (e) {
      console.error("doDelete:", e);
      alert(e.message || "Erreur réseau (CORS/credentials).");
    } finally {
      setDeleting(false);
    }
  };

  /* ============== Filtre & pagination ============== */

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) => {
      const r = (it.reference || "").toLowerCase();
      const d = (it.designation || "").toLowerCase();
      const ty = (it.type?.name_fr || it.typeName || "").toLowerCase();
      return r.includes(q) || d.includes(q) || ty.includes(q);
    });
  }, [items, query]);

  const total = filtered.length;

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [total, page, pageSize]);

  useEffect(() => setPage(1), [query]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  // ref, design, type, HT, TTC, actions
  const colWidths = ["w-[16%]", "w-[32%]", "w-[20%]", "w-[12%]", "w-[12%]", "w-[12%]"];

  const isArchived = (it) => !!(it.isArchived || it.archived);

  /* ======================= UI ======================= */

  return (
    <div className="py-6 space-y-6 sm:space-y-8">
      {/* Header + Search */}
      <div className={CARD_WRAPPER}>
        <header className="space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A]">
            {t("title")}
          </h1>

          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="relative w-full sm:w-[520px]">
              <FiSearch
                aria-hidden
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchPlaceholder")}
                className="w-full rounded-xl border border-gray-300 bg-white px-9 pr-9 py-2 text-sm text-[#0B1E3A] shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                aria-label={t("searchAria")}
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  aria-label={t("clearSearch")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 inline-flex items-center justify-center h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition"
                >
                  <FiXCircle size={16} />
                </button>
              )}
            </div>

            <button
              onClick={openAdd}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold shadow hover:brightness-105 active:translate-y-[1px] transition whitespace-nowrap"
            >
              <FiPlus /> {t("addButton")}
            </button>
          </div>
        </header>
      </div>

      {/* Liste */}
      <div className={CARD_WRAPPER}>
        <section className="rounded-2xl border border-[#F7C60022] bg-white shadow-[0_6px_22px_rgba(0,0,0,.06)]">
          {loading ? (
            <div className="px-6 py-6 space-y-3 animate-pulse">
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
              <div className="h-10 bg-gray-100 rounded-lg" />
            </div>
          ) : total === 0 ? (
            <p className="px-6 py-6 text-gray-500">{t("noData")}</p>
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <div className="overflow-x-auto">
                  <table className="min-w-[960px] w-full table-auto">
                    <colgroup>
                      {colWidths.map((w, i) => (
                        <col key={i} className={w} />
                      ))}
                    </colgroup>
                    <thead>
                      <tr className="bg-white">
                        <th className="p-3 text-left">
                          <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.reference")}
                          </div>
                        </th>
                        <th className="p-3 text-left">
                          <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.designation")}
                          </div>
                        </th>
                        <th className="p-3 text-left">
                          <div className="text-[13px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.type")}
                          </div>
                        </th>
                        <th className="p-3 text-right">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.priceHT")}
                          </div>
                        </th>
                        <th className="p-3 text-right">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.priceTTC")}
                          </div>
                        </th>
                        <th className="p-3 text-right">
                          <div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">
                            {t("table.actions", { default: "Actions" })}
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
                        const archived = isArchived(it);
                        return (
                          <tr
                            key={it._id}
                            className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors"
                          >
                            <td className="p-3 align-middle">
                              <div className="flex items-center gap-3">
                                <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                                <span
                                  className={`font-medium ${archived ? "text-slate-400 italic" : "text-[#0B1E3A]"}`}
                                >
                                  {it.reference}
                                </span>
                                {archived && (
                                  <span className="ml-2 rounded-full bg-gray-100 text-gray-600 text-[11px] px-2 py-0.5">
                                    Archivé
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3 align-middle">
                              <span className={`text-slate-700 ${archived ? "text-slate-400 italic" : ""}`}>
                                {archived ? "—" : it.designation}
                              </span>
                            </td>

                            <td className="p-3 align-middle">
                              <span className={`text-slate-700 ${archived ? "text-slate-400 italic" : ""}`}>
                                {archived ? "—" : (it.type?.name_fr || it.typeName || "-")}
                              </span>
                            </td>

                            <td className="p-3 align-middle text-right text-[#0B1E3A]">
                              {archived ? "—" : Number(it.prixHT).toFixed(4)}
                            </td>
                            <td className="p-3 align-middle text-right text-[#0B1E3A]">
                              {archived ? "—" : Number(it.prixTTC ?? it.prixHT * 1.2).toFixed(4)}
                            </td>

                            {/* Actions */}
                            <td className="p-3 align-middle text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  onClick={() => openEdit(it)}
                                  disabled={archived}
                                  className={`inline-flex items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 px-2.5 py-1.5 text-[13px] font-medium hover:bg-yellow-100 hover:shadow-sm transition ${archived ? "opacity-40 cursor-not-allowed text-yellow-800/70" : "text-yellow-800"}`}
                                  aria-label={t("actions.edit", { default: "Modifier" })}
                                  title={t("actions.edit", { default: "Modifier" })}
                                >
                                  <FiEdit2 size={16} />
                                </button>

                                <button
                                  onClick={() => confirmDelete(it)}
                                  className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-100 hover:shadow-sm transition"
                                  aria-label={t("actions.delete", { default: "Supprimer" })}
                                  title={t("actions.delete", { default: "Supprimer" })}
                                >
                                  <FiTrash2 size={16} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="px-4 py-4">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                  />
                </div>
              </div>

              {/* Mobile cards */}
              <div className="md:hidden grid grid-cols-1 gap-3 px-4 py-4">
                {pageItems.map((it) => {
                  const archived = isArchived(it);
                  return (
                    <div key={it._id} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-gray-500">{t("table.reference")}</p>
                        <p className={`font-medium flex items-center gap-2 ${archived ? "text-slate-400 italic" : "text-[#0B1E3A]"}`}>
                          <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                          {it.reference}
                          {archived && (
                            <span className="ml-1 rounded-full bg-gray-100 text-gray-600 text-[11px] px-2 py-0.5">
                              Archivé
                            </span>
                          )}
                        </p>

                        <p className="mt-3 text-xs font-semibold text-gray-500">{t("table.designation")}</p>
                        <p className={`${archived ? "text-slate-400 italic" : "text-[#0B1E3A]"}`}>
                          {archived ? "—" : it.designation}
                        </p>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs font-semibold text-gray-500">{t("table.type")}</p>
                            <p className={`${archived ? "text-slate-400 italic" : "text-[#0B1E3A]"}`}>
                              {archived ? "—" : (it.type?.name_fr || it.typeName || "-")}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">{t("table.priceHT")}</p>
                            <p className={`${archived ? "text-slate-400 italic" : "text-[#0B1E3A]"}`}>
                              {archived ? "—" : Number(it.prixHT).toFixed(4)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500">{t("table.priceTTC")}</p>
                            <p className={`${archived ? "text-slate-400 italic" : "text-[#0B1E3A]"}`}>
                              {archived ? "—" : Number(it.prixTTC ?? it.prixHT * 1.2).toFixed(4)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 pt-3">
                        <button
                          onClick={() => openEdit(it)}
                          disabled={archived}
                          className={`inline-flex h-9 items-center gap-2 rounded-full border border-yellow-200 bg-yellow-50 px-3 text-[13px] font-medium hover:bg-yellow-100 hover:shadow-sm transition ${archived ? "opacity-40 cursor-not-allowed text-yellow-800/70" : "text-yellow-800"}`}
                        >
                          <FiEdit2 size={16} />
                        </button>
                        <button
                          onClick={() => {
                            setToDelete(it);
                            setDeleteOpen(true);
                          }}
                          className="inline-flex h-9 items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 text-[13px] font-medium text-red-700 hover:bg-red-100 hover:shadow-sm transition"
                        >
                          <FiTrash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <Pagination
                    page={page}
                    pageSize={pageSize}
                    total={total}
                    onPageChange={setPage}
                    onPageSizeChange={setPageSize}
                    pageSizeOptions={[5, 10, 20, 50]}
                  />
                </div>
              </div>
            </>
          )}
        </section>
      </div>

      {/* =================== Modale Ajouter/Éditer (avec pastille) =================== */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-edit-title"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-xl my-14 rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100 overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            {/* pastille (jaune) */}
            <div
              className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 h-12 w-12 rounded-full shadow-lg ring-4 ring-white flex items-center justify-center text-[#0B1E3A]"
              style={{ backgroundImage: "linear-gradient(to bottom right, #fde047, #f59e0b)" }}
              aria-hidden
            >
              {isEditing ? <FiEdit2 size={18} /> : <FiPlus size={20} />}
            </div>

            {/* clip des coins supérieurs */}
            <div className="relative rounded-3xl overflow-hidden">
              <div className="max-h-[85dvh] overflow-y-auto">
                {/* header (laisse la place à la pastille) */}
                <div className="px-6 pt-10 pb-4 border-b border-gray-100 text-center sticky top-0 bg-white z-10">
                  <h3 id="add-edit-title" className="text-xl font-semibold text-[#0B1E3A]">
                    {isEditing ? t("form.editTitle") : t("form.addTitle")}
                  </h3>
                </div>

                <form onSubmit={submitForm} className="px-6 py-6 space-y-5">
                  {isEditing && (
                    <label className="block">
                      <span className="block text-sm font-medium text-gray-700 mb-1">
                        {t("labels.reference", { default: "Référence" })}
                      </span>
                      <input
                        name="reference"
                        value={form.reference}
                        readOnly
                        disabled
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-[#0B1E3A] cursor-not-allowed"
                      />
                      <p className="mt-1 text-xs text-gray-500">
                        {t("help.referenceLocked", {
                          default: "La référence est générée automatiquement et ne peut pas être modifiée.",
                        })}
                      </p>
                    </label>
                  )}

                  {/* Type */}
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">
                      {t("labels.type")} <span className="text-red-500">*</span>
                    </span>
                    <select
                      name="type"
                      value={form.type}
                      onChange={onTypeChange}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                      disabled={loadingProducts}
                    >
                      <option value="">{t("placeholders.selectType")}</option>
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          {p.name_fr || "—"}
                        </option>
                      ))}
                    </select>
                  </label>

                  {/* Désignation */}
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">
                      {t("labels.designation")} <span className="text-red-500">*</span>
                    </span>
                    <input
                      name="designation"
                      value={form.designation}
                      onChange={onChange}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                      placeholder={t("placeholders.designationExample")}
                    />
                  </label>

                  {/* Prix HT */}
                  <label className="block">
                    <span className="block text-sm font-medium text-gray-700 mb-1">
                      {t("labels.priceHT")} <span className="text-red-500">*</span>
                    </span>
                    <input
                      name="prixHT"
                      value={form.prixHT}
                      onChange={onChange}
                      type="number"
                      step="0.001"
                      min="0"
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                      placeholder={t("placeholders.priceExample")}
                    />
                  </label>

                  {/* Pied */}
                  <div className="pt-2 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
                    <button
                      type="button"
                      onClick={() => setIsOpen(false)}
                      className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
                      disabled={submitting}
                    >
                      <FiX /> {t("form.cancel")}
                    </button>
                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow"
                    >
                      <FiCheck />
                      {submitting
                        ? isEditing
                          ? t("form.updating")
                          : t("form.creating")
                        : isEditing
                          ? t("form.update")
                          : t("form.create")}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =================== Modale Suppression (avec pastille) =================== */}
      {deleteOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          onClick={() => setDeleteOpen(false)}
        >
          <div
            className="relative w-full max-w-md my-14 rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100 overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            {/* pastille rouge */}
            <div
              className="absolute -top-7 left-1/2 -translate-x-1/2 z-20 h-12 w-12 rounded-full shadow-lg ring-4 ring-white flex items-center justify-center text-white"
              style={{ backgroundImage: "linear-gradient(to bottom right, #ef4444, #b91c1c)" }}
              aria-hidden
            >
              <FiTrash2 size={18} />
            </div>

            {/* clip coins haut */}
            <div className="relative rounded-3xl overflow-hidden">
              <div className="max-h-[70dvh] overflow-y-auto">
                <div className="px-6 pt-10 pb-4 border-b border-gray-100 text-center sticky top-0 bg-white z-10">
                  <h3 id="delete-title" className="text-xl font-semibold text-[#0B1E3A]">
                    {t("delete.title")}
                  </h3>
                </div>

                <div className="px-6 py-6 text-sm text-gray-700">
                  {t("delete.confirm")} <span className="font-semibold">{toDelete?.reference}</span> ?
                  <div className="mt-1 text-xs text-gray-500">
                    {t("delete.noteKeepRef", {
                      default: "La ligne restera visible avec la seule référence.",
                    })}
                  </div>
                </div>

                <div className="px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
                  <button
                    onClick={() => setDeleteOpen(false)}
                    className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
                    disabled={deleting}
                  >
                    <FiX /> {t("form.cancel")}
                  </button>
                  <button
                    onClick={doDelete}
                    disabled={deleting}
                    className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition shadow"
                  >
                    <FiTrash2 /> {deleting ? t("delete.deleting") : t("delete.delete")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
