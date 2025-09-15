// components/forms/TractionForm.jsx
"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import schemaImg from "@/public/devis/traction.png";
import positionsImg from "@/public/devis/traction01.png";
import accrochesImg from "@/public/devis/traction02.png";

/* ====== Config & helpers ====== */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");

// lecture cookie sans RegExp
function getCookie(name) {
  if (typeof document === "undefined") return null;
  const cookieStr = document.cookie || "";
  const parts = cookieStr.split("; ");
  for (const part of parts) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    const key = decodeURIComponent(part.slice(0, eq));
    if (key === name) return decodeURIComponent(part.slice(eq + 1));
  }
  return null;
}

/* --- petite étoile rouge pour champs requis --- */
const RequiredMark = () => <span className="text-red-500" aria-hidden="true"> *</span>;

export default function TractionForm() {
  const t = useTranslations("auth.tractionForm");

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);

  // auth côté front (même logique que les autres forms)
  const localRole =
    typeof window !== "undefined"
      ? (localStorage.getItem("mtr_role") ||
         localStorage.getItem("userRole") ||
         getCookie("role"))
      : null;
  const isAuthenticated = Boolean(localRole) || Boolean(user?.authenticated);
  const isClient = ((user?.role || localRole) === "client");

  // Pour empêcher qu'un catch tardif écrase le succès
  const finishedRef = useRef(false);
  // Zone d'alerte sous le bouton
  const alertRef = useRef(null);
  const formRef = useRef(null); // reset complet

  // Dropzone
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // ========= Limite max fichiers =========
  const MAX_FILES = 4;
  function uniqueBySignature(arr = []) {
    const seen = new Set();
    const out = [];
    for (const f of arr) {
      const sig = `${f.name}|${f.size}|${f.lastModified || 0}`;
      if (!seen.has(sig)) { seen.add(sig); out.push(f); }
    }
    return out;
  }
  function syncInputFiles(inputRef, filesArr = []) {
    if (!inputRef?.current) return;
    const dt = new DataTransfer();
    filesArr.forEach((f) => dt.items.add(f));
    inputRef.current.files = dt.files;
  }
  function handleFileList(list, { append = true } = {}) {
    const incoming = Array.from(list || []);
    if (incoming.length === 0) return;
    const base = append ? (files || []) : [];
    const merged = uniqueBySignature([...base, ...incoming]);
    if (merged.length > MAX_FILES) {
      const kept = merged.slice(0, MAX_FILES);
      setFiles(kept);
      syncInputFiles(fileInputRef, kept);
      setErr(t("limit"));
      return;
    }
    setFiles(merged);
    syncInputFiles(fileInputRef, merged);
  }
  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) handleFileList(e.dataTransfer.files);
  }

  // ========================================================================
  // Options i18n (labels UI)
  const matOptions   = t.raw("materialOptions")   || [];
  const windOptions  = t.raw("windingOptions")    || [];
  const ringOptions  = t.raw("ringOptions")       || [];
  const hookOptions  = t.raw("hookOptions")       || [];
  const selectPlaceholder = t.has("selectPlaceholder") ? t("selectPlaceholder") : "Sélectionnez…";

  // ======================= Normalisation robuste EN -> FR =======================
  const canon = (s) =>
    String(s || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/[^a-z0-9]+/g, "");

  // valeurs FR attendues par le backend
  const MATIERE_MAP = new Map([
    ["filressortnoirsm", "Fil ressort noir SM"],
    ["blackspringwiresm", "Fil ressort noir SM"],
    ["blackspringwire(sm)", "Fil ressort noir SM"],
    ["filressortnoirsh", "Fil ressort noir SH"],
    ["blackspringwiresh", "Fil ressort noir SH"],
    ["blackspringwire(sh)", "Fil ressort noir SH"],
    ["galvanizedspringwire", "Fil ressort galvanisé"],
    ["filressortgalvanise", "Fil ressort galvanisé"],
    ["stainlesssteelspringwire", "Fil ressort inox"],
    ["acierinoxydable", "Fil ressort inox"],
  ]);
  const WIND_MAP = new Map([
    ["leftwinding", "Enroulement gauche"],
    ["gauche", "Enroulement gauche"],
    ["rightwinding", "Enroulement droite"],
    ["droite", "Enroulement droite"],
  ]);
  const HOOK_MAP = new Map([
    ["germanhook", "Anneau Allemand"],
    ["doublegermanhook", "Double Anneau Allemand"],
    ["tangenthook", "Anneau tangent"],
    ["extendedhook", "Anneau allongé"],
    ["englishloop", "Boucle Anglaise"],
    ["swivelhook", "Anneau tournant"],
    ["conicalwithscrew", "Conification avec vis"],
    // FR -> FR
    ["anneauallemand", "Anneau Allemand"],
    ["doubleanneauallemand", "Double Anneau Allemand"],
    ["anneautangent", "Anneau tangent"],
    ["anneauallonge", "Anneau allongé"],
    ["boucleanglaise", "Boucle Anglaise"],
    ["anneautournant", "Anneau tournant"],
    ["conificationavecvis", "Conification avec vis"],
  ]);

  const normalizeForBackend = (fd) => {
    const setIf = (name, map) => {
      const v = fd.get(name);
      if (!v) return;
      const c = canon(v);
      const fr = map.get(c);
      if (fr) fd.set(name, fr);
    };
    setIf("matiere", MATIERE_MAP);
    setIf("enroulement", WIND_MAP);
    setIf("typeAccrochage", HOOK_MAP);
    // positionAnneaux ('0°','90°','180°','270°') : identique FR/EN → rien à faire
  };
  // ============================================================================

  // session serveur
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data || null))
      .catch(() => setUser(null));
  }, []);

  // Scroll vers l'alerte
  useEffect(() => {
    if (alertRef.current && (loading || ok || err)) {
      alertRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, ok, err]);

  // Masquer le succès après 5s
  useEffect(() => {
    if (!ok) return;
    const id = setTimeout(() => setOk(""), 5000);
    return () => clearTimeout(id);
  }, [ok]);

  // Reset complet
  function resetUI() {
    formRef.current?.reset();
    setFiles([]);
    setIsDragging(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const onSubmit = async (e) => {
    e.preventDefault();

    setOk("");
    setErr("");
    finishedRef.current = false;

    if (!isAuthenticated) {
      setErr(t("loginToSend"));
      return;
    }
    if (!isClient) {
      setErr(t("reservedClients"));
      return;
    }

    setLoading(true);
    try {
      const form = e.currentTarget;
      const fd = new FormData(form);
      fd.append("type", "traction");

      const userId = typeof window !== "undefined" ? localStorage.getItem("id") : null;
      if (userId) fd.append("user", userId);

      // Normalisation FR obligatoire (backend)
      normalizeForBackend(fd);

      // POST direct vers backend (évite 401 via proxy)
      const res = await fetch(`${BACKEND}/api/devis/traction`, {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      let payload = null;
      try { payload = await res.json(); } catch {}

      if (res.ok) {
        finishedRef.current = true;
        setErr("");
        setOk(t.has("sendSuccess") ? t("sendSuccess") : "Demande confirmée. Merci !");
        resetUI();
        return;
      }

      setErr(payload?.message || `${t.has("sendError") ? t("sendError") : "Erreur lors de l’envoi."} (HTTP ${res.status})`);
    } catch (e2) {
      if (!finishedRef.current) {
        setErr(t.has("networkError") ? t("networkError") : "Erreur réseau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !isAuthenticated || !isClient;
  const filesTotalKb = ((files.reduce((s, f) => s + f.size, 0) / 1024) || 0).toFixed(0);
  const buttonLabel = loading
    ? (t.has("btn.loading") ? t("btn.loading") : t.has("sending") ? t("sending") : "Envoi en cours…")
    : !isAuthenticated
      ? t("loginToSend")
      : !isClient
        ? t("reservedClients")
        : t("sendRequest");

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Titre */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#002147]">
          {t("title")}
        </h2>
      </div>

      <form ref={formRef} onSubmit={onSubmit}>
        {/* Schéma */}
        <SectionTitle>{t("schema")}</SectionTitle>
        <div className="mb-6 flex justify-center">
          <Image
            src={schemaImg}
            alt={t.has("schemaAlt") ? t("schemaAlt") : "Traction schema"}
            width={420}
            height={380}
            className="rounded-xl ring-1 ring-gray-100"
            priority
          />
        </div>

        {/* Dimensions */}
        <SectionTitle>{t("maindim")}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Input name="d"  label={t("diameterWire")} required />
          <Input name="De" label={t("diameterExt")} required />
          <Input name="Lo" label={t("freeLength")} required />
          <Input name="nbSpires" label={t("totalCoils")} required />
          <Input name="quantite" label={t("quantity")} type="number" min="1" required />
          <SelectBase name="matiere"     label={t("material")}         options={matOptions}  placeholder={selectPlaceholder} required />
          <SelectBase name="enroulement" label={t("windingDirection")} options={windOptions} placeholder={selectPlaceholder} required />
        </div>

        {/* Position anneaux */}
        <SectionTitle className="mt-8">
          {t("ringPosition")} <RequiredMark />
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
          <div className="md:pt-4 w-full">
            <label className="block text-sm font-semibold text-[#002147] mb-2">
              {t("selectPosition")} <RequiredMark />
            </label>
            <select
              name="positionAnneaux"
              required
              className="w-full rounded-xl border-2 border-[#002147] px-4 py-2.5 bg-white
                         text-[#002147] text-[15px] font-medium
                         focus:outline-none focus:ring-2 focus:ring-[#002147]/40 focus:border-[#002147] pr-10"
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23002147' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.875rem center",
                backgroundSize: "1rem 1rem",
              }}
            >
              <option value="" style={{ color: "#64748b" }}>
                {selectPlaceholder === "Sélectionnez…" ? "Sélectionnez une position…" : selectPlaceholder}
              </option>
              {ringOptions.map((o) => (
                <option key={o} value={o} style={{ color: "#002147" }}>{o}</option>
              ))}
            </select>
          </div>

          <div className="flex justify-center md:justify-start">
            <Image
              src={positionsImg}
              alt={t.has("ringPositionsAlt") ? t("ringPositionsAlt") : "Ring positions"}
              width={420}
              height={240}
              className="rounded-xl ring-1 ring-gray-100"
            />
          </div>
        </div>

        {/* Type d’accrochage */}
        <SectionTitle className="mt-8">
          {t("hookType")} <RequiredMark />
        </SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 items-start">
          <div className="flex justify-center md:justify-start">
            <Image
              src={accrochesImg}
              alt={t.has("hookTypesAlt") ? t("hookTypesAlt") : "Hook types"}
              width={520}
              height={300}
              className="rounded-xl ring-1 ring-gray-100"
            />
          </div>
          <div className="md:pt-4 w-full">
            <label className="block text-sm font-semibold text-[#002147] mb-2">
              {t("selectType")} <RequiredMark />
            </label>
            <select
              name="typeAccrochage"
              required
              className="w-full rounded-xl border-2 border-[#002147] px-4 py-2.5 bg-white
                         text-[#002147] text-[15px] font-medium
                         focus:outline-none focus:ring-2 focus:ring-[#002147]/40 focus:border-[#002147] pr-10"
              style={{
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                backgroundImage:
                  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23002147' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 0.875rem center",
                backgroundSize: "1rem 1rem",
              }}
            >
              <option value="" style={{ color: "#64748b" }}>
                {selectPlaceholder === "Sélectionnez…" ? "Sélectionnez un type…" : selectPlaceholder}
              </option>
              {hookOptions.map((o) => (
                <option key={o} value={o} style={{ color: "#002147" }}>{o}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Fichiers */}
        <SectionTitle className="mt-8">{t("docs")}</SectionTitle>
        <p className="text-sm text-gray-500 mb-3">{t("acceptedTypes")}</p>

        <label
          htmlFor="docs"
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center cursor-pointer rounded-2xl text-center transition
                      min-h-[160px] md:min-h-[200px] p-8 bg-white
                      border-2 border-dashed ${isDragging ? "border-yellow-500 ring-2 ring-yellow-300" : "border-yellow-500"}`}
        >
          {files.length === 0 ? (
            <div className="text-center">
              <p className="text-base font-medium text-[#002147]">{t("dropHere")}</p>
              <p className="text-sm text-gray-500 mb-3">{t("4files")}</p>
            </div>
          ) : (
            <div className="w-full text-center">
              <p className="text-sm font-semibold text-[#002147] mb-2">
                {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""} :
              </p>
              <p className="mx-auto max-w-[900px] truncate text-[15px] text-[#002147]">
                {files.map((f) => f.name).join(", ")}
              </p>
              <p className="text-xs text-[#002147]/70 mt-1">{filesTotalKb} Ko au total</p>
            </div>
          )}

          <input
            id="docs"
            ref={fileInputRef}
            type="file"
            name="docs"
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.txt"
            className="hidden"
            onChange={(e) => handleFileList(e.target.files)}
          />
        </label>

        <div className="grid grid-cols-1 gap-4 md:gap-6 mt-6">
          <TextArea name="exigences" label={t("specialReq")} />
          <TextArea name="remarques" label={t("otherRemarks")} />
        </div>

        {/* Bouton Submit */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={disabled}
            className={`w-full rounded-xl font-semibold py-3 transition-all
              ${disabled
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-[#002147] to-[#01346b] text-white shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px]"}`}
          >
            {buttonLabel}
          </button>

          {/* ALERTES SOUS LE BOUTON */}
          <div ref={alertRef} aria-live="polite" className="mt-3">
            {loading ? (
              <Alert type="info" message={t.has("alert.loading") ? t("alert.loading") : t("sending")} />
            ) : err ? (
              <Alert type="error" message={err} />
            ) : ok ? (
              <Alert type="success" message={ok} />
            ) : null}
          </div>
        </div>
      </form>
    </section>
  );
}

/* === UI helpers (inchangés) === */
function SectionTitle({ children, className = "" }) {
  return (
    <div className={`mb-3 mt-4 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="h-5 w-1.5 rounded-full bg-[#002147]" />
        <h3 className="text-lg font-semibold text-[#002147]">{children}</h3>
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-[#002147]/20 via-gray-200 to-transparent" />
    </div>
  );
}
function Alert({ type = "info", message }) {
  const base = "w-full rounded-xl px-4 py-3 text-sm font-medium border flex items-start gap-2";
  const styles =
    type === "error"   ? "bg-red-50 text-red-700 border-red-200" :
    type === "success" ? "bg-green-50 text-green-700 border-green-200" :
                         "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <div className={`${base} ${styles}`}>
      <span className="mt-0.5">•</span>
      <span>{message}</span>
    </div>
  );
}
function Input({ label, name, required, type = "text", min }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block font-medium text-[#002147]">
          {label}{required && <RequiredMark />}
        </label>
      )}
      <input
        name={name}
        type={type}
        min={min}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5
                   text-[#002147] placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]" />
    </div>
  );
}
function SelectBase({ label, name, options = [], required, placeholder = "Sélectionnez…" }) {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="block font-medium text-[#002147]">
          {label}{required && <RequiredMark />}
        </label>
      )}
      <select
        name={name}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5 bg-white
                   text-[#002147] text-[15px] font-medium
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147] pr-10"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23002147' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.875rem center",
          backgroundSize: "1rem 1rem",
        }}
      >
        <option value="" style={{ color: "#64748b" }}>{placeholder}</option>
        {options.map((o) => (
          <option key={o} value={o} style={{ color: "#002147" }}>{o}</option>
        ))}
      </select>
    </div>
  );
}
function TextArea({ label, name }) {
  return (
    <div className="space-y-1">
      <label className="block font-medium text-[#002147]">{label}</label>
      <textarea
        name={name}
        rows={4}
        className="w-full rounded-xl border border-gray-200 px-4 py-2.5
                   text-[#002147] placeholder:text-gray-400
                   focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]" />
    </div>
  );
}
