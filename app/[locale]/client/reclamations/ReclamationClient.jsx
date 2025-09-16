"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";

/* -------------------- Config -------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");

/* -------------------- Helpers dates -------------------- */
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const fromISO = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map((x) => parseInt(x, 10));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
};
const norm = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const clampISOToToday = (iso) => {
  const v = fromISO(iso);
  if (!v) return iso;
  const today = norm(new Date());
  return norm(v) > today ? toISO(today) : toISO(v);
};

/* -------------------- Base64 fichier -------------------- */
const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1]);
    r.onerror = reject;
    r.readAsDataURL(file);
  });

/* -------------------- UI atoms -------------------- */
const RequiredMark = () => <span className="text-red-500" aria-hidden> *</span>;

function SectionTitle({ children, className = "" }) {
  return (
    <div className={`mb-3 mt-6 ${className}`}>
      <div className="flex items-center gap-3">
        <span className="h-4 w-1.5 rounded-full bg-[#002147]" />
        <h3 className="text-base md:text-lg font-semibold text-[#002147]">{children}</h3>
      </div>
      <div className="mt-2 h-px w-full bg-gradient-to-r from-[#002147]/20 via-gray-200 to-transparent" />
    </div>
  );
}

function Alert({ type = "info", message }) {
  const base = "w-full rounded-xl px-3 py-2 text-sm font-medium border flex items-start gap-2";
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

function Input({ label, name, required, type = "text", min, placeholder, value, onChange }) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-sm font-medium text-[#002147]">
          {label}{required && <RequiredMark />}
        </label>
      )}
      <input
        name={name}
        type={type}
        min={min}
        placeholder={placeholder}
        required={required}
        value={value ?? ""}
        onChange={onChange}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#002147] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147]"
      />
    </div>
  );
}

