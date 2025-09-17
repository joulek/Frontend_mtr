"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { FiSearch, FiXCircle, FiUserPlus, FiUser, FiCheck, FiX } from "react-icons/fi";
import Pagination from "@/components/Pagination";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

function fmtDate(d: any) {
  try {
    const dt = new Date(d);
    return `${dt.toLocaleDateString()} ${dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
  } catch {
    return "—";
  }
}

export default function AdminUsersPage() {
  const t = useTranslations("auth.usersAdmin");

  const [rows, setRows] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [selected, setSelected] = useState<any | null>(null);

  // pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const router = useRouter();
  const pathname = usePathname();
  const locale = (pathname.split("/")[1] || "fr") || "fr";

  const roleLabel = (r: string) => (r === "admin" ? t("roles.admin") : t("roles.client"));

  async function load() {
    try {
      setErr("");
      setLoading(true);
      const res = await fetch(`${BACKEND}/api/users`, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (res.status === 401) return router.push(`/${locale}/login?next=${encodeURIComponent(pathname)}`);
      if (res.status === 403) return router.push(`/${locale}/unauthorized?code=403`);

      const data = await res.json().catch(() => ({}));
      const users = Array.isArray(data) ? data : (data.users || data.data || []);
      setRows(Array.isArray(users) ? users : []);
      setPage(1);
    } catch (e: any) {
      setErr(e?.message || t("errors.network"));
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-line */ }, []);

  // recherche plein-texte
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    const contains = (v: any) => String(v ?? "").toLowerCase().includes(needle);
    return rows.filter((u) => {
      const name = `${u?.prenom || ""} ${u?.nom || ""}`;
      return (
        contains(name) ||
        contains(u?.email) ||
        contains(u?.numTel) ||
        contains(u?.adresse) ||
        contains(u?.accountType) ||
        contains(roleLabel(u?.role)) ||
        contains(fmtDate(u?.createdAt))
      );
    });
  }, [rows, q]);

  // pagination locale
  const total = filtered.length;
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [total, page, pageSize]);

  useEffect(() => { setPage(1); }, [q]);

  return (
    <div className="py-6 sm:py-8">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* ======= Titre centré ======= */}
        <header className="space-y-4 text-center">
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#1F3C5D]">
            {t("title")}
          </h1>
          {err && <p className="text-sm text-red-600">{err}</p>}

          {/* ======= Barre de recherche + bouton Ajouter ======= */}
          <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-3 sm:flex-row">
            <div className="relative w-full sm:w-[520px]">
              <FiSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("searchPlaceholder")}
                aria-label={t("searchAria")}
                className="w-full rounded-xl border border-gray-300 bg-white pl-9 pr-9 py-2 text-sm text-[#0B1E3A]
                           shadow focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
              />
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

            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#F7C600] text-[#0B1E3A] px-4 py-2 font-semibold
                         shadow hover:brightness-105 active:translate-y-[1px] transition whitespace-nowrap"
            >
              <FiUserPlus /> {t("addButton")}
            </button>
          </div>
        </header>

        {/* ======= États chargement/vide ======= */}
        {loading ? (
          <div className="text-center text-gray-500">{t("loading")}</div>
        ) : total === 0 ? (
          <div className="text-center text-gray-500">{t("noData")}</div>
        ) : (
          <>
            {/* ======= Mobile (<md) : Cartes ======= */}
            <section className="grid grid-cols-1 gap-4 md:hidden">
              {pageItems.map((u, i) => (
                <div
                  key={u._id || i}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm p-4 flex flex-col gap-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full bg-[#F7C600] shrink-0" />
                        <p className="text-[#0B1E3A] font-semibold truncate">
                          {`${u?.prenom || ""} ${u?.nom || ""}`.trim() || "—"}
                        </p>
                      </div>
                      <p className="text-gray-600 text-xs break-words">{u?.email || "—"}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("table.role")}</p>
                      <p className="font-medium">{roleLabel(u?.role)}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("table.phone")}</p>
                      <p className="break-words">{u?.numTel || "—"}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("table.accountType")}</p>
                      <p className="capitalize">{u?.accountType || "—"}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-[11px] uppercase tracking-wide text-slate-500">{t("table.createdAt")}</p>
                      <p>{fmtDate(u?.createdAt)}</p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <button
                      onClick={() => setSelected(u)}
                      className="rounded-full border border-gray-200 px-3 py-1.5 text-xs hover:bg-gray-50"
                    >
                      {t("actions.details")}
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {/* ======= Desktop (≥md) : Tableau + scroll ======= */}
            <section className="rounded-2xl border border-[#F7C60022] bg-white shadow-sm overflow-hidden hidden md:block">
              <div className="w-full overflow-x-auto">
                <table className="min-w-[900px] w-full text-sm">
                  <thead className="bg-white">
                    <tr>
                      {[t("table.name"), t("table.email"), t("table.phone"), t("table.accountType"), t("table.role"), t("table.createdAt"), t("table.actions")].map((col) => (
                        <th key={col} className="p-4 text-left">
                          <div className="text-[11px] sm:text-[13px] font-semibold uppercase tracking-wide text-slate-500">{col}</div>
                        </th>
                      ))}
                    </tr>
                    <tr>
                      <td colSpan={7}>
                        <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
                      </td>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-gray-100">
                    {pageItems.map((u, i) => (
                      <tr key={u._id || i} className="group bg-white hover:bg-[#0B1E3A]/[0.03] transition-colors">
                        {/* Nom */}
                        <td className="p-4 align-middle">
                          <div className="flex items-center gap-3">
                            <span className="h-2 w-2 rounded-full bg-[#F7C600]" />
                            <span className="text-[#0B1E3A] font-medium break-words">
                              {`${u?.prenom || ""} ${u?.nom || ""}`.trim() || "—"}
                            </span>
                          </div>
                        </td>
                        {/* Email */}
                        <td className="p-4 text-gray-800 break-all">{u?.email || "—"}</td>
                        {/* Téléphone */}
                        <td className="p-4 break-words">{u?.numTel || "—"}</td>
                        {/* Type */}
                        <td className="p-4 capitalize">{u?.accountType || "—"}</td>
                        {/* Rôle */}
                        <td className="p-4">{roleLabel(u?.role)}</td>
                        {/* Créé le */}
                        <td className="p-4 whitespace-nowrap">{fmtDate(u?.createdAt)}</td>
                        {/* Actions */}
                        <td className="p-4">
                          <button
                            onClick={() => setSelected(u)}
                            className="rounded-full border border-gray-200 px-3 py-1 text-xs hover:bg-gray-50"
                          >
                            {t("actions.details")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {/* ======= Pagination ======= */}
        <div className="px-1 sm:px-0">
          <div className="mt-2">
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
      </div>

      {/* Modales */}
      {showInvite && (
        <InviteUserModal
          onClose={() => setShowInvite(false)}
          onCreated={() => { setShowInvite(false); load(); }}
        />
      )}
      {selected && <DetailsModal user={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

/* -------------------- Modals -------------------- */

/* ======= MODAL DÉTAILS (icon + coins OK) ======= */
function DetailsModal({ user, onClose }: { user: any; onClose: () => void }) {
  const t = useTranslations("auth.usersAdmin");

  // Fermer avec ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="details-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl my-8 rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100 max-h-[90dvh] overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* pastille jaune (ABSOLUTE) */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 h-14 w-14 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 shadow-lg ring-4 ring-white flex items-center justify-center text-[#0B1E3A]">
          <FiUser size={22} />
        </div>

        {/* bouton X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 z-20"
          aria-label={t("common.close")}
        >
          <FiX />
        </button>

        {/* CLIP coins haut du contenu */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* wrapper scrollable */}
          <div className="max-h-[90dvh] overflow-y-auto">
            {/* En-tête (pt-10 لفسح مكان للدائرة) */}
            <div className="px-6 pt-10 pb-4 border-b border-gray-100 text-center sticky top-0 bg-white z-10">
              <h3 id="details-title" className="text-xl font-semibold text-[#0B1E3A]">
                {t("details.title")}
              </h3>
            </div>

            {/* Contenu */}
            <div className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FieldCard label={t("fields.lastName")} value={user?.nom} />
              <FieldCard label={t("fields.firstName")} value={user?.prenom} />
              <FieldCard label={t("fields.email")} value={user?.email} copy />
              <FieldCard label={t("fields.phone")} value={user?.numTel || "—"} />
              <FieldCard label={t("fields.address")} value={user?.adresse || "—"} className="sm:col-span-2" />
              <FieldCard label={t("fields.accountType")} value={user?.accountType || "—"} />
              <FieldCard label={t("fields.role")} value={user?.role === "admin" ? t("roles.admin") : t("roles.client")} />
              {user?.accountType === "personnel" && (
                <>
                  <FieldCard label={t("fields.personal.cin")} value={user?.personal?.cin || "—"} />
                  <FieldCard label={t("fields.personal.currentPosition")} value={user?.personal?.posteActuel || "—"} />
                </>
              )}
              {user?.accountType === "societe" && (
                <>
                  <FieldCard label={t("fields.company.name")} value={user?.company?.nomSociete || "—"} />
                  <FieldCard label={t("fields.company.taxId")} value={user?.company?.matriculeFiscal || "—"} />
                  <FieldCard label={t("fields.company.currentPosition")} value={user?.company?.posteActuel || "—"} className="sm:col-span-2" />
                </>
              )}
              <FieldCard label={t("fields.createdAt")} value={fmtDate(user?.createdAt)} className="sm:col-span-2" />
            </div>

            {/* Pied */}
            <div className="px-6 pb-6 pt-2 border-t border-gray-100 flex items-center justify-end sticky bottom-0 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
              >
                <FiX /> {t("common.close")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* Champ stylé (label + carte) */
function FieldCard({ label, value, className = "", copy = false }: { label: string; value: any; className?: string; copy?: boolean; }) {
  const t = useTranslations("auth.usersAdmin");
  return (
    <div className={className}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1">{label}</div>
      <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#0B1E3A]">
        <span className="break-words">{value ?? "—"}</span>
        {copy && typeof value === "string" && value && (
          <button
            type="button"
            onClick={() => navigator.clipboard?.writeText(value)}
            className="ml-3 text-xs rounded-md border px-2 py-1 hover:bg-gray-50"
            title={t("common.copy")}
          >
            {t("common.copy")}
          </button>
        )}
      </div>
    </div>
  );
}

/* ======= MODAL D'AJOUT (icon + coins OK) ======= */
function InviteUserModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void; }) {
  const t = useTranslations("auth.usersAdmin");
  const [type, setType] = useState<"" | "personnel" | "societe">("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Fermer avec ESC
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const fd = new FormData(e.currentTarget);

    const payload: any = {
      nom: String(fd.get("nom") || ""),
      prenom: String(fd.get("prenom") || ""),
      email: String(fd.get("email") || ""),
      numTel: String(fd.get("numTel") || ""),
      adresse: String(fd.get("adresse") || ""),
      accountType: type,
      role: String(fd.get("role") || "client"),
    };

    if (type === "personnel") {
      payload.personal = {
        cin: String(fd.get("cin") || ""),
        posteActuel: String(fd.get("posteActuelPers") || ""),
      };
    } else if (type === "societe") {
      payload.company = {
        nomSociete: String(fd.get("nomSociete") || ""),
        matriculeFiscal: String(fd.get("matriculeFiscal") || ""),
        posteActuel: String(fd.get("posteActuelSoc") || ""),
      };
    }

    try {
      const res = await fetch(`${BACKEND}/api/admin/users/invite`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) throw new Error(data?.message || `HTTP ${res.status}`);
      onCreated();
    } catch (e: any) {
      setErr(e?.message || t("errors.send"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto overscroll-contain"
      role="dialog"
      aria-modal="true"
      aria-labelledby="invite-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl my-8 rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,.25)] ring-1 ring-gray-100 max-h=[90dvh] overflow-visible"
        onClick={(e) => e.stopPropagation()}
      >
        {/* pastille jaune ABSOLUTE */}
        <div className="absolute -top-8 left-1/2 -translate-x-1/2 z-20 h-14 w-14 rounded-full bg-gradient-to-br from-yellow-300 to-yellow-400 shadow-lg ring-4 ring-white flex items-center justify-center text-[#0B1E3A]">
          <FiUserPlus size={22} />
        </div>

        {/* bouton X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white hover:bg-gray-50 z-20"
          aria-label={t("common.cancel")}
          disabled={loading}
        >
          <FiX />
        </button>

        {/* CLIP coins haut du contenu */}
        <div className="relative rounded-3xl overflow-hidden">
          {/* contenu scrollable */}
          <div className="max-h-[90dvh] overflow-y-auto">
            {/* En-tête (pt-10) */}
            <div className="px-6 pt-10 pb-4 border-b border-gray-100 text-center sticky top-0 bg-white z-10">
              <h3 id="invite-title" className="text-xl font-semibold text-[#0B1E3A]">
                {t("invite.title")}
              </h3>
            </div>

            <form onSubmit={submit} className="px-6 py-6 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              {err && <div className="sm:col-span-2 text-red-600">{err}</div>}

              <Input name="nom" label={t("fields.lastName")} required />
              <Input name="prenom" label={t("fields.firstName")} required />
              <Input name="email" type="email" label={t("fields.email")} required />
              <Input name="numTel" label={t("fields.phone")} />
              <Input name="adresse" label={t("fields.address")} className="sm:col-span-2" />

              <div className="sm:col-span-2">
                <div className="text-gray-500 text-xs font-semibold mb-1">{t("invite.accountType")}</div>
                <div className="flex flex-wrap gap-4">
                  <label className="flex items-center gap-2">
                    <input type="radio" name="accountType" onChange={() => setType("personnel")} className="accent-[#0B1E3A]" required />
                    {t("invite.personal")}
                  </label>
                  <label className="flex items-center gap-2">
                    <input type="radio" name="accountType" onChange={() => setType("societe")} className="accent-[#0B1E3A]" required />
                    {t("invite.company")}
                  </label>
                </div>
              </div>

              {type === "personnel" && (
                <>
                  <Input name="cin" label={t("fields.personal.cin")} />
                  <Input name="posteActuelPers" label={t("fields.personal.currentPosition")} />
                </>
              )}
              {type === "societe" && (
                <>
                  <Input name="nomSociete" label={t("fields.company.name")} />
                  <Input name="matriculeFiscal" label={t("fields.company.taxId")} />
                  <Input name="posteActuelSoc" label={t("fields.company.currentPosition")} className="sm:col-span-2" />
                </>
              )}

              <div className="sm:col-span-2">
                <div className="text-gray-500 text-xs font-semibold mb-1">{t("fields.role")}</div>
                <select name="role" className="w-full rounded-xl border px-3 py-2">
                  <option value="client">{t("roles.client")}</option>
                  <option value="admin">{t("roles.admin")}</option>
                </select>
              </div>

              {/* Pied */}
              <div className="sm:col-span-2 pt-2 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
                <button
                  type="button"
                  onClick={onClose}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#0B1E3A] bg-white px-4 py-2 text-sm hover:bg-gray-50 transition text-[#0B1E3A]"
                  disabled={loading}
                >
                  <FiX /> {t("common.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60 transition shadow"
                >
                  <FiCheck /> {loading ? t("invite.sending") : t("invite.submit")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Input({ label, className = "", ...props }: any) {
  return (
    <label className={`flex flex-col ${className}`}>
      <span className="text-gray-500 text-xs font-semibold mb-1">{label}</span>
      <input
        {...props}
        className="rounded-xl border border-gray-200 px-3 py-2 text-[#0B1E3A] focus:border-[#F7C600] focus:ring-2 focus:ring-[#F7C600]/30 outline-none transition"
      />
    </label>
  );
}
