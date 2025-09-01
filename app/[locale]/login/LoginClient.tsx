"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader"; // ✅ Import du header

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email");
    const password = formData.get("password");

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include", // cookie HttpOnly
          body: JSON.stringify({ email, password, rememberMe: remember }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        setError(data?.message || t("errors.loginFailed"));
      } else {
        // ✅ on garde tes clés et on ajoute mtr_role (pour le header)
        const role = data.role || data.user?.role || "";
        try {
          localStorage.setItem("userRole", role);
          localStorage.setItem("mtr_role", role);
          localStorage.setItem("rememberMe", remember ? "1" : "0");
        } catch {}

        if (role === "admin") {
          router.push(`/${locale}/admin`);
        } else if (role === "client") {
          // ✅ Home locale en mode client (conserve le header client partout)
          router.push(`/${locale}?client=1`);
          // si tu préfères l’espace client au lieu de la home, remplace par :
          // router.push(`/${locale}/client`);
        } else {
          router.push(`/${locale}/home`);
        }
      }
    } catch {
      setError(t("errors.network"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      {/* ✅ Header */}
      <SiteHeader onLogout={undefined} />

      <div className="flex items-center justify-center px-4 py-10">
        <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 overflow-hidden rounded-2xl shadow-2xl border border-[#ffb400]/50 bg-white">
          {/* Left panel */}
          <div className="hidden lg:flex relative items-center justify-center p-10">
            <Image
              src="/about1.png"
              alt="Ressorts"
              fill
              sizes="(min-width:1024px) 50vw, 100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-[#002147]/30" />
            <div className="relative text-center text-white space-y-6 max-w-sm">
              <div className="mx-auto rounded-3xl inline-flex">
                <Image
                  src="/logoN.png"
                  alt="MTR"
                  width={490}
                  height={150}
                  style={{ marginTop: "-60px" }}
                  priority
                />
              </div>
              <h2
                className="text-4xl font-extrabold leading-tight text-[#002147]"
                style={{ fontFamily: "'Lora', serif", marginTop: "-60px" }}
              >
                {t("joinClientSpace")}
              </h2>
              <p
                className="text-[#002147]/80 font-bold text-lg"
                style={{ fontFamily: "'Lora', serif", marginTop: "80px" }}
              >
                {t("promoText")}
              </p>
            </div>
          </div>

          {/* Form panel */}
          <div className="p-8 sm:p-10 lg:p-12">
            <div className="mx-auto w-full max-w-md">
              <h1
                className="text-3xl sm:text-4xl font-extrabold text-center text-[#002147]"
                style={{ fontFamily: "'Lora', serif" }}
              >
                {t("loginTitle")}
              </h1>

              <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
                {/* Email */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block font-semibold text-[#002147]"
                  >
                    {t("email")} <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    className="w-full rounded-xl border border-[#ddd] bg-white px-4 py-3 text-[#002147] placeholder-[#555] outline-none focus:border-[#ffb400] focus:ring-2 focus:ring-[#ffb400]/25 transition"
                    placeholder={t("placeholders.email")}
                    required
                  />
                </div>

                {/* Password */}
                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="block font-semibold text-[#002147]"
                  >
                    {t("password")} <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="password"
                      name="password"
                      type={showPwd ? "text" : "password"}
                      autoComplete="current-password"
                      className={`w-full rounded-xl border border-[#ddd] bg-white py-3 text-[#002147] placeholder-[#555] outline-none focus:border-[#ffb400] focus:ring-2 focus:ring-[#ffb400]/25 transition ${
                        locale === "ar" ? "pl-10 pr-4" : "pr-10 pl-4"
                      }`}
                      placeholder="********"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPwd((v) => !v)}
                      className={`absolute inset-y-0 my-auto px-3 ${
                        locale === "ar" ? "left-3" : "right-3"
                      }`}
                      style={{ color: "#555" }}
                      aria-label="Afficher / masquer le mot de passe"
                    >
                      {showPwd ? <FaEyeSlash /> : <FaEye />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-red-600 text-sm text-center font-semibold">
                    {error}
                  </p>
                )}

                {/* Options */}
                <div className="flex items-center justify-between text-sm">
                  <label className="inline-flex items-center gap-2 text-[#555]">
                    <input
                      type="checkbox"
                      className="accent-[#002147]"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                    />
                    {t("rememberMe")}
                  </label>
                  <a
                    href={`/${locale}/forgot-password`}
                    className="font-semibold hover:underline text-[#002147] "
                  >
                    {t("forgot")}
                  </a>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-xl bg-[#002147] hover:bg-[#003366] text-white font-bold py-3 shadow-lg shadow-[#002147]/30 transition disabled:opacity-60"
                >
                  {loading ? t("loading") : t("loginBtn")}
                </button>

                <p className="text-center text-sm text-[#555]">
                  {t("noAccount")}{" "}
                  <Link
                    href={`/${locale}/register`}
                    className="font-semibold hover:underline text-[#002147] "
                  >
                    {t("goRegister")}
                  </Link>
                </p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