function SelectBase({ label, name, value, onChange, options = [], required, placeholder }) {
  return (
    <div className="space-y-1 w-full">
      {label && (
        <label className="block text-sm font-medium text-[#002147]">
          {label}{required && <RequiredMark />}
        </label>
      )}
      <select
        name={name}
        value={value ?? ""}
        onChange={onChange}
        required={required}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 bg-white text-sm text-[#002147] font-medium focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147] pr-8"
        style={{
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='none' stroke='%23002147' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M6 8l4 4 4-4'/%3E%3C/svg%3E\")",
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 0.6rem center",
          backgroundSize: "0.9rem 0.9rem",
        }}
      >
        <option value="" style={{ color: "#64748b" }}>{placeholder}</option>
        {options.map((o) => (
          <option key={o.value} value={o.value} style={{ color: "#002147" }}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/* -------------------- Date picker compact -------------------- */
function PrettyDatePicker({ label, value, onChange, name, required, maxDate, t }) {
  const [open, setOpen] = useState(false);
  const locale = useLocale();

  const today = norm(new Date());
  const maxD = maxDate ? norm(maxDate) : today;

  useEffect(() => {
    if (!value) return;
    const v = fromISO(value);
    if (v && norm(v) > maxD) onChange(toISO(maxD));
  }, [value, maxD, onChange]);

  const selected = fromISO(value);
  const [month, setMonth] = useState(
    () => (selected ? new Date(selected.getFullYear(), selected.getMonth(), 1)
                    : new Date(new Date().getFullYear(), new Date().getMonth(), 1))
  );
  const wrapRef = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (!wrapRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const daysShort = t.raw("datepicker.daysShort") || ["Mo","Tu","We","Th","Fr","Sa","Su"];
  const monthLabel = month.toLocaleDateString(locale || "fr-FR", { month: "long", year: "numeric" });

  const start = (() => {
    const d = new Date(month);
    const wd = (d.getDay() + 6) % 7; // Monday=0
    d.setDate(d.getDate() - wd);
    return d;
  })();
  const grid = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });

  const isSameDay = (a, b) =>
    a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const maxMonth = new Date(maxD.getFullYear(), maxD.getMonth(), 1);
  const canGoNext = month < maxMonth;

  return (
    <div className="space-y-1" ref={wrapRef}>
      {label && (
        <label className="block text-sm font-medium text-[#002147]">
          {label}{required && <RequiredMark />}
        </label>
      )}

      <button
        type="button"
        onClick={() => setOpen((s) => !s)}
        className="w-full text-left rounded-xl border border-gray-200 px-3 py-2 bg-white text-sm text-[#002147] placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#002147]/30 focus:border-[#002147] relative"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={t("datepicker.open")}
        title={t("datepicker.open")}
      >
        <span className={`${value ? "text-[#002147]" : "text-gray-400"}`}>
          {value ? fromISO(value)?.toLocaleDateString(locale || "fr-FR") : t("datepicker.placeholder")}
        </span>
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-[#002147]/70">📅</span>
      </button>
      <input type="hidden" name={name} value={value || ""} />

      {open && (
        <div className="absolute z-50 mt-2 w-[240px] rounded-lg border border-gray-200 bg-white shadow-xl p-2">
          <div className="flex items-center justify-between px-1 pb-1">
            <button
              type="button"
              onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
              className="rounded-md px-1.5 py-0.5 text-sm hover:bg-gray-100"
              aria-label={t("datepicker.prevMonth")}
              title={t("datepicker.prevMonth")}
            >‹</button>

            <div className="font-semibold text-sm text-[#002147] capitalize">{monthLabel}</div>

            <button
              type="button"
              disabled={!canGoNext}
              onClick={() => canGoNext && setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
              className={`rounded-md px-1.5 py-0.5 text-sm ${canGoNext ? "hover:bg-gray-100" : "opacity-40 cursor-not-allowed pointer-events-none"}`}
              aria-label={t("datepicker.nextMonth")}
              title={t("datepicker.nextMonth")}
            >›</button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-gray-500 mb-1">
            {daysShort.map((d) => <div key={d} className="py-0.5">{d}</div>)}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {grid.map((d, i) => {
              const inMonth = d.getMonth() === month.getMonth();
              const isToday = isSameDay(d, new Date());
              const isSelected = selected && isSameDay(d, selected);
              const isFuture = norm(d) > maxD;

              const baseDayCls = `py-1 rounded-md text-xs ${inMonth ? "text-[#002147]" : "text-gray-400"}`;

              if (isFuture) {
                return (
                  <div key={i} aria-disabled="true" tabIndex={-1} className={`${baseDayCls} opacity-40 cursor-not-allowed`}>
                    {d.getDate()}
                  </div>
                );
              }

              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    const pickedISO = toISO(new Date(d.getFullYear(), d.getMonth(), d.getDate()));
                    onChange(clampISOToToday(pickedISO));
                    setOpen(false);
                  }}
                  className={`${baseDayCls} ${isSelected ? "bg-[#002147] text-white" : "hover:bg-gray-100"} ${isToday && !isSelected ? "ring-1 ring-[#002147]/40" : ""}`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>

          <div className="mt-1 flex items-center justify-between">
            <button type="button" onClick={() => { onChange(""); setOpen(false); }} className="text-xs text-gray-600 hover:text-gray-800">
              {t("datepicker.clear")}
            </button>
            <button
              type="button"
              onClick={() => {
                const tnow = norm(new Date());
                onChange(toISO(tnow));
                setMonth(new Date(tnow.getFullYear(), tnow.getMonth(), 1));
                setOpen(false);
              }}
              className="text-xs text-[#002147] font-medium hover:underline"
            >
              {t("datepicker.today")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ===================== Page (sans cookies / auth) ===================== */
export default function ReclamationClient() {
  const t = useTranslations("auth.client.reclamationForm");
  const locale = useLocale();

  /* -------- UI state -------- */
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const alertRef = useRef(null);

  useEffect(() => {
    if (alertRef.current && message) {
      alertRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [message]);

  // auto-hide succès
  useEffect(() => {
    if (!message.startsWith("✅")) return;
    const id = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(id);
  }, [message]);

  /* -------- options i18n -------- */
  const typeDocOptions = t.raw("typeDocOptions") || [
    { value: "devis", label: "Devis" },
    { value: "bon_commande", label: "Bon de commande" },
    { value: "bon_livraison", label: "Bon de livraison" },
    { value: "facture", label: "Facture" },
  ];
  const natureOptions = t.raw("natureOptions") || [
    { value: "produit_non_conforme", label: "Produit non conforme" },
    { value: "deterioration_transport", label: "Détérioration transport" },
    { value: "erreur_quantite", label: "Erreur de quantité" },
    { value: "retard_livraison", label: "Retard de livraison" },
    { value: "defaut_fonctionnel", label: "Défaut fonctionnel" },
    { value: "autre", label: "Autre" },
  ];
  const attenteOptions = t.raw("attenteOptions") || [
    { value: "remplacement", label: "Remplacement" },
    { value: "reparation", label: "Réparation" },
    { value: "remboursement", label: "Remboursement" },
    { value: "autre", label: "Autre" },
  ];

  /* -------- form -------- */
  const [form, setForm] = useState({
    typeDoc: "devis",
    numero: "",
    dateLivraison: "",
    referenceProduit: "",
    quantite: "",
    nature: "produit_non_conforme",
    natureAutre: "",
    attente: "remplacement",
    attenteAutre: "",
  });
  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));
  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "dateLivraison") setField(name, clampISOToToday(value));
    else setField(name, value);
  };

  /* -------- files -------- */
  const MAX_FILES = 4;
  const [files, setFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
    const merged = uniqueBySignature([...base, ...incoming]).slice(0, MAX_FILES);
    setFiles(merged);
    syncInputFiles(fileInputRef, merged);
    if (base.length + incoming.length > MAX_FILES) {
      setMessage(`⚠️ ${t.has("files.limit") ? t("files.limit") : "Maximum 4 fichiers."}`);
    }
  }
  function onDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer?.files?.length) handleFileList(e.dataTransfer.files, { append: true });
  }

  /* -------- submit (AUCUN check d'auth) -------- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // vérifs de base du formulaire (sans auth)
    if (!form.numero.trim()) return setMessage(`⚠️ ${t("errors.documentNumberRequired")}`);
    if (form.nature === "autre" && !form.natureAutre.trim()) return setMessage(`⚠️ ${t("errors.natureOtherRequired")}`);
    if (form.attente === "autre" && !form.attenteAutre.trim()) return setMessage(`⚠️ ${t("errors.attenteOtherRequired")}`);

    if (form.dateLivraison) {
      const dl = fromISO(form.dateLivraison);
      if (norm(dl) > norm(new Date())) return setMessage(`⚠️ ${t("errors.futureDate")}`);
    }

    setSubmitting(true);
    try {
      const piecesJointes = await Promise.all(
        (files || []).map(async (file) => ({
          filename: file.name,
          mimetype: file.type || "application/octet-stream",
          data: await fileToBase64(file),
        }))
      );

      const parts = [];
      if (form.nature === "autre") parts.push(`${t("fields.natureOther")}: ${form.natureAutre.trim()}`);
      if (form.attente === "autre") parts.push(`${t("fields.attenteOther")}: ${form.attenteAutre.trim()}`);
      const description = parts.length ? parts.join(" | ") : undefined;

      const payload = {
        user: null, // plus d’auth ici
        commande: {
          typeDoc: form.typeDoc,
          numero: form.numero.trim(),
          dateLivraison: form.dateLivraison ? fromISO(form.dateLivraison) : undefined,
          referenceProduit: form.referenceProduit || undefined,
          quantite: form.quantite ? Number(form.quantite) : undefined,
        },
        nature: form.nature,
        attente: form.attente,
        description,
        piecesJointes,
      };

      const res = await fetch(`${BACKEND}/api/reclamations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" }, // NO auth header
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => null);
      if (!json?.success) throw new Error(json?.message || `HTTP ${res.status}`);

      setMessage(`✅ ${t("success.submitted")}`);
      // reset
      setForm({
        typeDoc: "devis",
        numero: "",
        dateLivraison: "",
        referenceProduit: "",
        quantite: "",
        nature: "produit_non_conforme",
        natureAutre: "",
        attente: "remplacement",
        attenteAutre: "",
      });
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setMessage(`❌ ${err?.message || t("errors.unknown")}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* -------------------- Render -------------------- */
  return (
    <section className="mx-auto max-w-5xl px-3 sm:px-6 lg:px-8 py-6">
      {/* Titre */}
      <div className="text-center mb-5">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-[#002147]">
          {t("title")}
        </h1>
        <p className="mt-1.5 text-sm text-gray-600">{t("subtitle")}</p>
      </div>

      {/* Carte */}
      <div className="rounded-2xl bg-white shadow-[0_8px_24px_rgba(0,0,0,.06)] border border-gray-100 p-4 md:p-6">
        <form onSubmit={handleSubmit}>
          <SectionTitle>{t("sections.docInfo")}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <SelectBase
              name="typeDoc"
              value={form.typeDoc}
              onChange={onChange}
              label={t("fields.typeDoc")}
              required
              options={typeDocOptions}
              placeholder={t("selectPlaceholder")}
            />
            <Input
              name="numero"
              label={t("fields.numero")}
              required
              placeholder={t("placeholders.numero")}
              value={form.numero}
              onChange={onChange}
            />

            <PrettyDatePicker
              label={t("fields.dateLivraison")}
              name="dateLivraison"
              value={form.dateLivraison}
              onChange={(val) => setField("dateLivraison", clampISOToToday(val))}
              maxDate={new Date()}
              t={t}
            />

            <Input
              name="referenceProduit"
              label={t("fields.referenceProduit")}
              placeholder={t("placeholders.referenceProduit")}
              value={form.referenceProduit}
              onChange={onChange}
            />
            <Input
              type="number"
              min="0"
              name="quantite"
              label={t("fields.quantite")}
              placeholder={t("placeholders.quantite")}
              value={form.quantite}
              onChange={onChange}
            />
          </div>

          <SectionTitle>{t("sections.claim")}</SectionTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            <SelectBase
              name="nature"
              value={form.nature}
              onChange={onChange}
              label={t("fields.nature")}
              required
              options={natureOptions}
              placeholder={t("selectPlaceholder")}
            />
            {form.nature === "autre" && (
              <Input
                name="natureAutre"
                label={t("fields.natureOther")}
                required
                value={form.natureAutre}
                onChange={onChange}
              />
            )}

            <SelectBase
              name="attente"
              value={form.attente}
              onChange={onChange}
              label={t("fields.attente")}
              required
              options={attenteOptions}
              placeholder={t("selectPlaceholder")}
            />
            {form.attente === "autre" && (
              <Input
                name="attenteAutre"
                label={t("fields.attenteOther")}
                required
                value={form.attenteAutre}
                onChange={onChange}
              />
            )}
          </div>

          <SectionTitle>{t("sections.attachments")}</SectionTitle>
          <p className="text-xs text-gray-500 mb-2">{t("files.formats")}</p>

          <label
            htmlFor="files"
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
            className={`flex flex-col items-center justify-center cursor-pointer rounded-2xl text-center transition
                        min-h-[110px] md:min-h-[130px] p-5 bg-white
                        border-2 border-dashed ${isDragging ? "border-yellow-500 ring-2 ring-yellow-300" : "border-yellow-500"}`}
            aria-label={t("aria.dropzone")}
            title={t("aria.dropzone")}
          >
            {files.length === 0 ? (
              <p className="text-sm font-medium text-[#002147]">{t("files.drop")}</p>
            ) : (
              <div className="w-full text-center">
                <p className="text-sm font-semibold text-[#002147] mb-1">
                  {t("files.selected", { count: files.length })}
                </p>
                <p className="mx-auto max-w-[900px] truncate text-[13px] text-[#002147]">
                  {files.map((f) => f.name).join(", ")}
                </p>
                <p className="text-[11px] text-[#002147]/70 mt-1">
                  {t("files.total", { kb: (files.reduce((s, f) => s + f.size, 0) / 1024).toFixed(0) })}
                </p>
              </div>
            )}
            <input
              id="files"
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,application/pdf"
              className="hidden"
              onChange={(e) => handleFileList(e.target.files, { append: true })}
            />
          </label>

          <div ref={alertRef} aria-live="polite" className="mt-4">
            {message && (
              <Alert
                type={message.startsWith("✅") ? "success" : message.startsWith("⚠️") ? "info" : "error"}
                message={message}
              />
            )}
          </div>

          <div className="mt-6">
            <button
              type="submit"
              disabled={submitting}
              className={`w-full rounded-xl font-semibold py-3 transition-all
                ${submitting
                  ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-[#002147] to-[#01346b] text-white shadow-lg hover:shadow-xl hover:translate-y-[-1px] active:translate-y-[0px]"}`}
              aria-label={t("aria.submit")}
              title={t("aria.submit")}
            >
              {submitting ? t("button.sending") : t("button.send")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
