"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import { motion, AnimatePresence } from "framer-motion";

/* ------------------------------- Config API ------------------------------- */
const BACKEND = "https://backend-mtr.onrender.com";
const API = `${BACKEND}/api`;

/* ------------------------------- Utils texte ------------------------------ */
const pick = (obj: any, frKey: string, enKey: string, locale = "fr") =>
  (locale?.startsWith("en") ? obj?.[enKey] : obj?.[frKey]) ||
  obj?.[frKey] ||
  obj?.[enKey] ||
  "";

/* ------------------------------- Utils image ------------------------------ */
const PLACEHOLDER = "/placeholder.png";
const BACKEND_HOST = "backend-mtr.onrender.com";

const toUrl = (src: any = "") => {
  try {
    if (!src) return PLACEHOLDER;
    if (typeof src === "object") {
      src =
        src?.url ||
        src?.src ||
        src?.path ||
        src?.filename ||
        src?.fileName ||
        src?.name ||
        "";
    }
    if (!src) return PLACEHOLDER;
    let s = String(src).trim().replace(/\\/g, "/");

    if (/^(data|blob):/i.test(s)) return s;

    if (
      s.startsWith("/placeholder") ||
      s.startsWith("/images") ||
      s.startsWith("/icons") ||
      s.startsWith("/logo") ||
      s.startsWith("/_next/")
    )
      return s;

    if (/^https?:\/\//i.test(s)) {
      const u = new URL(s);

      if (/(^|\.)(localhost|127\.0\.0\.1)$/i.test(u.hostname)) {
        u.protocol = "https:";
        u.hostname = BACKEND_HOST;
        u.port = "";
        if (!u.pathname.startsWith("/uploads/")) {
          u.pathname = `/uploads/${u.pathname.replace(/^\/+/, "")}`;
        }
        return u.toString();
      }

      if (u.hostname === BACKEND_HOST && u.protocol !== "https:") {
        u.protocol = "https:";
        u.port = "";
        return u.toString();
      }

      if (
        typeof window !== "undefined" &&
        window.location.protocol === "https:" &&
        u.protocol === "http:"
      ) {
        u.protocol = "https:";
        return u.toString();
      }

      return u.toString();
    }

    const path = s.startsWith("/uploads/")
      ? s
      : `/uploads/${s.replace(/^\/+/, "")}`;
    return `https://${BACKEND_HOST}${path}`;
  } catch {
    return PLACEHOLDER;
  }
};

/* -------------------- Composant image cover + zoom (cards) -------------------- */
function CardImage({
  src,
  alt = "",
  sizes = "(max-width:640px) 88vw, (max-width:1024px) 62vw, 40vw",
  priority = false,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-3xl">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        className="object-cover transition-transform duration-[800ms] ease-out group-hover:scale-110"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent" />
    </div>
  );
}

/* --------- Variante cover + zoom qui suit la souris (grille produit) -------- */
function ZoomCover({
  src,
  alt = "",
  sizes = "(max-width: 768px) 100vw, 33vw",
  priority = false,
}: {
  src: string;
  alt?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
  };
  return (
    <div
      onMouseMove={onMove}
      onMouseLeave={() => setOrigin({ x: 50, y: 50 })}
      className="absolute inset-0 overflow-hidden rounded-3xl cursor-zoom-in"
    >
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes={sizes}
        style={{ transformOrigin: `${origin.x}% ${origin.y}%` }}
        className="object-cover rounded-3xl transition-transform duration-500 ease-out group-hover:scale-[1.35]"
      />
    </div>
  );
}

