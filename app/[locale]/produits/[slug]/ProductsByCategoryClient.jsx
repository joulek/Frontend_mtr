"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import { motion, useScroll, useTransform } from "framer-motion";

/* -------------------- Consts -------------------- */
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");
const API = `${BACKEND}/api`;
const BACKEND_HOST = "backend-mtr.onrender.com";
const AUTOPLAY_MS = 4000;

/* Helpers */
function slugify(s = "") {
  return String(s)
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "");
}
function humanizeTitle(s = "") {
  return String(s)
    .replace(/-/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
function pickName(item, locale = "fr") {
  return (locale?.startsWith("en") ? item?.name_en : item?.name_fr) || item?.name_fr || item?.name_en || "";
}

/** URL image sûre (accepte string/objet) */
function toUrlSafe(input = "") {
  try {
    let src = input;
    if (!src) return "/placeholder.png";
    if (typeof src === "object") src = src?.url || src?.src || src?.path || src?.filename || src?.fileName || src?.name || "";
    if (!src) return "/placeholder.png";

    let s = String(src).trim().replace(/\\/g, "/");
    if (/^(data|blob):/i.test(s)) return s;
    if (s.startsWith("/placeholder") || s.startsWith("/images")) return s;

    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);
      if (/(^|\.)(localhost|127\.0\.0\.1)$/i.test(u.hostname)) {
        u.protocol = "https:"; u.hostname = BACKEND_HOST; u.port = "";
        if (!u.pathname.startsWith("/uploads/")) u.pathname = `/uploads/${u.pathname.replace(/^\/+/, "")}`;
        return u.toString();
      }
      if (u.hostname === BACKEND_HOST && u.protocol !== "https:") { u.protocol = "https:"; u.port = ""; return u.toString(); }
      return u.toString();
    }
    const path = s.startsWith("/uploads/") ? s : `/uploads/${s.replace(/^\/+/, "")}`;
    return `https://${BACKEND_HOST}${path}`;
  } catch { return "/placeholder.png"; }
}

/* Forcer liste */
const FORCE_LIST_SLUGS = new Set(["ressorts"]);

/* Anim */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut", delay } },
});

/* -------------------- Carousel -------------------- */
function Carousel({ items, ariaLabel = "Carrousel", renderItem }) {
  const viewportRef = useRef(null);
  const slideRef = useRef(null);
  const [slideW, setSlideW] = useState(0);
  const [index, setIndex] = useState(0);
  const autoplayRef = useRef(null);
  const isHoverRef = useRef(false);

  useEffect(() => {
    const ro = new ResizeObserver(() => {
      if (slideRef.current) setSlideW(slideRef.current.offsetWidth + 24);
    });
    if (slideRef.current) {
      setSlideW(slideRef.current.offsetWidth + 24);
      ro.observe(slideRef.current);
    }
    return () => ro.disconnect();
  }, [items.length]);

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
    const clamped = ((i % items.length) + items.length) % items.length;
    vp.scrollTo({ left: clamped * (slideW || vp.clientWidth), behavior: "smooth" });
  };

  const next = () => scrollTo(index + 1);
  const prev = () => scrollTo(index - 1);

  useEffect(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (items.length <= 1) return;
    autoplayRef.current = setInterval(() => {
      if (!isHoverRef.current) next();
    }, AUTOPLAY_MS);
    return () => autoplayRef.current && clearInterval(autoplayRef.current);
  }, [items.length]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "ArrowRight") next(); if (e.key === "ArrowLeft") prev(); };
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
        onMouseLeave={() => { isHoverRef.current = false; }}
      >
        <style jsx>{`div::-webkit-scrollbar{display:none;}`}</style>
        {items.map((it, i) => (
          <div key={i} ref={i === 0 ? slideRef : undefined} className="snap-start shrink-0 w-[88%] sm:w-[62%] lg:w-[46%] xl:w-[40%]">
            {renderItem(it, i)}
          </div>
        ))}
      </div>

      {items.length > 1 && (
        <>
          <button aria-label="Précédent" onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-[200] grid place-items-center h-11 w-11 rounded-full bg-white/90 shadow">‹</button>
          <button aria-label="Suivant" onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-[200] grid place-items-center h-11 w-11 rounded-full bg-white/90 shadow">›</button>
        </>
      )}

      {items.length > 1 && (
        <div className="mt-5 flex items-center justify-center gap-2">
          {items.map((_, i) => (
            <button key={i} aria-label={`Aller à l’élément ${i + 1}`} onClick={() => scrollTo(i)}
              className={`h-2.5 rounded-full transition-all ${i === index ? "w-6 bg-[#0B2239]" : "w-2.5 bg-slate-300"}`} />
          ))}
        </div>
      )}
    </div>
  );
}

