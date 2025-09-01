"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { motion, useScroll, useTransform } from "framer-motion";

/* -------------------- Consts -------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000").replace(/\/$/, "");
const API = `${BACKEND}/api`;
const AUTOPLAY_MS = 4000; // vitesse autoplay

/* Helpers */
function slugify(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
function pickName(item, locale = "fr") {
  return (locale?.startsWith("en") ? item?.name_en : item?.name_fr) || item?.name_fr || item?.name_en || "";
}
const toUrl = (src = "") => (src?.startsWith("http") ? src : `${BACKEND}${src?.startsWith("/") ? "" : "/"}${src}`);

/* Forcer l’affichage liste (pas d’auto-open) pour certains slugs */
const FORCE_LIST_SLUGS = new Set(["ressorts"]);

/* -------------------- Anim -------------------- */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay } },
});

/* =======================================================
   Carousel (autoplay + pause hover + clavier)
   ======================================================= */
function Carousel({ items, ariaLabel = "Carrousel", renderItem }) {
  const viewportRef = useRef(null);
  const slideRef = useRef(null);
  const [slideW, setSlideW] = useState(0);
  const [index, setIndex] = useState(0);
  const autoplayRef = useRef(null);
  const isHoverRef = useRef(false);

  // Mesure slide
  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (slideRef.current) setSlideW(slideRef.current.offsetWidth + 24); // gap ~24
    });
    if (slideRef.current) {
      setSlideW(slideRef.current.offsetWidth + 24);
      ro.observe(slideRef.current);
    }
    return () => ro.disconnect();
  }, [items.length]);

  // Sync index au scroll
  const onScroll = useCallback(() => {
    const vp = viewportRef.current;
    if (!vp || !slideW) return;
    const i = Math.round(vp.scrollLeft / slideW);
    setIndex(Math.max(0, Math.min(i, items.length - 1)));
  }, [slideW, items.length]);

  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.addEventListener("scroll", onScroll, { passive: true });
    return () => vp.removeEventListener("scroll", onScroll);
  }, [onScroll]);

  const scrollTo = (i) => {
    const vp = viewportRef.current;
    if (!vp) return;
    const clamped = ((i % items.length) + items.length) % items.length; // wrap
    vp.scrollTo({ left: clamped * (slideW || vp.clientWidth), behavior: "smooth" });
  };

  const next = () => scrollTo(index + 1);
  const prev = () => scrollTo(index - 1);

  // Autoplay (pause hover / blur)
  const startAuto = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (items.length <= 1) return;
    autoplayRef.current = setInterval(() => {
      if (!isHoverRef.current) next();
    }, AUTOPLAY_MS);
  }, [items.length]);

  useEffect(() => {
    startAuto();
    return () => autoplayRef.current && clearInterval(autoplayRef.current);
  }, [startAuto]);

  useEffect(() => {
    const onBlur = () => autoplayRef.current && clearInterval(autoplayRef.current);
    const onFocus = () => startAuto();
    window.addEventListener("blur", onBlur);
    window.addEventListener("focus", onFocus);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("focus", onFocus);
    };
  }, [startAuto]);

  // Clavier
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, slideW]);

  if (!items?.length) return null;

  return (
    <div className="relative">
      <div
        ref={viewportRef}
        aria-label={ariaLabel}
        className="flex gap-6 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth [scrollbar-width:none] [-ms-overflow-style:none]"
        style={{ scrollBehavior: "smooth" }}
        onMouseEnter={() => { isHoverRef.current = true; }}
        onMouseLeave={() => { isHoverRef.current = false; startAuto(); }}
      >
        <style jsx>{`div::-webkit-scrollbar{display:none;}`}</style>
        {items.map((it, i) => (
          <div
            key={i}
            ref={i === 0 ? slideRef : undefined}
            className="snap-start shrink-0 w-[88%] sm:w-[62%] lg:w-[46%] xl:w-[40%]"
          >
            {renderItem(it, i)}
          </div>
        ))}
      </div>

      {/* Contrôles */}
      {items.length > 1 && (
        <>
          <button
            aria-label="Précédent"
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-30 grid place-items-center h-11 w-11 rounded-full bg-white/90 shadow ring-1 ring-slate-200 hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M15 6l-6 6 6 6" stroke="#0B2239" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <button
            aria-label="Suivant"
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-30 grid place-items-center h-11 w-11 rounded-full bg-white/90 shadow ring-1 ring-slate-200 hover:bg-white"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="#0B2239" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        </>
      )}

      {/* Dots */}
      {items.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              aria-label={`Aller à l’élément ${i + 1}`}
              onClick={() => scrollTo(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-[#0B2239]" : "w-2.5 bg-slate-300 hover:bg-slate-400"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* =======================================================
   Page
   ======================================================= */
export default function ProductsByCategoryPage() {
  const { locale, slug } = useParams(); // <- pas de types en JSX
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [error, setError] = useState("");
  const [didAutoOpen, setDidAutoOpen] = useState(false);

  // fetch catégories
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingCats(true);
        const res = await fetch(`${API}/categories`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setCategories(Array.isArray(data?.categories) ? data.categories : []);
      } catch {
        if (alive) setCategories([]);
      } finally {
        if (alive) setLoadingCats(false);
      }
    })();
    return () => { alive = false; controller.abort(); };
  }, []);

  const currentCategory = useMemo(() => {
    if (!categories?.length || !slug) return null;
    return (
      categories.find((c) => {
        const title = (c?.translations?.[locale] || c?.translations?.fr || c?.translations?.en || c?.label || "").trim();
        const s = c?.slug ? String(c.slug) : slugify(title);
        return s === slug;
      }) || null
    );
  }, [categories, slug, locale]);

  // fetch produits
  useEffect(() => {
    if (!currentCategory?._id) return;
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingProds(true); setError("");
        const res = await fetch(`${API}/produits/by-category/${currentCategory._id}`, { cache: "no-store", signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (alive) setProducts(Array.isArray(data) ? data : []);
      } catch {
        if (alive) setError("Erreur lors du chargement des produits.");
      } finally {
        if (alive) setLoadingProds(false);
      }
    })();
    return () => { alive = false; controller.abort(); };
  }, [currentCategory?._id]);

  const pageTitle =
    currentCategory?.translations?.[locale] ||
    currentCategory?.translations?.fr ||
    currentCategory?.translations?.en ||
    currentCategory?.label ||
    String(slug || "").replace(/-/g, " ");

  // auto-open si un seul produit
  useEffect(() => {
    const forceList = FORCE_LIST_SLUGS.has(String(slug));
    if (!loadingProds && !loadingCats && !error) {
      if (!forceList && products.length === 1) {
        setDidAutoOpen(true);
        router.replace(`/${locale}/produits/${slug}/${products[0]._id}`);
      }
    }
  }, [loadingProds, loadingCats, error, products, slug, locale, router]);

  /* Micro-parallax header */
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, -24]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 0.98]);

  return (
    <>
      <SiteHeader />
      <main className="bg-slate-50 min-h-screen">
        {/* Hero */}
        <motion.section ref={heroRef} style={{ y, scale }} className="relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 pt-10">
            <motion.nav {...fadeUp(0.05)} className="text-sm text-slate-500">
              <button onClick={() => router.push(`/${locale}`)} className="hover:underline">Accueil</button>
              <span className="mx-2">/</span>
              <span className="text-slate-700 font-semibold capitalize">{pageTitle}</span>
            </motion.nav>

            <motion.h1 {...fadeUp(0.1)} className="mt-3 text-3xl md:text-4xl font-extrabold text-[#0B2239] capitalize tracking-tight">
              {pageTitle}
            </motion.h1>

            <motion.div {...fadeUp(0.18)} className="mt-4 h-[6px] w-36 rounded-full bg-gradient-to-r from-[#F5B301] via-[#F5B301] to-transparent" />
          </div>

          {/* décor */}
          <div className="pointer-events-none absolute inset-0 -z-10">
            <div className="absolute -top-16 -right-24 h-56 w-56 rounded-full bg-[#F5B301]/20 blur-3xl" />
            <div className="absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-[#0B2239]/10 blur-3xl" />
          </div>
        </motion.section>

        <section className="mx-auto max-w-7xl px-4 pb-20 pt-6">
          {/* états */}
          {(loadingCats || loadingProds || didAutoOpen) && (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="overflow-hidden rounded-3xl bg-white ring-1 ring-slate-200">
                  <div className="h-56 bg-slate-200 animate-pulse" />
                </div>
              ))}
            </div>
          )}

          {error && !didAutoOpen && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
          )}

          {/* Carousel — image seule + label + overlay au survol */}
          {!loadingCats && !loadingProds && !error && !didAutoOpen && products.length > 0 && (
            <motion.div {...fadeUp(0.06)}>
              <Carousel
                items={products}
                ariaLabel={`Produits de la catégorie ${pageTitle}`}
                renderItem={(p) => {
                  const title = pickName(p, locale);
                  const img0 = Array.isArray(p.images) && p.images[0] ? p.images[0] : "/placeholder.png";
                  const img = toUrl(img0);
                  const href = `/${locale}/produits/${slug}/${p._id}`;

                  return (
                    <article className="group relative h-64 sm:h-72 lg:h-80 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
                      {/* Image */}
                      <Image
                        src={img}
                        alt={title}
                        fill
                        sizes="(max-width:640px) 88vw, (max-width:1024px) 62vw, 40vw"
                        className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110"
                      />

                      {/* Label bas-gauche (identification) */}
                      <div className="absolute left-3 bottom-3 z-20 transition-opacity duration-300 group-hover:opacity-0">
                        <span className="inline-flex items-center rounded-lg bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white shadow backdrop-blur-sm">
                          {title}
                        </span>
                      </div>

                      {/* overlay + cartouche Home au survol */}
                      <div className="absolute inset-0 z-10 bg-black/40 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                        <div className="relative w-[86%] max-w-[520px]">
                          <div className="rounded-xl bg-white px-8 py-6 text-center shadow-2xl ring-1 ring-black/5">
                            <div className="text-[11px] font-extrabold uppercase tracking-[.12em] text-[#F5B301]">MTR</div>
                            <h3 className="mt-2 text-2xl font-extrabold leading-snug text-slate-900">{title}</h3>
                          </div>
                          <div className="-mt-3 flex justify-center">
                            <span className="pointer-events-none inline-flex min-w-[280px] items-center justify-center rounded-xl bg-[#F5B301] px-6 py-4 shadow-xl">
                              <span className="text-sm font-extrabold uppercase tracking-wide text-[#0B2239] underline underline-offset-4">
                                Voir détail →
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Toute la carte cliquable */}
                      <a href={href} className="absolute inset-0 z-30" aria-label={`Voir détail: ${title}`} />
                    </article>
                  );
                }}
              />
            </motion.div>
          )}

          {!loadingCats && !loadingProds && !error && !didAutoOpen && products.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h4 className="text-[#0B2239] font-semibold">Aucun produit</h4>
              <p className="text-sm text-slate-600 mt-1">Aucun produit trouvé pour cette catégorie.</p>
            </div>
          )}
        </section>
      </main>
    </>
  );
}
