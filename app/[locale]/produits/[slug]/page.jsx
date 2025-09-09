// ⚠️ Server Component (no "use client")
import ProductsByCategoryClient from "./ProductsByCategoryClient";
import { getTranslations } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.mtr-industry.tn";
const BACKEND = (process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com").replace(/\/$/, "");
const API = `${BACKEND}/api`;

function slugToWords(slug = "") {
  return String(slug).replace(/-/g, " ").trim();
}
function toSlug(s = "") {
  return String(s)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export async function generateMetadata({ params }) {
  // ✅ params is async in Next 15
  const { locale = "fr", slug } = await params;

  const t = await getTranslations({ locale, namespace: "seo.category" });

  // default title from slug
  let catTitle = slugToWords(slug);

  // try to get localized category label from API
  try {
    const res = await fetch(`${API}/categories`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const data = await res.json();
      const cats = Array.isArray(data?.categories) ? data.categories : [];
      const match = cats.find((c) => {
        const label =
          (c?.translations?.[locale] ||
            c?.translations?.fr ||
            c?.translations?.en ||
            c?.label ||
            "").trim();
        const s = c?.slug ? String(c.slug) : toSlug(label);
        return s === slug;
      });
      if (match) {
        catTitle =
          match?.translations?.[locale] ||
          match?.translations?.fr ||
          match?.translations?.en ||
          match?.label ||
          catTitle;
      }
    }
  } catch {
    /* silent fallback */
  }

  const url = `${SITE_URL}/${locale}/produits/${slug}`;

  const title = t("title", { name: catTitle });
  const description = t("description", { name: catTitle });
  const keywords = String(t("keywords", { name: catTitle }))
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  return {
    title,
    description,
    keywords,
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr/produits/${slug}`,
        en: `${SITE_URL}/en/produits/${slug}`,
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
          url: `${SITE_URL}/og/produits-${slug}.jpg`,
          width: 1200,
          height: 630,
          alt: t("ogAlt", { name: catTitle }),
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${SITE_URL}/og/produits-${slug}.jpg`],
    },
    robots: { index: true, follow: true },
  };
}

export default async function Page({ params }) {
  // ✅ also await here
  const { locale = "fr", slug } = await params;

  const url = `${SITE_URL}/${locale}/produits/${slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Produits – ${slugToWords(slug)}`,
    url,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Accueil", item: `${SITE_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: "Produits", item: `${SITE_URL}/${locale}/produits` },
        { "@type": "ListItem", position: 3, name: slugToWords(slug), item: url },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ProductsByCategoryClient />
    </>
  );
}