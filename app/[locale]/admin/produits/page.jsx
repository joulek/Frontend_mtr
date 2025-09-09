"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Image from "next/image";
import { useTranslations, useLocale } from "next-intl";
import { FiEdit2, FiSearch, FiXCircle, FiPlus, FiTrash2, FiX, FiCheck } from "react-icons/fi";
import Pagination from "@/components/Pagination";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";
const CARD_WRAPPER = "mx-auto w-full max-w-6xl px-3 sm:px-6";

// ---------- Helpers ----------
const DEBUG = typeof window !== "undefined" && process.env.NODE_ENV !== "production";
const dlog = (...args) => { if (DEBUG) console.log("[AdminProducts]", ...args); };

const buildAbsUrl = (u) =>
  !u ? "" : /^https?:\/\//i.test(u) ? u : `${BACKEND.replace(/\/$/, "")}/${String(u).replace(/^\//, "")}`;

const resolveCategory = (cat, cats) => {
  if (!cat) return null;
  if (typeof cat === "string") return cats.find((c) => c._id === cat) || null;
  return cat;
};

const normalizeImages = (p) => {
  const raw = p?.images ?? p?.imageUrls ?? p?.photos ?? [];
  return (Array.isArray(raw) ? raw : [])
    .map((x) => (typeof x === "string" ? buildAbsUrl(x) : buildAbsUrl(x?.url)))
    .filter(Boolean);
};

