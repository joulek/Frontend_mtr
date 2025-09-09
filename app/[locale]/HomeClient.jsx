"use client";

import { useEffect, useState, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { PhoneCall, Mail, MapPin, CheckCircle, Send, Factory, Cog, Wrench } from "lucide-react";
import { useTranslations, useLocale } from "next-intl";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";

/* ---------------------------- API backend ---------------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* ---------- Anim helpers ---------- */
const vSection = { hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } } };
const vStagger = { hidden: {}, show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } } };
const vItemUp = { hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } } };
const vLeft = { hidden: { opacity: 0, x: -30 }, show: { opacity: 1, x: 0, transition: { duration: 0.55 } } };
const vRight = { hidden: { opacity: 0, x: 30 }, show: { opacity: 1, x: 0, transition: { duration: 0.55 } } };
const vZoom = { hidden: { opacity: 0, scale: 0.96 }, show: { opacity: 1, scale: 1, transition: { duration: 0.6 } } };

/* ---------- Label flottant ---------- */
const labelFloat =
  "pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 bg-white px-1 text-sm text-slate-500 transition-all duration-150 " +
  "peer-placeholder-shown:top-1/2 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:text-base peer-placeholder-shown:text-slate-400 " +
  "peer-focus:-top-2 peer-focus:translate-y-0 peer-focus:text-xs peer-focus:text-[#F5B301] peer-[&:not(:placeholder-shown)]:-top-2 peer-[&:not(:placeholder-shown)]:text-xs";