/* -------------------- Page -------------------- */
export default function ProductsByCategoryPage() {
  const { locale, slug } = useParams();
  const router = useRouter();

  const [categories, setCategories] = useState([]);
  const [loadingCats, setLoadingCats] = useState(true);
  const [products, setProducts] = useState([]);
  const [loadingProds, setLoadingProds] = useState(true);
  const [error, setError] = useState("");
  const [didAutoOpen, setDidAutoOpen] = useState(false);

  /* fetch categories */
  useEffect(() => {
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API}/categories`, { cache: "no-store", signal: controller.signal });
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
    return categories.find((c) => {
      const title = (c?.translations?.[locale] || c?.translations?.fr || c?.translations?.en || c?.label || "").trim();
      const s = c?.slug ? String(c.slug) : slugify(title);
      return s === slug;
    }) || null;
  }, [categories, slug, locale]);

  /* fetch products */
  useEffect(() => {
    if (!currentCategory?._id) return;
    let alive = true;
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API}/produits/by-category/${currentCategory._id}`, { cache: "no-store", signal: controller.signal });
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
    humanizeTitle(String(slug || ""));

  /* auto open (si 1 seul produit et slug non forcé) */
  useEffect(() => {
    const forceList = FORCE_LIST_SLUGS.has(String(slug));
    if (!loadingProds && !loadingCats && !error) {
      if (!forceList && products.length === 1) {
        setDidAutoOpen(true);
        router.replace(`/${locale}/produits/${slug}/${products[0]._id}`);
      }
    }
  }, [loadingProds, loadingCats, error, products, slug, locale, router]);

  /* header anim */
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
            <motion.h1 {...fadeUp(0.1)} className="mt-3 text-3xl md:text-4xl font-extrabold text-[#0B2239] tracking-tight">
              {pageTitle}
            </motion.h1>
          </div>
        </motion.section>

        <section className="mx-auto max-w-7xl px-4 pb-20 pt-6">
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

          {/* ===== CONTENU ===== */}
          {!loadingCats && !loadingProds && !error && !didAutoOpen && products.length > 0 && (
            <>
              {/* MOBILE: liste verticale (1 carte/ligne) avec lien plein-cadre */}
              <div className="sm:hidden space-y-6">
                {products.map((p) => {
                  const title = pickName(p, locale);
                  const img = toUrlSafe(p.images?.[0]);
                  const href = `/${locale}/produits/${slug}/${p._id}`;
                  return (
                    <article key={p._id} className="group relative h-64 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
                      <Image src={img} alt={title} fill sizes="100vw" className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" />
                      <div className="absolute left-3 bottom-3 z-10">
                        <span className="inline-flex items-center rounded-lg bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white shadow backdrop-blur-sm">
                          {title}
                        </span>
                      </div>
                      {/* ➜ redirection (pas de lightbox) */}
                      <a href={href} className="absolute inset-0 z-20" aria-label={`Voir détail: ${title}`} />
                    </article>
                  );
                })}
              </div>

              {/* DESKTOP: carrousel conservé, avec lien plein-cadre */}
              <motion.div {...fadeUp(0.06)} className="hidden sm:block mt-6">
                <Carousel
                  items={products}
                  ariaLabel={`Produits de la catégorie ${pageTitle}`}
                  renderItem={(p) => {
                    const title = pickName(p, locale);
                    const img = toUrlSafe(p.images?.[0]);
                    const href = `/${locale}/produits/${slug}/${p._id}`;
                    return (
                      <article className="group relative h-72 lg:h-80 overflow-hidden rounded-3xl shadow-lg ring-1 ring-slate-200">
                        <Image src={img} alt={title} fill sizes="(max-width:1024px) 62vw, 40vw" className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110" />
                        <div className="absolute left-3 bottom-3 z-10">
                          <span className="inline-flex items-center rounded-lg bg-black/60 px-3 py-1.5 text-[12px] font-semibold text-white shadow backdrop-blur-sm">
                            {title}
                          </span>
                        </div>
                        {/* ➜ redirection (pas de lightbox) */}
                        <a href={href} className="absolute inset-0 z-20" aria-label={`Voir détail: ${title}`} />
                      </article>
                    );
                  }}
                />
              </motion.div>
            </>
          )}

          {!loadingCats && !loadingProds && !error && !didAutoOpen && products.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h4 className="text-[#0B2239] font-semibold">Aucun produit</h4>
              <p className="text-sm text-slate-600 mt-1">Aucun produit trouvé pour cette catégorie.</p>
            </div>
          )}
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