/* ---------------------------------- Page ---------------------------------- */
export default function ProductDetailPage() {
  const { locale, slug, productId } = useParams() as {
    locale: string;
    slug: string;
    productId: string;
  };
  const router = useRouter();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [activeIdx, setActiveIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErr("");
        let res = await fetch(`${API}/produits/${productId}`, {
          cache: "no-store",
        });
        if (!res.ok) {
          const res2 = await fetch(`${API}/products/${productId}`, {
            cache: "no-store",
          });
          if (!res2.ok) throw new Error(`HTTP ${res.status} / ${res2.status}`);
          res = res2;
        }
        const data = await res.json();
        if (!alive) return;

        setProduct(data);
      } catch {
        if (alive) setErr("Impossible de charger ce produit.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [productId]);

  const name = product ? pick(product, "name_fr", "name_en", locale) : "";
  const desc = product
    ? pick(product, "description_fr", "description_en", locale)
    : "";

  const imagesRaw: any[] =
    Array.isArray(product?.images) && product.images.length
      ? product.images
      : [PLACEHOLDER];

  const imgUrl = (i: number) => {
    const it = imagesRaw[i] ?? imagesRaw[0];
    const raw =
      typeof it === "string"
        ? it
        : it?.url ||
          it?.src ||
          it?.path ||
          it?.filename ||
          it?.fileName ||
          it?.name ||
          "";
    return toUrl(raw);
  };

  const imgTitle = (i: number) => {
    const it = imagesRaw[i] ?? imagesRaw[0];
    if (typeof it === "string") return name || "Image";
    return pick(it, "title_fr", "title_en", locale) || name || "Image";
  };

  const cols = Math.max(1, Math.ceil(Math.sqrt(imagesRaw.length || 1)));

  const onKey = useCallback(
    (e: KeyboardEvent) => {
      if (!lightbox || !imagesRaw?.length) return;
      if (e.key === "ArrowRight")
        setActiveIdx((i) => (i + 1) % imagesRaw.length);
      if (e.key === "ArrowLeft")
        setActiveIdx((i) => (i - 1 + imagesRaw.length) % imagesRaw.length);
      if (e.key === "Escape") setLightbox(false);
    },
    [lightbox, imagesRaw]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onKey]);

  return (
    <>
      <SiteHeader onLogout={undefined} />
      <main className="bg-slate-50 min-h-screen relative overflow-x-hidden">
        {/* décor confiné */}
        <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#F5B301]/15 blur-3xl" />
          <div className="absolute -bottom-32 -left-24 h-80 w-80 rounded-full bg-[#0B2239]/10 blur-3xl" />
        </div>

        <div className="w-full mx-auto max-w-7xl px-4 pt-8 pb-24">
          {/* Fil d’Ariane */}
          <motion.nav
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-slate-500 mb-6"
          >
            <button
              onClick={() => router.push(`/${locale}`)}
              className="hover:underline"
            >
              Accueil
            </button>
            <span className="mx-2">/</span>
            <button
              onClick={() => router.push(`/${locale}/produits/${slug}`)}
              className="hover:underline capitalize"
            >
              {String(slug || "").replace(/-/g, " ")}
            </button>
            <span className="mx-2">/</span>
            <span className="text-slate-700 font-semibold">
              {name || "Produit"}
            </span>
          </motion.nav>

          {/* Titre + description */}
          <motion.header
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <h1 className="text-3xl md:text-4xl font-extrabold text-[#0B2239]">
              {name || "—"}
            </h1>
            <div className="mt-3 h-[6px] w-40 rounded-full bg-gradient-to-r from-[#F5B301] via-[#F5B301] to-transparent" />
            {!!desc && (
              <p className="mt-5 max-w-4xl text-slate-700 leading-relaxed">
                {desc}
              </p>
            )}
          </motion.header>

          {/* Grille d’images — 1 colonne en mobile, dynamique dès md */}
          <section className="mt-10">
            {loading ? (
              <div
                className="grid grid-cols-1 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] gap-6"
                style={{ ["--cols" as any]: Math.max(2, cols) }}
              >
                {Array.from({ length: Math.max(4, cols * cols) }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-3xl bg-white ring-1 ring-slate-200 shadow-sm"
                  >
                    <div className="h-[260px] md:h-[300px] xl:h-[340px] bg-slate-200 animate-pulse rounded-3xl" />
                  </div>
                ))}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.15 }}
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.06 } },
                }}
                className="grid grid-cols-1 md:[grid-template-columns:repeat(var(--cols),minmax(0,1fr))] gap-6"
                style={{ ["--cols" as any]: cols }}
              >
                {imagesRaw.map((_, i) => (
                  <motion.button
                    key={i}
                    type="button"
                    onClick={() => {
                      setActiveIdx(i);
                      setLightbox(true);
                    }}
                    variants={{
                      hidden: { opacity: 0, y: 14, scale: 0.985 },
                      show: { opacity: 1, y: 0, scale: 1 },
                    }}
                    whileHover={{ y: -5, scale: 1.005 }}
                    whileTap={{ scale: 0.99 }}
                    className="group relative overflow-hidden rounded-3xl bg-white/95 ring-1 ring-slate-200 shadow-md hover:shadow-2xl transition-all duration-300 focus:outline-none"
                    aria-label={`Agrandir l’image ${i + 1}`}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-3xl ring-0 ring-[#F5B301]/0 group-hover:ring-[4px] group-hover:ring-[#F5B301]/25 transition-all duration-300" />
                    <div className="relative h-[260px] md:h-[300px] xl:h-[340px]">
                      <ZoomCover
                        src={imgUrl(i)}
                        alt={imgTitle(i)}
                        priority={i === 0}
                        sizes="(max-width: 768px) 100vw, 33vw"
                      />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}
          </section>

          {err && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
              {err}
            </div>
          )}
        </div>
      </main>

      {/* Lightbox */}
      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 overflow-hidden"
            onClick={() => setLightbox(false)}
          >
            {/* bouton fermer */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setLightbox(false);
              }}
              className="absolute right-4 top-4 z-[200] h-10 w-10 rounded-full bg-white/90 text-[#0B2239] shadow grid place-items-center focus:outline-none focus:ring-2 focus:ring-[#F5B301]"
              aria-label="Fermer la visionneuse"
              type="button"
            >
              ✕
            </button>

            {imagesRaw.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx(
                      (i) => (i - 1 + imagesRaw.length) % imagesRaw.length
                    );
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 z-[150] rounded-full bg-white/90 px-3 py-2 text-[#0B2239] shadow"
                  aria-label="Précédent"
                >
                  ‹
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveIdx((i) => (i + 1) % imagesRaw.length);
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 z-[150] rounded-full bg-white/90 px-3 py-2 text-[#0B2239] shadow"
                  aria-label="Suivant"
                >
                  ›
                </button>
              </>
            )}

            {/* image */}
            <div
              className="absolute inset-0 p-10 z-[100]"
              onClick={(e) => e.stopPropagation()}
            >
              <Image
                src={imgUrl(activeIdx)}
                alt={imgTitle(activeIdx)}
                fill
                className="object-contain"
                sizes="100vw"
                priority
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
