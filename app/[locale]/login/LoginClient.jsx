"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const BACKEND =
        process.env.NEXT_PUBLIC_BACKEND_URL ||
        "https://backend-mtr.onrender.com";

      const res = await fetch(`${BACKEND}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: String(email),
          password: String(password),
          rememberMe: remember,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || t("errors.loginFailed"));
      } else {
        const role = (data.role || data.user?.role || "").toString();

        // Stocker le rôle et gérer les cookies
        localStorage.setItem("userRole", role);
        document.cookie = `role=${encodeURIComponent(role)}; Path=/; Max-Age=${
          remember ? 30 : 1
        } * 24 * 60 * 60; SameSite=Lax`;

        // Rediriger selon le rôle
        if (role === "admin") router.push(`/${locale}/admin`);
        else if (role === "client")
          router.push(
            `/${locale}/client/devis`
          ); // Redirection vers la page de devis pour un client
        else router.push(`/${locale}/home`);
      }
    } catch {
      setError(t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f7fb] [background:radial-gradient(80%_60%_at_10%_0%,rgba(11,34,57,.06),transparent),radial-gradient(60%_40%_at_90%_10%,rgba(245,179,1,.07),transparent)]">
      {/* Header global */}
      <SiteHeader />

      {/* Contenu */}
      <main className="px-4 py-10">
        <div className="mx-auto grid w-full max-w-6xl overflow-hidden rounded-3xl border border-[#F5B301]/30 bg-white shadow-2xl ring-1 ring-black/5 lg:grid-cols-2">
          {/* Pane gauche (visuel + logo) */}
          <div className="relative hidden min-h-[560px] lg:block">
            <Image
              src="/about.jpg"
              alt="Ressorts"
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover opacity-40"
              priority
            />
            <div className="absolute inset-0 bg-[#002147]/40" />
            {/* overlay aux couleurs du site */}
            {/* bloc centré */}
            <div className="absolute inset-0 flex flex-col items-center justify-center p-10 text-center">
              {/* ✅ Logo corrigé : position centré, responsive, sans marges négatives */}
              <Image
                src="/logo_MTR.png"
                alt="MTR — Manufacture Tunisienne des Ressorts"
                width={270} // ~ largeur par défaut desktop
                height={90}
                className="drop-shadow-xl w-[200px] md:w-[240px] lg:w-[260px] h-auto"
                priority
              />

              <h2
                className="mt-6 max-w-md text-3xl font-extrabold leading-tight text-[#ffb400] md:text-4xl"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {t("joinClientSpace")}
              </h2>

              <p
                className="mt-4 max-w-md text-sm font-bold  text-[#002147]/80 md:text-base"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {t("promoText")}
              </p>
            </div>
          </div>

          {/* Pane droite (formulaire) */}
          <div className="p-6 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <h1
                className="text-center text-3xl font-extrabold text-[#0B2239] sm:text-4xl"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {t("loginTitle")}
              </h1>

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {/* Email */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block font-semibold text-[#0B2239]"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {t("email")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#e6e8ee] bg-white px-4 py-3 text-[#0B2239] placeholder-[#7a8599] outline-none transition focus:border-[#F5B301] focus:ring-2 focus:ring-[#F5B301]/25"
                    placeholder={t("placeholders.email")}
                    required
                  />
                </div>

                {/* Mot de passe */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block font-semibold text-[#0B2239]"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {t("password")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      className={`w-full rounded-xl border border-[#e6e8ee] bg-white py-3 text-[#0B2239] placeholder-[#7a8599] outline-none transition focus:border-[#F5B301] focus:ring-2 focus:ring-[#F5B301]/25 ${
                        locale === "ar" ? "pl-10 pr-4" : "pr-10 pl-4"
                      }`}
                      placeholder="********"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className={`absolute inset-y-0 my-auto px-3 text-[#7a8599] ${
                        locale === "ar" ? "left-3" : "right-3"
                      }`}
                      aria-label="Afficher / masquer le mot de passe"
                      style={{ fontFamily: "'Lora', serif" }}
                    >
                      {showPwd ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Erreur */}
                {error && (
                  <p className="text-center text-sm font-semibold text-red-600">
                    {error}
                  </p>
                )}

                {/* Options */}
                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2 text-[#6b7280]">
                    <input
                      type="checkbox"
                      className="accent-[#0B2239]"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      style={{ fontFamily: "'Lora', serif" }}
                    />
                    {t("rememberMe")}
                  </label>
                  <a
                    href={`/${locale}/forgot-password`}
                    className="font-semibold text-[#0B2239] hover:underline"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {t("forgot")}
                  </a>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#0B2239] py-3 font-bold text-white shadow-lg shadow-[#0B2239]/25 transition hover:bg-[#0c2b40] disabled:opacity-60"
                >
                  {loading ? t("loading") : t("loginBtn")}
                </button>

                <p
                  className="text-center text-sm text-[#6b7280]"
                  style={{ fontFamily: "'Lora', serif" }}
                >
                  {t("noAccount")}{" "}
                  <Link
                    href={`/${locale}/register`}
                    className="font-semibold text-[#0B2239] hover:underline"
                    style={{ fontFamily: "'Lora', serif" }}
                  >
                    {t("goRegister")}
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
