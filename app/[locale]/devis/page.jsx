// app/[locale]/devis/page.jsx
import DevisClient from "./DevisClient";
import { getTranslations } from "next-intl/server";

const APP_URL =
  (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

// ---------- SEO ----------
export async function generateMetadata({ params }) {
  const { locale } = await params; // ✅ await params
  const t = await getTranslations({ locale, namespace: "auth.devis.seo" });

  const title = t("title", {
    default:
      "Demander un devis – Ressorts de compression, traction & torsion | MTR Manufacture Tunisienne des Ressorts",
  });
  const description = t("description", {
    default:
      "Obtenez un devis rapide pour les ressorts de compression, traction, torsion, fil redressé et grilles métalliques.",
  });

  const url = `${APP_URL}/${locale}/devis`;
  const images = [
    {
      url: `${APP_URL}/og/devis.jpg`,
      width: 1200,
      height: 630,
      alt: t("ogAlt", { default: "Demande de devis MTR Manufacture Tunisienne des Ressorts" }),
    },
  ];

  return {
    title,
    description,
    keywords: [
      "devis ressort",
      "ressort compression",
      "ressort traction",
      "ressort torsion",
      "fil redressé",
      "grille métallique",
      "industrie",
    ],
    alternates: {
      canonical: url, // ✅ absolu (plus sûr si pas de metadataBase)
      languages: {
        fr: `${APP_URL}/fr/devis`,
        en: `${APP_URL}/en/devis`,
      },
    },
    openGraph: {
      type: "website", // ✅ pas 'product'
      url,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      title,
      description,
      images,
      locale,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: images.map((i) => i.url),
    },
    robots: { index: true, follow: true },
  };
}

// ---------- Page ----------
export default async function Page({ params }) {
  const { locale } = await params; // ✅ await params

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: locale === "fr" ? "Accueil" : "Home",
        item: `${APP_URL}/${locale}`,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: locale === "fr" ? "Demande de devis" : "Request a quote",
        item: `${APP_URL}/${locale}/devis`,
      },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name:
      locale === "fr"
        ? "Demander un devis – MTR Manufacture Tunisienne des Ressorts"
        : "Request a quote – MTR Manufacture Tunisienne des Ressorts",
    description:
      locale === "fr"
        ? "Formulaire multi-produits pour obtenir un devis sur ressorts et articles en fil métallique."
        : "Multi-product form to request a quote for springs and wire parts.",
    primaryImageOfPage: `${APP_URL}/og/devis.jpg`,
    breadcrumb,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DevisClient />
    </>
  );
}
