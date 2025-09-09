"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import Image from "next/image";
import forgetImg from "@/public/forget_icon.png";

// 🔹 Header
import SiteHeader from "@/components/SiteHeader";

const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");

export default function ForgotPasswordClient() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState("");
  const [err, setErr] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setOk("");
    setErr("");
    setLoading(true);
    try {
      // 1) Vérifier si l’email existe
      const chk = await fetch(`${BACKEND}/api/auth/check-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const chkData = await chk.json();
      if (!chk.ok || !chkData?.exists) {
        setErr(t("errors.noAccountForEmail") || "Aucun compte avec cet email.");
        setLoading(false);
        return;
      }

      // 2) Demander l’envoi du code
      const res = await fetch(`${BACKEND}/api/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Erreur");

      // 3) Stocker l’email en session (pas dans l’URL)
      sessionStorage.setItem("resetEmail", email);
      router.replace(`/${locale}/reset-password`);
    } catch (e) {
      setErr(e.message || t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* 🔹 Header global */}
      <SiteHeader />

      <main className="pt-0">
        {/* Zone fixe sous le header */}
        <div
          className="
            fixed inset-x-0 
            top-[96px]    /* adapte la valeur si ton header est plus petit/grand */
            bottom-0
            bg-[#f5f5f5]
            flex items-center justify-center
            px-4
          "
        >
          {/* Carte centrée avec taille fixe */}
          <div
            className="
              w-[520px] max-w-[92vw]
              min-h-[420px]
              rounded-2xl shadow-2xl border border-[#ffb400]/50 bg-white
              p-8 relative
            "
          >
            {/* Icône */}
            <div className="flex justify-center -mt-14 mb-4 pointer-events-none">
              <div className="bg-white rounded-full shadow-lg p-3 border border-[#ffb400]/60">
                <Image
                  src={forgetImg}
                  alt="Mot de passe oublié"
                  width={80}
                  height={80}
                  className="object-contain"
                  priority
                />
              </div>
            </div>

            <h1
              className="text-2xl font-extrabold text-[#002147] text-center"
              style={{ fontFamily: "'Lora', serif" }}
            >
              {t("forgotTitle")}
            </h1>
            <p className="text-sm text-gray-600 mt-2 text-center">
              {t("forgotHint")}
            </p>

            {/* Formulaire */}
            <form className="mt-6 space-y-4" onSubmit={onSubmit}>
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block font-semibold text-[#002147]"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {t("email")} <span className="text-red-500">*</span>
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-[#ddd] bg-white px-4 text-[#002147] placeholder-[#555555] outline-none focus:border-[#ffb400] focus:ring-2 focus:ring-[#ffb400]/25 transition"
                  placeholder={t("placeholders.email")}
                />
              </div>

              {ok && <p className="text-green-600 text-sm font-semibold">{ok}</p>}
              {err && <p className="text-red-600 text-sm font-semibold">{err}</p>}

              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-bold disabled:opacity-60"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {loading ? t("loading") : t("sendReset")}
              </button>

              <a
                href={`/${locale}/login`}
                className="block text-center text-sm text-[#002147] font-semibold hover:underline"
              >
                {t("backToLogin")}
              </a>
            </form>
          </div>
        </div>
      </main>
    </>
  );
}