/* ---------- Slugify helper ---------- */
function slugify(s = "") {
  return s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "") // enlève les accents (é → e)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function HomeClient() {
  const t = useTranslations("home");
  const locale = useLocale(); // ✅ locale fiable fournie par next-intl


  // traductions riches
  const rich = (key) => t.rich(key, { strong: (chunks) => <strong>{chunks}</strong> });

  const [form, setForm] = useState({ nom: "", email: "", sujet: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const yearsExp = new Date().getFullYear() - 1994;

  /* ------------------ Récupération des catégories ------------------ */
  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);

  // timers pour auto-hide messages
  const okTimer = useRef(null);
  const errTimer = useRef(null);
  useEffect(() => {
    if (!okMsg) return;
    if (okTimer.current) clearTimeout(okTimer.current);
    okTimer.current = setTimeout(() => setOkMsg(""), 3000); // 3 ثواني
    return () => { if (okTimer.current) clearTimeout(okTimer.current); };
  }, [okMsg]);

  useEffect(() => {
    if (!errMsg) return;
    if (errTimer.current) clearTimeout(errTimer.current);
    errTimer.current = setTimeout(() => setErrMsg(""), 4000); // 4 ثواني
    return () => { if (errTimer.current) clearTimeout(errTimer.current); };
  }, [errMsg]);


  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch(`${API}/categories`, { cache: "no-store", signal: controller.signal });
        const data = await res.json().catch(() => ({}));
        if (!alive) return;
        setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => {
      alive = false;
      if (!controller.signal.aborted) controller.abort();
    };
  }, []);

  /* --------------------------- Helpers i18n --------------------------- */
  const pickName = (cat, loc) =>
    (cat?.translations && (cat.translations[loc] || cat.translations.fr || cat.translations.en)) ||
    cat?.label ||
    "";

  const submitContact = async (e) => {
    e.preventDefault();
    setOkMsg("");
    setErrMsg("");
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/contact`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data?.message || `HTTP ${res.status}`);
      setOkMsg(t("contact.ok"));
      setForm({ nom: "", email: "", sujet: "", message: "" });
    } catch (err) {
      setErrMsg(t("contact.errPrefix") + (err?.message || ""));
    } finally {
      setLoading(false);
    }
  };

  /* --------------------------- Petits composants --------------------------- */
  function AutoCarousel({ images = [], interval = 4000 }) {
    const [index, setIndex] = useState(0);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
      if (images.length <= 1 || paused) return;
      const tmr = setInterval(() => setIndex((i) => (i + 1) % images.length), interval);
      return () => clearInterval(tmr);
    }, [images.length, interval, paused]);

    const go = (dir) => setIndex((i) => (i + (dir === "next" ? 1 : -1) + images.length) % images.length);

    return (
      <div
        className="relative h-[420px] overflow-hidden rounded-3xl shadow-xl md:h-[560px] select-none"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        {images.map((src, i) => (
          <div key={src} className="absolute inset-0">
            <Image
              src={src}
              alt={`Slide ${i + 1}`}
              fill
              sizes="(max-width:768px) 100vw, 40vw"
              priority={i === 0}
              className={`object-cover transition-opacity duration-700 ${i === index ? "opacity-100" : "opacity-0"}`}
            />
          </div>
        ))}

        {images.length > 1 && (
          <>
            <button
              onClick={() => go("prev")}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-3 py-2 text-white backdrop-blur hover:bg-black/50"
              aria-label="Prev"
            >
              ‹
            </button>
            <button
              onClick={() => go("next")}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/35 px-3 py-2 text-white backdrop-blur hover:bg-black/50"
              aria-label="Next"
            >
              ›
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`h-2.5 w-2.5 rounded-full ring-1 ring-white/60 ${i === index ? "bg-[#F5B301]" : "bg-white/50 hover:bg-white/80"}`}
                aria-label={`Go to slide ${i + 1}`}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  function CategoryTilePro({ title, imgUrl, alt, href }) {
    return (
      <Link href={href} className="group relative block h-[340px] overflow-hidden rounded-2xl shadow-lg">
        <img
          src={imgUrl}
          alt={alt || title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
        <div className="absolute inset-x-0 bottom-0 p-3 transition-opacity duration-300 group-hover:opacity-0">
          <span className="inline-block rounded-md bg-black/60 px-3 py-1 text-xs font-semibold text-white/90 backdrop-blur">
            {title}
          </span>
        </div>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <div className="relative w-[86%] max-w-[520px]">
            <div className="rounded-xl bg-white px-8 py-6 text-center shadow-2xl ring-1 ring-black/5">
              <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#F5B301]">MTR</div>
              <h3 className="mt-2 text-2xl font-extrabold leading-snug text-slate-900">{title}</h3>
            </div>
            <div className="-mt-3 flex justify-center">
              <div className="inline-flex min-w-[280px] items-center justify-center rounded-xl bg-[#F5B301] px-6 py-4 shadow-xl">
                <span className="pointer-events-none text-sm font-extrabold uppercase tracking-wide text-[#0B2239] underline underline-offset-4">
                  {t("specialties.viewDetail")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  /* -------------------------------- RENDER -------------------------------- */
  const rawBullets = typeof t.raw === "function" ? t.raw("presentation.bullets") : undefined;
  const bullets = Array.isArray(rawBullets) ? rawBullets : [];

  return (
    <div className="min-h-screen bg-white text-slate-800">
      <SiteHeader />

      {/* HERO */}
      <section
        id="accueil"
        className="relative -mt-10 min-h-[86vh] flex items-center justify-center bg-cover bg-center text-white"
        style={{ backgroundImage: "url('/hero.jpg')" }}
      >
        <div className="absolute inset-0 bg-black/50" />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.7 } }}
          className="relative z-10 mx-auto max-w-4xl px-4 py-32 text-center"
        >
          <h1 className="text-4xl font-extrabold leading-tight md:text-6xl">{t("hero.title")}</h1>
          <p className="mt-6 text-lg text-gray-200 md:text-xl">{rich("hero.subtitle")}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <button
              onClick={() => document.getElementById("contact")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full bg-[#F5B301] px-6 py-3 font-semibold text-[#0B2239] hover:brightness-95"
            >
              {t("hero.ctaContact")}
            </button>
            <button
              onClick={() => document.getElementById("specialites")?.scrollIntoView({ behavior: "smooth" })}
              className="rounded-full border border-[#F5B301] px-6 py-3 font-semibold text-[#F5B301] hover:bg-[#F5B301] hover:text-[#0B2239]"
            >
              {t("hero.ctaSpecialties")}
            </button>
          </div>
        </motion.div>
      </section>

      {/* PRÉSENTATION */}
      <motion.section id="presentation" className="bg-white py-16 md:py-24" variants={vSection} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="grid gap-12 md:grid-cols-5" variants={vStagger} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
            <motion.div className="md:col-span-2" variants={vItemUp}>
              <div className="sticky top-24">
                <AutoCarousel images={["/soc1.png", "/soc2.png"]} />
                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-3">
                    <div className="text-2xl font-extrabold text-[#0B2239]">{yearsExp}</div>
                    <div className="text-[11px] uppercase text-slate-500">{t("presentation.years")}</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-3">
                    <div className="text-2xl font-extrabold text-[#0B2239]">0,1–10</div>
                    <div className="text-[11px] uppercase text-slate-500">{t("presentation.wireRange")}</div>
                  </div>
                  <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white py-3">
                    <div className="text-2xl font-extrabold text-[#0B2239]">2D/3D</div>
                    <div className="text-[11px] uppercase text-slate-500">{t("presentation.grids")}</div>
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div className="md:col-span-3" variants={vItemUp}>
              <motion.div className="mb-8" variants={vItemUp}>
                <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-5xl">{t("presentation.punch")}</h2>
                <div className="mt-4 h-1 w-20 rounded-full bg-[#F5B301]" />
              </motion.div>

              <motion.div className="grid gap-6" variants={vStagger}>
                <motion.article variants={vItemUp} className="rounded-3xl border-2 border-[#F4D06F] bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#0B2239]">{t("presentation.card1Title")}</h3>
                  <p className="leading-relaxed text-slate-700">{rich("presentation.card1Text1")}</p>
                </motion.article>

                <motion.article variants={vItemUp} className="rounded-3xl border-2 border-[#F5B301] bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#0B2239]">{t("presentation.card2Title")}</h3>
                  <p className="leading-relaxed text-slate-700">{rich("presentation.card2Text1")}</p>
                  <p className="mt-3 leading-relaxed text-slate-700">{rich("presentation.card2Text2")}</p>
                </motion.article>

                <motion.article variants={vItemUp} className="rounded-3xl border-2 border-[#F5B301] bg-white p-6 shadow-sm">
                  <h3 className="mb-2 text-lg font-bold text-[#0B2239]">{t("presentation.card3Title")}</h3>
                  <p className="leading-relaxed text-slate-700">{t("presentation.card3Text1")}</p>
                </motion.article>
              </motion.div>

              <motion.div className="mt-8 grid gap-3 sm:grid-cols-2" variants={vStagger}>
                {bullets.map((txt, i) => (
                  <motion.div key={i} variants={vItemUp} className="flex items-center gap-2 text-sm font-medium text-[#0B2239]">
                    <span className="inline-block h-2 w-2 rounded-full bg-[#F5B301]" /> {txt}
                  </motion.div>
                ))}
              </motion.div>

              <motion.div className="mt-8 flex flex-wrap gap-4" variants={vItemUp}>
                <a href="#specialites" className="rounded-full bg-[#F5B301] px-6 py-3 font-semibold text-[#0B2239] shadow hover:brightness-95">
                  {t("presentation.ctaProducts")}
                </a>
                <a href="#contact" className="rounded-full border border-[#0B2239] px-6 py-3 font-semibold text-[#0B2239] hover:bg-[#0B2239] hover:text-white">
                  {t("presentation.ctaAbout")}
                </a>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </motion.section>

      {/* SPÉCIALITÉS */}
      <motion.section id="specialites" className="bg-slate-50 py-16 md:py-24" variants={vSection} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mb-12 text-center" variants={vItemUp}>
            <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-4xl">{t("specialties.title")}</h2>
            <p className="mt-3 text-slate-600">{t("specialties.subtitle")}</p>
          </motion.div>

          {loadingCats && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="h-[200px] rounded-2xl bg-slate-200 animate-pulse" />
              ))}
            </div>
          )}

          {!loadingCats &&
            categories.length > 0 &&
            (() => {
              const count = categories.length;
              const gridCols = count === 4 ? "sm:grid-cols-2 lg:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-3";
              return (
                <motion.div className={`grid gap-6 ${gridCols}`} variants={vStagger} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.15 }}>
                  {categories.map((c) => {
                    const title = pickName(c, locale);
                    const raw = c?.image?.url || "";
                    const imgUrl = raw.startsWith("http") ? raw : `${BACKEND}${raw.startsWith("/") ? "" : "/"}${raw}`;
                    const alt = c?.image?.[`alt_${locale}`] || c?.image?.alt_fr || title;
                    const slug = (c?.slug && c.slug.trim()) || slugify(title); // ✅ slug backend prioritaire, sinon propre
                    const href = `/${locale}/produits/${slug}`;
                    return (
                      <motion.div key={c._id || title} variants={vItemUp}>
                        <CategoryTilePro title={title} imgUrl={imgUrl} alt={alt} href={href} />
                      </motion.div>
                    );
                  })}
                </motion.div>
              );
            })()}

          {!loadingCats && categories.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">{t("specialties.none")}</div>
          )}
        </div>
      </motion.section>

      {/* A PROPOS */}
      <motion.section id="apropos" className="relative bg-white py-16 md:py-24" variants={vSection} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_40%_at_15%_10%,rgba(245,179,1,0.06),transparent),radial-gradient(60%_40%_at_85%_80%,rgba(11,34,57,0.05),transparent)]" />

        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mx-auto mb-16 md:mb-20 max-w-3xl text-center" variants={vItemUp}>
            <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-4xl">{t("about.title")}</h2>
            <p className="mt-3 text-slate-600">{t("about.subtitle")}</p>
          </motion.div>

          <motion.div variants={vStagger} className="grid items-stretch gap-6 md:-mt-10 md:grid-cols-3">
            {/* Carte 1 */}
            <motion.article variants={vItemUp} className="group relative flex h-full flex-col rounded-3xl border border-[#F5B301] bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0B2239]/5">
                  <Factory className="h-5 w-5 text-[#F5B301]" />
                </span>
                <h3 className="text-xl font-bold text-[#0B2239]">{t("about.card1Title")}</h3>
              </div>

              <ul className="mx-auto max-w-sm space-y-3 text-[15px] leading-7 text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li1")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li2")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li3")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li4")}</span>
                </li>
              </ul>
            </motion.article>

            {/* Carte 2 */}
            <motion.article variants={vItemUp} className="group relative flex h-full flex-col rounded-3xl border border-[#F5B301] bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0B2239]/5">
                  <Cog className="h-5 w-5 text-[#F5B301]" />
                </span>
                <h3 className="text-xl font-bold text-[#0B2239]">{t("presentation.card2Title")}</h3>
              </div>

              <ul className="mx-auto max-w-sm space-y-3 text-[15px] leading-7 text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li5")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li6")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li7")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li8")}</span>
                </li>
              </ul>
            </motion.article>

            {/* Carte 3 */}
            <motion.article variants={vItemUp} className="group relative flex h-full flex-col rounded-3xl border border-[#F5B301] bg-white p-6 shadow-sm md:p-8">
              <div className="mb-5 inline-flex items-center gap-3">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#0B2239]/5">
                  <Wrench className="h-5 w-5 text-[#F5B301]" />
                </span>
                <h3 className="text-xl font-bold text-[#0B2239]">{t("presentation.card3Title")}</h3>
              </div>

              <ul className="mx-auto max-w-sm space-y-3 text-[15px] leading-7 text-slate-700">
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li9")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li10")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li11")}</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-[#F5B301]" />
                  <span>{rich("about.li12")}</span>
                </li>
              </ul>
            </motion.article>
          </motion.div>
        </div>
      </motion.section>

      {/* CONTACT */}
      <motion.section id="contact" className="relative overflow-hidden bg-slate-50 py-20" variants={vSection} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.2 }}>
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mx-auto mb-12 max-w-3xl text-center" variants={vItemUp}>
            <h2 className="text-4xl font-extrabold text-[#0B2239]">{t("contact.title")}</h2>
            <p className="mt-3 text-slate-600">{t("contact.subtitle")}</p>
          </motion.div>

          <div className="grid gap-8 md:grid-cols-3">
            <motion.div className="md:col-span-2" variants={vLeft}>
              <form onSubmit={submitContact} className="group rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-slate-200 backdrop-blur">
                <div className="grid gap-5 sm:grid-cols-2">
                  <div className="relative">
                    <input
                      id="nom"
                      name="nom"
                      value={form.nom}
                      onChange={(e) => setForm({ ...form, nom: e.target.value })}
                      className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                      placeholder=" "
                      required
                    />
                    <label htmlFor="nom" className={labelFloat}>
                      {t("contact.name")}
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                      placeholder=" "
                      required
                    />
                    <label htmlFor="email" className={labelFloat}>
                      {t("contact.email")}
                    </label>
                  </div>
                  <div className="relative sm:col-span-2">
                    <input
                      id="sujet"
                      name="sujet"
                      value={form.sujet}
                      onChange={(e) => setForm({ ...form, sujet: e.target.value })}
                      className="peer w-full rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                      placeholder=" "
                      required
                    />
                    <label htmlFor="sujet" className={labelFloat}>
                      {t("contact.subject")}
                    </label>
                  </div>
                  <div className="relative sm:col-span-2">
                    <textarea
                      id="message"
                      name="message"
                      rows={6}
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      className="peer w-full resize-none rounded-2xl border border-slate-300 bg-transparent px-4 py-4 outline-none ring-[#F5B301] focus:border-[#F5B301] focus:ring-2"
                      placeholder=" "
                      required
                    />
                    <label htmlFor="message" className={labelFloat}>
                      {t("contact.message")}
                    </label>
                  </div>
                </div>
                <div className="mt-4 space-y-2" aria-live="polite">
                  {okMsg && (
                    <p className="rounded-lg bg-green-50 px-3 py-2 text-green-700 ring-1 ring-green-200 transition-opacity duration-300">
                      {okMsg}
                    </p>
                  )}
                  {errMsg && (
                    <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700 ring-1 ring-red-200 transition-opacity duration-300">
                      {errMsg}
                    </p>
                  )}
                </div>


                <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3 text-sm text-slate-500">
                    <CheckCircle className="h-5 w-5 text-[#F5B301]" />
                    <span>{t("contact.sla")}</span>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-2 rounded-full bg-[#F5B301] px-7 py-3 font-semibold text-[#0B2239] shadow hover:brightness-95 disabled:opacity-60"
                  >
                    {loading ? t("contact.sending") : t("contact.send")} <Send className="h-4 w-4" />
                  </button>
                </div>
              </form>
            </motion.div>

            <motion.div className="grid gap-5" variants={vRight}>
              <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#0B2239]/5 p-3">
                    <PhoneCall className="h-5 w-5 text-[#F5B301]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("contact.tel")}</p>
                    <p className="font-semibold text-[#0B2239]">+216 98 333 883</p>
                    <a
                      href="tel:+21698333883"
                      className="mt-3 inline-block rounded-full border border-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]"
                    >
                      {t("contact.telBtn")}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#0B2239]/5 p-3">
                    <Mail className="h-5 w-5 text-[#F5B301]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("contact.mail")}</p>
                    <p className="font-semibold text-[#0B2239]">contact@mtr.tn</p>
                    <a
                      href="mailto:contact@mtr.tn"
                      className="mt-3 inline-block rounded-full border border-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]"
                    >
                      {t("contact.mailBtn")}
                    </a>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-[#0B2239]/5 p-3">
                    <MapPin className="h-5 w-5 text-[#F5B301]" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">{t("contact.address")}</p>
                    <p className="font-semibold text-[#0B2239]">{t("contact.addrValue")}</p>
                    <a
                      href="#localisation"
                      className="mt-3 inline-block rounded-full border border-[#F5B301] px-4 py-2 text-sm font-semibold text-[#0B2239] hover:bg-[#F5B301] hover:text-[#0B2239]"
                    >
                      {t("contact.mapBtn")}
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* LOCALISATION */}
      <motion.section id="localisation" className="relative bg-white py-16 md:py-24" variants={vSection} initial="hidden" whileInView="show" viewport={{ once: false, amount: 0.25 }}>
        <div className="mx-auto max-w-7xl px-4">
          <motion.div className="mb-8 text-center" variants={vItemUp}>
            <h2 className="text-3xl font-extrabold text-[#0B2239] md:text-4xl">{t("map.title")}</h2>
            <p className="mt-3 text-slate-600">{t("map.subtitle")}</p>
          </motion.div>
          <motion.div variants={vZoom} className="relative overflow-hidden rounded-2xl shadow-xl ring-1 ring-slate-200">
            <iframe
              title="Localisation MTR"
              src="https://www.google.com/maps?q=34.8256683,10.7390825&hl=fr&z=18&output=embed"
              className="h-[70vh] w-full md:h-[75vh]"
              style={{ border: 0 }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
            <a
              href="https://www.google.com/maps/place/Manufacture+MTR/"
              target="_blank"
              rel="noopener noreferrer"
              className="absolute bottom-4 left-4 rounded-full bg-[#F5B301] px-5 py-2 font-semibold text-[#0B2239] shadow-lg hover:brightness-95"
            >
              {t("map.openGmaps")}
            </a>
          </motion.div>
        </div>
      </motion.section>

      <SiteFooter locale={locale} />
    </div>
  );
}
