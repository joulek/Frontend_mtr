"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Image from "next/image";
import grilleImg from "@/public/devis/grille.png";

/* --- petite étoile rouge pour champs requis --- */
const RequiredMark = () => <span className="text-red-500" aria-hidden> *</span>;

export default function GrilleMetalliqueForm() {
  const t = useTranslations("auth.grilleForm");
  const locale = useLocale();

  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");
  const [user, setUser] = useState(null);

  const finishedRef = useRef(false);
  const alertRef = useRef(null);

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
      if (!seen.has(sig)) {
        seen.add(sig);
        out.push(f);
      }
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
      const ignoredCount = merged.length - kept.length;

      setFiles(kept);
      syncInputFiles(fileInputRef, kept);

      // 🔔 message i18n
      setErr(t("limit"));

      console.warn("[Upload] Dépassement de la limite de fichiers:", {
        incoming: incoming.length,
        existing: files.length,
        kept: kept.length,
        ignored: ignoredCount,
        max: MAX_FILES,
      });
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

  // i18n options
  const materialOptions = t.has("materialChecks")
    ? t.raw("materialChecks")
    : (locale === "en"
        ? ["Galvanized steel", "Black steel", "Stainless steel"]
        : ["Acier galvanisé", "Acier Noir", "Inox"]);

  const finishOptions = t.has("finishChecks")
    ? t.raw("finishChecks")
    : (locale === "en"
        ? ["Painting", "Chrome plating", "Galvanization", "Other"]
        : ["Peinture", "Chromage", "Galvanisation", "Autre"]);

  const selectPlaceholder = t.has("selectPlaceholder") ? t("selectPlaceholder") : "Sélectionnez…";

  // --- Normaliser EN -> FR ---
  const FR_MAT = ["Acier galvanisé", "Acier Noir", "Inox"];
  const EN_TO_FR_MAT = [
    { fr: "Acier galvanisé", en: ["Galvanized steel", "Galvanized steel wire", "Galvanised steel", "Galvanised steel wire", "Galvanization steel"] },
    { fr: "Acier Noir",      en: ["Black steel", "Black steel wire", "Blackened steel"] },
    { fr: "Inox",            en: ["Stainless steel", "Stainless steel wire", "Inox", "Stainless"] },
  ];

  const FR_FIN = ["Peinture", "Chromage", "Galvanisation", "Autre"];
  const EN_TO_FR_FIN = [
    { fr: "Peinture",      en: ["Painting", "Painted", "Paint", "Coating", "Paint coat"] },
    { fr: "Chromage",      en: ["Chrome plating", "Chrome-plating", "Chromium plating", "Chroming", "Chromed", "Chrome"] },
    { fr: "Galvanisation", en: ["Galvanization", "Galvanising", "Galvanizing", "Zinc plating", "Zinc-plating", "Hot-dip galvanizing", "Hot dip galvanizing", "Galvanized", "Galvanised"] },
    { fr: "Autre",         en: ["Other", "None", "No finish", "Without finish"] },
  ];

  function normalizeOne(fd, name, frList, groups) {
    const v = fd.get(name);
    if (!v) return;
    if (frList.includes(v)) return;
    const low = String(v).toLowerCase().trim();
    for (const { fr, en } of groups) {
      if (Array.isArray(en) && en.some(e => String(e).toLowerCase().trim() === low)) {
        fd.set(name, fr);
        return;
      }
    }
  }

  // Récup session
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data || null))
      .catch(() => setUser(null));
  }, []);

  // scroll vers l’alerte
  useEffect(() => {
    if (alertRef.current && (loading || ok || err)) {
      alertRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, ok, err]);

  // auto-hide succès
  useEffect(() => {
    if (!ok) return;
    const id = setTimeout(() => setOk(""), 5000);
    return () => clearTimeout(id);
  }, [ok]);

  const onSubmit = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    setOk("");
    setErr("");
    finishedRef.current = false;

    if (!user?.authenticated) {
      setErr("Vous devez être connecté pour envoyer un devis.");
      return;
    }
    if (user.role !== "client") {
      setErr("Seuls les clients peuvent envoyer une demande de devis.");
      return;
    }

    setLoading(true);
    try {
      const fd = new FormData(form);
      fd.append("type", "grille");

      const userId = localStorage.getItem("id");
      if (userId) fd.append("user", userId);

      normalizeOne(fd, "matiere", FR_MAT, EN_TO_FR_MAT);
      normalizeOne(fd, "finition", FR_FIN, EN_TO_FR_FIN);

      const res = await fetch("/api/devis/grille", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      let payload = null;
      try { payload = await res.json(); } catch {}

      if (res.ok) {
        finishedRef.current = true;
        setErr("");
        setOk(t.has("sendSuccess") ? t("sendSuccess") : "Demande envoyée. Merci !");
        form.reset();
        setFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = "";
        return;
      }

      const msg = payload?.message || `Erreur lors de l’envoi. (HTTP ${res.status})`;
      setErr(msg);
    } catch (e) {
      console.error("submit grille error:", e);
      if (!finishedRef.current) {
        const isAbort = e?.name === "AbortError";
        setErr(isAbort ? "Délai dépassé, réessayez." : "Erreur réseau.");
      }
    } finally {
      setLoading(false);
    }
  };

  const disabled = loading || !user?.authenticated || user?.role !== "client";

  return (
    <section className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6">
      {/* Titre */}
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#002147]">
          {t("title")}
        </h2>
      </div>

      <form onSubmit={onSubmit}>
        {/* Schéma */}
        <SectionTitle>{t("schema")}</SectionTitle>
        <div className="mb-6 flex justify-center">
          <Image
            src={grilleImg}
            alt={t.has("schemaAlt") ? t("schemaAlt") : "Grille métallique"}
            width={500}
            height={500}
            className="rounded-xl ring-1 ring-gray-100"
            priority
          />
        </div>

        {/* Dimensions / Spec */}
        <SectionTitle>{t("maindim")}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Input name="L" label={t("L")} required />
          <Input name="l" label={t("l")} required />
          <Input name="nbLong" label={t("nbLong")} required />
          <Input name="nbTrans" label={t("nbTrans")} required />
          <Input name="pas1" label={t("pas1")} required />
          <Input name="pas2" label={t("pas2")} required />
          <Input name="D2" label={t("D2")} required />
          <Input name="D1" label={t("D1")} required />
          <Input name="quantite" label={t("quantity")} type="number" min="1" required />

          <SelectBase
            name="matiere"
            label={t("material")}
            options={materialOptions}
            placeholder={selectPlaceholder}
            required
          />
          <SelectBase
            name="finition"
            label={t("finish")}
            options={finishOptions}
            placeholder={selectPlaceholder}
            required
          />
        </div>

        {/* Fichiers */}
        <SectionTitle className="mt-8">{t("docs")} <RequiredMark /></SectionTitle>
        <p className="text-sm text-gray-500 mb-3">
          {t("acceptedTypes")}
        </p>

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
              <p className="text-base font-medium text-[#002147]">
                {t("dropHere")}
              </p>
              <p className="text-sm text-gray-500 mb-3">
                {t("4files")}
              </p>
            </div>
          ) : (
            <div className="w-full text-center">
              <p className="text-sm font-semibold text-[#002147] mb-2">
                {files.length} fichier{files.length > 1 ? "s" : ""} sélectionné{files.length > 1 ? "s" : ""} :
              </p>
              <p className="mx-auto max-w-[900px] truncate text:[15px] text-[#002147]">
                {files.map((f) => f.name).join(", ")}
              </p>
              <p className="text-xs text-[#002147]/70 mt-1">
                {(files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0)} Ko au total
              </p>
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

        {/* Textes libres */}
        <div className="grid grid-cols-1 gap-4 md:gap-6 mt-6">
          <TextArea name="exigences" label={t("specialReq")} />
          <TextArea name="remarques" label={t("otherRemarks")} />
        </div>

        {/* Submit + alertes */}
        <div className="mt-8">
          <button
            type="submit"
            disabled={disabled}
            className={`w-full rounded-xl font-semibold py-3 transition-all
              ${disabled
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-gradient-to-r from-[#002147] to-[#01346b] text-white shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px]"}`}
          >
            {loading
              ? "Envoi en cours…"
              : !user?.authenticated
                ? t("loginToSend")
                : user?.role !== "client"
                  ? t("loginToSend")
                  : t("sendRequest")}
          </button>

          <div ref={alertRef} aria-live="polite" className="mt-3">
            {loading ? (
              <Alert type="info" message="Votre demande de devis est en cours d'envoi, veuillez patienter…" />
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

/* === UI helpers === */
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
    type === "error"
      ? "bg-red-50 text-red-700 border-red-200"
      : type === "success"
        ? "bg-green-50 text-green-700 border-green-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
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
