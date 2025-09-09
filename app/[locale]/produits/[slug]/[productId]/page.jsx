// ⚠️ Server Component (pas de "use client")
import ProductDetailClient from "./ProductDetailClient";
import { getTranslations } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mtr-industry.tn";
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");
const API = `${BACKEND}/api`;

/* ---------- helpers ---------- */
const pick = (obj, frKey, enKey, locale = "fr") =>
  (locale?.startsWith("en") ? obj?.[enKey] : obj?.[frKey]) ||
  obj?.[frKey] || obj?.[enKey] || "";

function toUrl(src = "") {
  if (!src) return `${SITE_URL}/og/product-default.jpg`;
  const s = String(src).replace(/\\/g, "/");
  if (/^https?:\/\//i.test(s)) return s;
  const path = s.startsWith("/uploads/") ? s : `/uploads/${s.replace(/^\/+/, "")}`;
  return `${BACKEND}${path}`;
}

async function fetchProduct(productId) {
  // 1) /produits/:id  → 2) /products/:id
  let res = await fetch(`${API}/produits/${productId}`, { next: { revalidate: 900 } });
  if (!res.ok) {
    res = await fetch(`${API}/products/${productId}`, { next: { revalidate: 900 } });
  }
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/* ---------- SEO ---------- */
export async function generateMetadata({ params }) {
  // ✅ params is async in Next 15
  const { locale = "fr", slug, productId } = await params;

  const t = await getTranslations({ locale, namespace: "seo.product" });

  const data = await fetchProduct(productId);

  const name = data ? pick(data, "name_fr", "name_en", locale) : productId;
  const descRaw = data ? pick(data, "description_fr", "description_en", locale) : "";
  const description = descRaw || t("descriptionFallback", { name });

  // Première image dispo → OG
  const firstImg =
    (Array.isArray(data?.images) && data.images[0]) || "/og/product-default.jpg";
  const ogImage = toUrl(typeof firstImg === "string" ? firstImg : (firstImg.url || firstImg.src || firstImg.path || ""));

  const url = `${SITE_URL}/${locale}/produits/${slug}/${productId}`;
  const title = t("title", { name });

  const kw = String(t("keywords", { name }))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    title,
    description,
    keywords: kw,
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr/produits/${slug}/${productId}`,
        en: `${SITE_URL}/en/produits/${slug}/${productId}`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      type: "website",
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: t("ogAlt", { name }),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: { index: true, follow: true },
  };
}

/* ---------- Page + JSON-LD Product ---------- */
export default async function Page({ params }) {
  // ✅ await params here too
  const { locale = "fr", slug, productId } = await params;

  const data = await fetchProduct(productId);

  const name = data ? pick(data, "name_fr", "name_en", locale) : productId;
  const desc = data ? pick(data, "description_fr", "description_en", locale) : "";

  const imgList = (
    Array.isArray(data?.images) && data.images.length
      ? data.images
      : ["/og/product-default.jpg"]
  ).map((it) => toUrl(typeof it === "string" ? it : (it.url || it.src || it.path || "")));

  const price = data?.price ?? data?.price_ttc ?? null;
  const currency = data?.currency ?? "TND";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description: desc || undefined,
    sku: productId,
    image: imgList,
    brand: { "@type": "Brand", name: data?.brand || "MTR Manufacture Tunisienne des Ressorts" },
    category: String(slug || "").replace(/-/g, " "),
    ...(price
      ? {
          offers: {
            "@type": "Offer",
            price: String(price),
            priceCurrency: currency,
            availability: "https://schema.org/InStock",
            url: `${SITE_URL}/${locale}/produits/${slug}/${productId}`,
          },
        }
      : {}),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductDetailClient />
    </>
  );
}