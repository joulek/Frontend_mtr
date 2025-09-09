"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Home, MessageSquareWarning, HelpCircle, KeyRound } from "lucide-react"; // ⬅️ ajout KeyRound

const NAVY = "#0B1E3A";
const YELLOW = "#F7C600";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

/* ---------- UI PRIMITIVES ---------- */

function Section({ title, children, className = "" }) {
  return (
    <section
      className={`rounded-2xl border bg-white p-6 ${className}`}
      style={{ borderColor: `${YELLOW}55`, boxShadow: "0 6px 22px rgba(0,0,0,.05)" }}
    >
      <h2 className="text-lg font-extrabold mb-4" style={{ color: NAVY }}>
        {title}
      </h2>
      <div className="h-1 w-12 rounded mb-5" style={{ backgroundColor: YELLOW }} />
      {children}
    </section>
  );
}

function InfoItem({ label, value }) {
  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg border mb-3 last:mb-0"
      style={{ borderColor: `${YELLOW}44` }}
    >
      <span className="text-sm font-semibold" style={{ color: NAVY }}>{label}</span>
      <span className="text-sm" style={{ color: "#333" }}>{value || "-"}</span>
    </div>
  );
}

function Row({ icon, label, hint, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border bg-white hover:bg-gray-50 transition text-left"
      style={{ borderColor: `${YELLOW}44` }}
    >
      <span aria-hidden className="text-lg" style={{ color: NAVY }}>{icon}</span>
      <div className="flex-1">
        <div className="text-[15px] font-semibold" style={{ color: NAVY }}>{label}</div>
        {hint ? <div className="text-xs text-gray-500">{hint}</div> : null}
      </div>
      <span className="text-gray-400">›</span>
    </button>
  );
}

/* ---------- PAGE ---------- */

export default function ClientProfileReadOnly() {
  const t = useTranslations("profile");
  const router = useRouter();
  const locale = useLocale();

  const [me, setMe] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND}/api/users/me`, {
          method: "GET",
          credentials: "include",
        });
        if (!res.ok) throw new Error("Unauthorized");
        const u = await res.json();
        if (cancelled) return;
        setMe(u);
      } catch (err) {
        console.warn("Non authentifié ou erreur:", err.message);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  if (!me) return <p className="text-center mt-10">{t("loading")}</p>;

  const fullName = [me?.prenom, me?.nom].filter(Boolean).join(" ") || t("userFallback");
  const initial = (fullName && fullName[0]) || "U";

  return (
    <div className="min-h-screen bg-white px-4 py-8">
      <div className="mx-auto w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* MON COMPTE */}
        <Section title={t("account.title")} className="lg:col-span-2">
          <div className="flex items-center gap-4">
            <div
              className="grid place-items-center rounded-xl"
              style={{
                width: 56,
                height: 56,
                backgroundColor: `${YELLOW}22`,
                border: `1px solid ${YELLOW}66`,
                color: NAVY,
                fontWeight: 800,
                fontSize: 22,
              }}
            >
              {initial}
            </div>
            <div className="flex-1">
              <div className="text-xl font-extrabold" style={{ color: NAVY }}>
                {fullName}
              </div>
              <div className="text-sm text-gray-500">{me.email || t("account.unknownEmail")}</div>
            </div>
          </div>

          {/* Infos */}
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <InfoItem label={t("account.fields.lastName")} value={me.nom} />
            <InfoItem label={t("account.fields.firstName")} value={me.prenom} />
            <InfoItem label={t("account.fields.phone")} value={me.numTel} />
            <InfoItem label={t("account.fields.address")} value={me.adresse} />
            <InfoItem label={t("account.fields.accountType")} value={me.accountType} />
            <InfoItem label={t("account.fields.loginEmail")} value={me.email} />
          </div>

          {me.accountType === "personnel" && (
            <div className="mt-6">
              <h3 className="font-bold text-gray-700 mb-3">{t("account.personalInfo")}</h3>
              <InfoItem label={t("account.fields.cin")} value={me?.personal?.cin} />
              <InfoItem label={t("account.fields.currentPosition")} value={me?.personal?.posteActuel} />
            </div>
          )}

          {me.accountType === "societe" && (
            <div className="mt-6">
              <h3 className="font-bold text-gray-700 mb-3">{t("account.companyInfo")}</h3>
              <InfoItem label={t("account.fields.matriculeFiscal")} value={me?.company?.matriculeFiscal} />
              <InfoItem label={t("account.fields.companyName")} value={me?.company?.nomSociete} />
              <InfoItem label={t("account.fields.currentPosition")} value={me?.company?.posteActuel} />
            </div>
          )}
        </Section>

        {/* RACCOURCIS */}
        <Section title={t("shortcuts.title")} className="lg:col-span-1">
          <div className="grid grid-cols-1 gap-3">
            <Row
              icon={<Home className="w-5 h-5 text-[#FDC500]" />}
              label={t("shortcuts.home")}
              hint={t("shortcuts.homeHint")}
              onClick={() => router.push(`/${locale}/`)}
            />
            <Row
              icon={<MessageSquareWarning className="w-5 h-5 text-[#FDC500]" />}
              label={t("shortcuts.claims", { defaultMessage: "Mes réclamations" })}
              hint={t("shortcuts.claimsHint", { defaultMessage: "Soumettre et suivre vos réclamations" })}
              onClick={() => router.push(`/${locale}/client/mes-reclamations`)}
            />
            <Row
              icon={<HelpCircle className="w-5 h-5 text-[#FDC500]" />}
              label={t("shortcuts.help")}
              hint={t("shortcuts.helpHint")}
              onClick={() => router.push(`/${locale}/client/support`)}
            />
            {/* Nouveau raccourci pour changer le mot de passe */}
            <Row
              icon={<KeyRound className="w-5 h-5 text-[#FDC500]" />}
              label={t("shortcuts.changePassword", { defaultMessage: "Changer mon mot de passe" })}
              hint={t("shortcuts.changePasswordHint", { defaultMessage: "Mettre à jour votre mot de passe" })}
              onClick={() => router.push(`/${locale}/change-password`)}
            />
          </div>
        </Section>

        {/* À PROPOS */}
        <Section title={t("about.title")} className="lg:col-span-3">
          <div className="text-sm text-gray-600">{t("about.text")}</div>
        </Section>
      </div>
    </div>
  );
}
