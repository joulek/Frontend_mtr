"use client";
import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import Image from "next/image";

import schemaImg from "@/public/devis/compression01.png";
import typeImg from "@/public/devis/compression02.png";

const RequiredMark = () => <span className="text-red-500" aria-hidden="true"> *</span>;

export default function CompressionForm() {
  const t = useTranslations("auth.compressionForm");

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

  /* ===================== AJOUTS POUR LIMITER À 4 FICHIERS ===================== */
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
  /* ========================================================================== */

  /* ---------- i18n OPTIONS (labels) + valeurs envoyées au backend ---------- */
  // ✅ Valeurs stables attendues par le backend (SM et SH séparés)
  const MATERIAL_VALUES = [
    "Fil ressort noir SH",
    "Fil ressort noir SM",
    "Fil ressort galvanisé",
    "Fil ressort inox",
  ];

  // Labels affichés (traductions) — si non fournis on affiche les valeurs ci-dessus
  let materialLabels = t.raw("materialOptions");
  if (!Array.isArray(materialLabels) || materialLabels.length < MATERIAL_VALUES.length) {
    materialLabels = MATERIAL_VALUES;
  }
  const materialOptions = MATERIAL_VALUES.map((value, i) => ({
    value,
    label: materialLabels[i] ?? value,
  }));

  const WIND_VALUES = ["Enroulement gauche", "Enroulement droite"];
  const windLabels = t.raw("windingOptions") || WIND_VALUES;
  const windOptions = WIND_VALUES.map((value, i) => ({
    value,
    label: windLabels[i] ?? value,
  }));

  const EXTREMITIES = ["ERM", "EL", "ELM", "ERNM"];
  const extremityLabels = t.raw("extremityOptions") || EXTREMITIES;
  const extremityOptions = EXTREMITIES.map((value, i) => ({
    value,
    label: extremityLabels[i] ?? value,
  }));

  const selectPlaceholder = t.has("selectPlaceholder") ? t("selectPlaceholder") : "Sélectionnez…";
  /* ------------------------------------------------------------------------ */

  // Récup session
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => setUser(data || null))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    if (alertRef.current && (loading || ok || err)) {
      alertRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [loading, ok, err]);

  useEffect(() => {
    if (!ok) return;
    const id = setTimeout(() => setOk(""), 5000);
    return () => clearTimeout(id);
  }, [ok]);

  function handleFileList(list, { append = true } = {}) {
    const incoming = Array.from(list || []);
    if (incoming.length === 0) return;

    // fusion avec l'existant (ou remplacement si append=false)
    const base = append ? (files || []) : [];
    const merged = uniqueBySignature([...base, ...incoming]);

    if (merged.length > MAX_FILES) {
      const kept = merged.slice(0, MAX_FILES);
      const ignoredCount = merged.length - kept.length;

      setFiles(kept);
      syncInputFiles(fileInputRef, kept);

      // 🔔 message unique via i18n
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
      fd.append("type", "compression");

      const userId = localStorage.getItem("id");
      if (userId) fd.append("user", userId);

      // Normalisation de sécurité (si un label est renvoyé à la place de la valeur)
      const mat = fd.get("matiere");
      const wind = fd.get("enroulement");
      const ext = fd.get("extremite");

      if (!MATERIAL_VALUES.includes(mat)) {
        const i = materialLabels.indexOf(mat);
        if (i >= 0 && MATERIAL_VALUES[i]) fd.set("matiere", MATERIAL_VALUES[i]);
      }
      if (!WIND_VALUES.includes(wind)) {
        const i = windLabels.indexOf(wind);
        if (i >= 0) fd.set("enroulement", WIND_VALUES[i]);
      }
      if (!EXTREMITIES.includes(ext)) {
        const i = extremityLabels.indexOf(ext);
        if (i >= 0) fd.set("extremite", EXTREMITIES[i]);
      }

      const res = await fetch("/api/devis/compression", {
        method: "POST",
        body: fd,
        credentials: "include",
      });

      let payload = null;
      try { payload = await res.json(); } catch { }

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
      console.error("submit compression error:", e);
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
      <div className="text-center mb-6">
        <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#002147]">
          {t("title")}
        </h2>
      </div>

      <form onSubmit={onSubmit}>
        <SectionTitle>{t("schema")}</SectionTitle>

        <div className="mb-6 flex justify-center">
          <Image
            src={schemaImg}
            alt={t.has("schemaAlt") ? t("schemaAlt") : "Ressort de compression"}
            width={420}
            height={260}
            className="rounded-xl ring-1 ring-gray-100"
            priority
          />
        </div>

        <SectionTitle>{t("maindim")}</SectionTitle>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <Input name="d" label={t("diameterWire")} required />
          <Input name="DE" label={t("diameterExt")} required />
          <Input name="H" label={t("boreDiameter")} />
          <Input name="S" label={t("guideDiameter")} />
          <Input name="DI" label={t("diameterInt")} required />
          <Input name="Lo" label={t("freeLength")} required />
          <Input name="nbSpires" label={t("totalCoils")} required />
          <Input name="pas" label={t("pitch")} required />
          <Input name="quantite" label={t("quantity")} type="number" min="1" required />

          <SelectBase
            name="matiere"
            label={t("material")}
            options={materialOptions}
            placeholder={selectPlaceholder}
            required
          />
          <SelectBase
            name="enroulement"
            label={t("windingDirection")}
            options={windOptions}
            placeholder={selectPlaceholder}
            required
          />
          <SelectBase
            name="extremite"
            label={t("extremityType")}
            options={extremityOptions}
            placeholder={selectPlaceholder}
            required
          />
        </div>

        <div className="mt-4 flex justify-center">
          <Image
            src={typeImg}
            alt={t.has("extremityAlt") ? t("extremityAlt") : "Types d’extrémité"}
            width={460}
            height={230}
            className="rounded-xl ring-1 ring-gray-100"
          />
        </div>

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

        <div className="grid grid-cols-1 gap-4 md:gap-6 mt-6">
          <TextArea name="exigences" label={t("specialReq")} />
          <TextArea name="remarques" label={t("otherRemarks")} />
        </div>

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
        {options.map((o, idx) => {
          const value = typeof o === "string" ? o : o.value;
          const label = typeof o === "string" ? o : o.label;
          return (
            <option key={`${value}-${idx}`} value={value} style={{ color: "#002147" }}>
              {label}
            </option>
          );
        })}
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
