"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import SiteHeader from "@/components/SiteHeader";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");

export default function ChangePasswordClient() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setOk(""); setErr(""); setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/users/change-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || t("errors.changePassword") || "Échec de la modification.");
      setOk(t("passwordChanged") || "Mot de passe modifié.");
      setCurrentPassword(""); setNewPassword("");
      setTimeout(() => router.push(`/${locale}/login`), 1200);
    } catch (e) {
      setErr(e?.message || t("errors.network") || "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SiteHeader />
      <main className="pt-0">
        <div className="fixed inset-x-0 top-[96px] bottom-0 bg-[#f5f5f5] flex items-center justify-center px-4">
          <div className="w-[520px] max-w-[92vw] min-h-[440px] rounded-2xl shadow-2xl border border-[#ffb400]/50 bg-white p-8 relative">
            <div className="flex justify-center -mt-14 mb-4 pointer-events-none">
              <div className="bg-white rounded-full shadow-lg p-3 border border-[#ffb400]/60">
                <Image src="/reset_password.png" alt="Modifier le mot de passe" width={80} height={80} className="object-contain" priority />
              </div>
            </div>

            <h1 className="text-2xl font-extrabold text-[#002147] text-center" style={{ fontFamily: "'Lora', serif" }}>
              {t("changePasswordTitle") || "Modifier mon mot de passe"}
            </h1>
            <p className="text-sm text-gray-600 mt-2 text-center">
              {t("changePasswordHint") || "Entrez votre mot de passe actuel puis le nouveau."}
            </p>

            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div>
                <label className="block font-semibold text-[#002147]">
                  {t("currentPassword") || "Mot de passe actuel"} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? "text" : "password"}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full h-12 rounded-xl border border-[#ddd] bg-white pr-10 px-4 text-[#002147] placeholder-[#555555] outline-none focus:border-[#ffb400] focus:ring-2 focus:ring-[#ffb400]/25 transition"
                    placeholder={t("placeholders.password") || "Votre mot de passe"}
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002147]" aria-label={showCurrent ? "Masquer" : "Afficher"}>
                    {showCurrent ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#002147]">
                  {t("newPassword") || "Nouveau mot de passe"} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showNew ? "text" : "password"}
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full h-12 rounded-xl border border-[#ddd] bg-white pr-10 px-4 text-[#002147] placeholder-[#555555] outline-none focus:border-[#ffb400] focus:ring-2 focus:ring-[#ffb400]/25 transition"
                    placeholder={t("placeholders.password") || "Choisissez un mot de passe"}
                    autoComplete="new-password"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#002147]" aria-label={showNew ? "Masquer" : "Afficher"}>
                    {showNew ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </div>

              {ok && <p className="text-green-600 text-sm font-semibold">{ok}</p>}
              {err && <p className="text-red-600 text-sm font-semibold">{err}</p>}

              <button type="submit" disabled={loading} className="w-full h-12 rounded-xl bg-[#002147] hover:bg-[#00366b] text-white font-bold disabled:opacity-60" style={{ fontFamily: "'Lora', serif" }}>
                {loading ? (t("loading") || "Chargement…") : (t("confirmChange") || "Confirmer")}
              </button>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