export default function AdminProductsPage() {
  const t = useTranslations("auth.products");
  const locale = useLocale();

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);

  const [query, setQuery] = useState("");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modales
  const [isOpen, setIsOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [deletingName, setDeletingName] = useState("");
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Edition
  const [editMode, setEditMode] = useState(false);
  const [editingId, setEditingId] = useState(null);

  // Form
  const [nameFr, setNameFr] = useState("");
  const [nameEn, setNameEn] = useState("");
  const [descFr, setDescFr] = useState("");
  const [descEn, setDescEn] = useState("");
  const [category, setCategory] = useState("");

  // Uploads
  const [images, setImages] = useState(null);
  const [previews, setPreviews] = useState([]);

  // Images existantes (édition)
  const [existingImages, setExistingImages] = useState([]);
  const [removeExistingSet, setRemoveExistingSet] = useState(new Set());
  const [replaceAllImages, setReplaceAllImages] = useState(false);

  // Lightbox
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Description expand/collapse
  const [expandedDescIds, setExpandedDescIds] = useState(new Set());
  const isDescExpanded = (id) => expandedDescIds.has(id);
  const toggleDesc = (id) => {
    setExpandedDescIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  dlog("BACKEND =", BACKEND);

  // Load data
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);

        // Produits
        const rp = await fetch(`${BACKEND}/api/produits`, { credentials: "include" });
        const prodPayload = rp.ok ? await rp.json().catch(() => null) : null;
        const prodList = Array.isArray(prodPayload)
          ? prodPayload
          : Array.isArray(prodPayload?.data)
            ? prodPayload.data
            : Array.isArray(prodPayload?.products)
              ? prodPayload.products
              : [];
        setProducts(prodList);

        // Catégories
        const rc = await fetch(`${BACKEND}/api/categories`, { credentials: "include" });
        const catPayload = rc.ok ? await rc.json().catch(() => null) : null;
        const catList = Array.isArray(catPayload)
          ? catPayload
          : Array.isArray(catPayload?.data)
            ? catPayload.data
            : Array.isArray(catPayload?.categories)
              ? catPayload.categories
              : [];
        setCategories(catList);

        setPage(1);
      } catch (err) {
        console.error("❌ Initial fetch error:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filtre
  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;

    return products.filter((p) => {
      const fr = (p?.name_fr || "").toLowerCase();
      const en = (p?.name_en || "").toLowerCase();
      const dfr = (p?.description_fr || p?.description || "").toLowerCase();
      const den = (p?.description_en || "").toLowerCase();

      const catObj = resolveCategory(p?.category, categories);
      const catTxt = (catObj?.translations?.fr || catObj?.translations?.en || catObj?.label || "").toLowerCase();

      return fr.includes(q) || en.includes(q) || dfr.includes(q) || den.includes(q) || catTxt.includes(q);
    });
  }, [products, categories, query]);

  // Pagination locale
  const total = filteredProducts.length;
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, page, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [total, page, pageSize]);
  useEffect(() => { setPage(1); }, [query]);

  // Upload previews
  const onImagesChange = (fileList) => {
    setImages(fileList);
    previews.forEach((u) => URL.revokeObjectURL(u));
    const urls = fileList ? Array.from(fileList).map((f) => URL.createObjectURL(f)) : [];
    setPreviews(urls);
  };

  // Reset + close
  const resetForm = () => {
    setNameFr(""); setNameEn(""); setDescFr(""); setDescEn("");
    setCategory("");
    setImages(null);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
    setExistingImages([]);
    setRemoveExistingSet(new Set());
    setReplaceAllImages(false);
    setEditMode(false);
    setEditingId(null);
  };
  const closeAddEditModal = () => { setIsOpen(false); resetForm(); };

  const openAdd = () => {
    resetForm();
    setEditMode(false);
    setIsOpen(true);
  };

  const openEdit = (p) => {
    setEditMode(true);
    setEditingId(p._id);
    setNameFr(p.name_fr || "");
    setNameEn(p.name_en || "");
    setDescFr(p.description_fr || p.description || "");
    setDescEn(p.description_en || "");
    setCategory(typeof p.category === "string" ? p.category : (p.category?._id || ""));
    setExistingImages(normalizeImages(p));
    setRemoveExistingSet(new Set());
    setReplaceAllImages(false);
    setImages(null);
    previews.forEach((u) => URL.revokeObjectURL(u));
    setPreviews([]);
    setIsOpen(true);
  };

  // Lock scroll + Esc/Arrows
  const keyHandler = useCallback((e) => {
    if (e.key === "Escape") {
      if (galleryOpen) setGalleryOpen(false);
      if (isOpen) setIsOpen(false);
      if (deleteOpen) setDeleteOpen(false);
    }
    if (galleryOpen && galleryImages.length > 0) {
      if (e.key === "ArrowRight") setGalleryIndex((i) => (i + 1) % galleryImages.length);
      if (e.key === "ArrowLeft") setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);
    }
  }, [galleryOpen, galleryImages.length, isOpen, deleteOpen]);

  useEffect(() => {
    const someModalOpen = isOpen || deleteOpen || galleryOpen;
    if (someModalOpen) {
      document.addEventListener("keydown", keyHandler);
      document.body.style.overflow = "hidden";
    } else {
      document.removeEventListener("keydown", keyHandler);
      document.body.style.overflow = "";
    }
    return () => {
      document.removeEventListener("keydown", keyHandler);
      document.body.style.overflow = "";
    };
  }, [isOpen, deleteOpen, galleryOpen, keyHandler]);

  // Submit (Add / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const fd = new FormData();
    fd.append("name_fr", nameFr);
    fd.append("name_en", nameEn);
    fd.append("description_fr", descFr);
    fd.append("description_en", descEn);
    fd.append("category", category);

    if (images) Array.from(images).forEach((img) => fd.append("images", img));

    if (editMode && editingId) {
      if (replaceAllImages) {
        fd.append("replaceImages", "true");
      } else if (removeExistingSet.size > 0) {
        fd.append("removeImages", JSON.stringify(Array.from(removeExistingSet)));
      }

      try {
        const res = await fetch(`${BACKEND}/api/produits/${editingId}`, {
          method: "PUT",
          body: fd,
          credentials: "include",
        });
        const data = await res.json().catch(() => null);

        if (res.ok && data) {
          setProducts((prev) => prev.map((p) => (p._id === editingId ? data : p)));
          closeAddEditModal();
        } else {
          alert(t("errors.updateFailed"));
        }
      } catch (err) {
        console.error("❌ PUT error:", err);
        alert(t("errors.network"));
      } finally {
        setLoading(false);
      }
      return;
    }

    // Création
    try {
      const res = await fetch(`${BACKEND}/api/produits`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      const data = await res.json().catch(() => null);

      if (res.ok && data) {
        setProducts((prev) => [data, ...prev]);
        closeAddEditModal();
      } else {
        alert(t("errors.createFailed"));
      }
    } catch (err) {
      console.error("❌ POST error:", err);
      alert(t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  // Delete flow
  function openDeleteModal(p) {
    setDeletingId(p._id);
    setDeletingName(p.name_fr || p.name_en || "");
    setDeleteOpen(true);
  }
  function closeDeleteModal() {
    setDeleteOpen(false);
    setDeletingId(null);
    setDeletingName("");
  }
  const submitDelete = async () => {
    if (!deletingId) return;
    try {
      setSubmittingDelete(true);
      const res = await fetch(`${BACKEND}/api/produits/${deletingId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.message || "Delete failed");
      setProducts((prev) => prev.filter((p) => p._id !== deletingId));
      closeDeleteModal();
    } catch (err) {
      console.error("❌ DELETE error:", err);
      alert(t("errors.network"));
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Lightbox
  const openGallery = (imgs = [], startIndex = 0) => {
    if (!imgs || imgs.length === 0) return;
    setGalleryImages(imgs);
    setGalleryIndex(Math.max(0, Math.min(startIndex, imgs.length - 1)));
    setGalleryOpen(true);
  };
  const nextImg = () => setGalleryIndex((i) => (i + 1) % galleryImages.length);
  const prevImg = () => setGalleryIndex((i) => (i - 1 + galleryImages.length) % galleryImages.length);

  const renderThumbs = (imgs = []) => {
    const shown = imgs.slice(0, 2);
    const extra = imgs.length - shown.length;
    return (
      <div className="grid grid-cols-5 sm:grid-cols-6 gap-1">
        {shown.map((src, i) => {
          const showBadge = extra > 0 && i === shown.length - 1;
          return (
            <button
              key={i}
              type="button"
              onClick={() => openGallery(imgs, i)}
              className="relative h-12 w-12 sm:h-14 sm:w-14 rounded-md overflow-hidden ring-1 ring-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#F7C600]"
              title={t("gallery.open")}
              aria-label={t("gallery.open")}
            >
              <Image src={src} alt={`img-${i}`} fill className="object-cover" sizes="56px" unoptimized />
              {showBadge && (
                <span className="absolute inset-0 bg-black/50 text-white text-xs font-semibold grid place-items-center">
                  +{extra}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  };

  const catLabel = (cat) => {
    const obj = resolveCategory(cat, categories);
    if (!obj) return "-";
    const fr = obj?.translations?.fr;
    const en = obj?.translations?.en || obj?.label;
    return locale === "fr" ? (fr || en || "-") : (en || fr || "-");
  };

  const MobileCard = ({ p }) => {
    const imgs = normalizeImages(p);
    return (
      <div className="rounded-2xl border border-[#F7C60022] bg-white p-4 shadow-[0_4px_16px_rgba(0,0,0,.06)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-slate-500 mb-1">{p.category ? catLabel(p.category) : "-"}</div>
            <h3 className="text-base font-semibold text-[#0B1E3A]">{p.name_fr || p.name_en || "-"}</h3>
          </div>
          <div className="shrink-0 flex items-center gap-2">
            <button
              onClick={() => openEdit(p)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 hover:shadow-sm transition"
              title={t("actions.edit")}
              aria-label={t("actions.edit")}
            >
              <FiEdit2 size={14} />
            </button>
            <button
              onClick={() => openDeleteModal(p)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm transition"
              title={t("actions.delete")}
              aria-label={t("actions.delete")}
            >
              <FiTrash2 size={14} />
            </button>
          </div>
        </div>

        {(p.description_fr || p.description_en || p.description) && (
          <div className="relative mt-2">
            <p
              onClick={() => toggleDesc(p._id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleDesc(p._id)}
              aria-expanded={isDescExpanded(p._id)}
              title={isDescExpanded(p._id) ? t("actions.collapse") : t("actions.expand")}
              className={`text-[13px] text-slate-700 cursor-pointer ${isDescExpanded(p._id) ? "line-clamp-none" : "line-clamp-2"}`}
            >
              {p.description_fr || p.description_en || p.description}
            </p>

            {!isDescExpanded(p._id) && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); toggleDesc(p._id); }}
                aria-label={t("actions.expand")}
                title={t("actions.expand")}
              >
                …
              </button>
            )}
          </div>
        )}

        <div className="mt-3">{renderThumbs(imgs)}</div>
      </div>
    );
  };

  return (
    <div className="py-6 space-y-6 sm:space-y-8">
      {/* Header + recherche */}
      <div className={CARD_WRAPPER}>
        <header className="space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#0B1E3A]">{t("title")}</h1>

          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="relative w-full sm:w-[520px]">
              <FiSearch aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
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
                  title={t("clearSearch")}
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

      {/* Liste mobile */}
      <div className={`${CARD_WRAPPER} md:hidden`}>
        <div className="grid gap-3 sm:gap-4">
          {pageItems.length === 0 ? (
            <p className="text-gray-500">{t("noData")}</p>
          ) : (
            pageItems.map((p) => <MobileCard key={p._id} p={p} />)
          )}
        </div>

        <div className="mt-4">
          <Pagination
            /* valeurs */
            page={page}
            current={page}
            currentPage={page}
            pageSize={pageSize}
            perPage={pageSize}
            itemsPerPage={pageSize}
            total={total}

            /* handlers — on passe toutes les variantes */
            onPageChange={(n) => setPage(Number(n))}
            onChange={(n) => setPage(Number(n))}
            onPageSizeChange={(s) => setPageSize(Number(s))}
            onSizeChange={(s) => setPageSize(Number(s))}

            /* options */
            pageSizeOptions={[5, 10, 20, 50]}
          />

        </div>
      </div>

      {/* Table desktop */}
      <div className={`${CARD_WRAPPER} hidden md:block`}>
        <div className="rounded-2xl border border-[#F7C60022] bg-white shadow-[0_6px_22px_rgba(0,0,0,.06)]">
          {pageItems.length === 0 ? (
            <p className="px-6 py-6 text-gray-500">{t("noData")}</p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-[840px] w-full table-auto">
                  <colgroup>
                    <col className="w-[22%]" />
                    <col className="w-[22%]" />
                    <col className="w-[28%]" />
                    <col className="w-[18%]" />
                    <col className="w-[10%]" />
                  </colgroup>

                  <thead>
                    <tr className="bg-white">
                      <th className="p-3 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.category")}</div></th>
                      <th className="p-3 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.name")}</div></th>
                      <th className="p-3 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.description")}</div></th>
                      <th className="p-3 text-left"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.images")}</div></th>
                      <th className="p-3 text-right"><div className="text-[12px] font-semibold uppercase tracking-wide text-slate-500">{t("table.actions")}</div></th>
                    </tr>
                    <tr>
                      <td colSpan={5}><div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" /></td>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {pageItems.map((p) => {
                      const imgs = normalizeImages(p);
                      return (
                        <tr key={p._id} className="bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors">
                          <td className="p-3 align-top">
                            <span className="inline-flex items-center gap-2 text-[#0B1E3A]">
                              <span className="h-2 w-2 rounded-full bg-[#F7C600] shrink-0" />
                              <span className="leading-tight">{p.category ? catLabel(p.category) : "-"}</span>
                            </span>
                          </td>

                          <td className="p-3 align-top">
                            <div className="text-[#0B1E3A] font-medium truncate max-w-[220px]">{p.name_fr || p.name_en || "-"}</div>
                          </td>

                          <td className="p-3 align-top">
                            <div className="relative max-w-[360px] group">
                              <p
                                onClick={() => toggleDesc(p._id)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && toggleDesc(p._id)}
                                aria-expanded={isDescExpanded(p._id)}
                                title={isDescExpanded(p._id) ? t("actions.collapse") : t("actions.expand")}
                                className={`text-sm text-slate-700 cursor-pointer select-text ${isDescExpanded(p._id) ? "line-clamp-none" : "line-clamp-2"}`}
                              >
                                {p.description_fr || p.description_en || p.description || "-"}
                              </p>

                              {!isDescExpanded(p._id) && (p.description_fr || p.description_en || p.description) && (
                                <button
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleDesc(p._id); }}
                                  aria-label={t("actions.expand")}
                                  title={t("actions.expand")}
                                >
                                  …
                                </button>
                              )}
                            </div>
                          </td>

                          <td className="p-3 align-top">
                            <div className="max-w-[140px]">{renderThumbs(imgs)}</div>
                          </td>

                          <td className="p-3 align-top">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => openEdit(p)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-yellow-200 bg-yellow-50 text-yellow-800 hover:bg-yellow-100 hover:shadow-sm transition"
                                title={t("actions.edit")}
                                aria-label={t("actions.edit")}
                              >
                                <FiEdit2 size={14} />
                              </button>

                              <button
                                onClick={() => openDeleteModal(p)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 hover:shadow-sm transition"
                                title={t("actions.delete")}
                                aria-label={t("actions.delete")}
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
        </div>
      </div>

      {/* Modale Ajout / Édition */}
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="add-edit-title">
          <div className="relative w-full max-w-sm sm:max-w-2xl mt-12 rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 shadow-lg ring-4 ring-white flex items-center justify-center text-[#0B1E3A] text-xl sm:text-2xl">
              {editMode ? <FiEdit2 /> : "+"}
            </div>
            <div className="px-4 sm:px-6 pt-10 pb-4 border-b border-gray-100 text-center">
              <h3 id="add-edit-title" className="text-lg sm:text-xl font-semibold text-[#0B1E3A]">
                {editMode ? t("form.editTitle") : t("form.addTitle")}
              </h3>
              <p className="text-xs sm:text-sm text-gray-500 mt-1">
                {editMode ? t("form.editHint") : t("form.addHint")}
              </p>
              <button onClick={closeAddEditModal} className="absolute top-3 right-3 inline-flex items-center justify-center h-8 w-8 sm:h-9 sm:w-9 rounded-full text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition" aria-label={t("form.cancel")} title={t("form.cancel")}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="px-4 sm:px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">{t("form.labelFR")}</span>
                  <div className="relative">
                    <input
                      value={nameFr}
                      onChange={(e) => setNameFr(e.target.value)}
                      placeholder={t("placeholders.nameFr")}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                      required
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">FR</span>
                  </div>
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">{t("form.labelEN")}</span>
                  <div className="relative">
                    <input
                      value={nameEn}
                      onChange={(e) => setNameEn(e.target.value)}
                      placeholder={t("placeholders.nameEn")}
                      className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 pr-10 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">EN</span>
                  </div>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">{t("form.descFR")}</span>
                  <textarea
                    value={descFr}
                    onChange={(e) => setDescFr(e.target.value)}
                    placeholder={t("placeholders.descFr")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 min-h-[96px] text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                  />
                </label>
                <label className="block">
                  <span className="block text-sm font-medium text-gray-700 mb-1">{t("form.descEN")}</span>
                  <textarea
                    value={descEn}
                    onChange={(e) => setDescEn(e.target.value)}
                    placeholder={t("placeholders.descEn")}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 min-h-[96px] text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                  />
                </label>
              </div>

              <label className="block">
                <span className="block text-sm font-medium text-gray-700 mb-1">{t("form.category")}</span>
                <div className="relative">
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    required
                    className="appearance-none w-full rounded-xl border border-gray-200 bg-white px-3 pr-10 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
                  >
                    <option value="">{t("placeholders.selectCategory")}</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {locale === "fr" ? (c?.translations?.fr || c?.label || t("misc.category")) : (c?.translations?.en || c?.label || t("misc.category"))}
                      </option>
                    ))}
                  </select>
                  <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0B1E3A] opacity-70" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" clipRule="evenodd" />
                  </svg>
                </div>
              </label>

              {/* Images */}
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="block text-sm font-medium text-gray-700">{t("form.images")}</span>
                  {editMode && (
                    <label className="inline-flex items-center gap-2 text-sm text-slate-700">
                      <input
                        type="checkbox"
                        className="rounded border-gray-300 text-[#F7C600] focus:ring-[#F7C600]"
                        checked={replaceAllImages}
                        onChange={(e) => setReplaceAllImages(e.target.checked)}
                      />
                      {t("form.replaceAll")}
                    </label>
                  )}
                </div>

                {editMode && !replaceAllImages && existingImages.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {existingImages.map((url, i) => {
                      const checked = removeExistingSet.has(url);
                      return (
                        <div key={i} className="relative">
                          <img
                            src={url}
                            alt={`existing-${i}`}
                            className={`w-16 h-16 object-cover rounded-lg ring-1 ${checked ? "ring-red-300 opacity-60" : "ring-slate-200"}`}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(removeExistingSet);
                              if (next.has(url)) next.delete(url); else next.add(url);
                              setRemoveExistingSet(next);
                            }}
                            title={checked ? t("form.undoRemove") : t("form.removeThis")}
                            className={`absolute -top-2 -right-2 h-6 w-6 rounded-full grid place-items-center shadow text-white ${checked ? "bg-red-600" : "bg-slate-600"} hover:brightness-110`}
                          >
                            ×
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                <label className="flex flex-col items-center justify-center gap-2 border-2 border-dotted border-[#F7C600] bg-[#FFF7CC] rounded-xl p-4 sm:p-6 cursor-pointer">
                  <span className="text-slate-600 text-sm text-center">
                    {replaceAllImages ? t("form.dropTextReplace") : t("form.dropTextAdd")}
                  </span>
                  <input type="file" multiple onChange={(e) => onImagesChange(e.target.files)} className="hidden" />
                </label>

                {previews.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {previews.map((url, i) => (
                      <img key={i} src={url} alt={`preview-${i}`} className="w-16 h-16 object-cover rounded-lg ring-1 ring-slate-200" />
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 sm:pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={closeAddEditModal}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
                  disabled={loading}
                >
                  <FiX /> {t("form.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow"
                >
                  <FiCheck />
                  {loading ? (editMode ? t("form.updating") : t("form.creating")) : (editMode ? t("form.update") : t("form.create"))}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modale suppression */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <div className="relative w-full max-w-sm sm:max-w-md mt-16 rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100">
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 h-12 w-12 sm:h-14 sm:w-14 rounded-full bg-gradient-to-br from-rose-500 to-red-600 shadow-lg ring-4 ring-white flex items-center justify-center text-white text-xl sm:text-2xl">
              <FiTrash2 />
            </div>

            <div className="px-4 sm:px-6 pt-10 pb-4 border-b border-gray-100 text-center">
              <h3 id="delete-title" className="text-lg sm:text-xl font-semibold text-[#0B1E3A]">{t("delete.title")}</h3>
              {deletingName && <p className="mt-1 text-xs text-gray-500 font-mono truncate">« {deletingName} »</p>}
            </div>

            <div className="px-4 sm:px-6 py-5 text-sm text-gray-700">
              {t("delete.confirm")} <span className="font-semibold text-red-600">{t("delete.irreversible")}</span>
            </div>

            <div className="px-4 sm:px-6 pb-6 pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
              <button
                onClick={() => !submittingDelete && closeDeleteModal()}
                className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
                disabled={submittingDelete}
              >
                <FiX /> {t("form.cancel")}
              </button>
              <button
                onClick={submitDelete}
                disabled={submittingDelete}
                className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60 transition shadow"
              >
                <FiTrash2 /> {submittingDelete ? t("delete.deleting") : t("delete.delete")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox */}
      {galleryOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          role="dialog" aria-modal="true" aria-label={t("gallery.title")}
          onClick={(e) => { if (e.target === e.currentTarget) setGalleryOpen(false); }}
        >
          <div className="relative w-[94vw] sm:w-[86vw] md:w-[70vw] h-[58vh] sm:h-[60vh] md:h-[65vh] bg-black/10 rounded-2xl overflow-hidden ring-1 ring-white/10">
            <button
              onClick={() => setGalleryOpen(false)}
              className="absolute top-3 right-3 z-20 h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-white/90 hover:bg-white text-[#0B1E3A] shadow flex items-center justify-center"
              aria-label={t("form.cancel")}
              title={t("form.cancel")}
            >
              ✕
            </button>
            <div className="absolute inset-0">
              <Image
                src={galleryImages[galleryIndex]}
                alt={`${t("gallery.imageAlt")} ${galleryIndex + 1}`}
                fill
                className="object-contain select-none"
                sizes="100vw"
                priority
                unoptimized
              />
            </div>
            <button onClick={prevImg} className="absolute left-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/90 hover:bg-white text-[#0B1E3A] shadow grid place-items-center" aria-label={t("gallery.prev")} title="←">‹</button>
            <button onClick={nextImg} className="absolute right-3 top-1/2 -translate-y-1/2 h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-white/90 hover:bg-white text-[#0B1E3A] shadow grid place-items-center" aria-label={t("gallery.next")} title="→">›</button>
            {galleryImages.length > 1 && (
              <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5">
                {galleryImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryIndex(i)}
                    className={`h-2.5 rounded-full transition ${i === galleryIndex ? "w-6 bg-[#F7C600]" : "w-2.5 bg-white/60 hover:bg-white"}`}
                    aria-label={`${t("gallery.goto")} ${i + 1}`}
                    title={`${t("gallery.image")} ${i + 1}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
