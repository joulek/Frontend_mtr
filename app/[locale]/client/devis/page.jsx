// app/[locale]/devis/page.jsx
import DevisClient from "./DevisClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "auth.devis" });

  const title = t("seo.title", {
    default: "Demander un devis – Ressorts compression, traction, torsion | MTR Manufacture Tunisienne des Ressorts",
  });
  const description = t("seo.description", {
    default:
      "Obtenez un devis rapide pour vos ressorts de compression, traction, torsion, fils dressés et grilles métalliques. Service sur mesure pour l’industrie.",
  });

  const url = `${APP_URL}/${locale}/devis`;
  const images = [
    {
      url: `${APP_URL}/og/devis.jpg`,
      width: 1200,
      height: 630,
      alt: t("seo.ogAlt", { default: "Demande de devis MTR Manufacture Tunisienne des Ressorts" }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/devis`,
      languages: {
        fr: "/fr/devis",
        en: "/en/devis",
      },
    },
    keywords: [
      "devis ressort",
      "ressort compression",
      "ressort traction",
      "ressort torsion",
      "fil dressé",
      "grille métallique",
      "MTR Manufacture Tunisienne des Ressorts",
    ],
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      images,
      // (optionnel) locale OG si tu veux : "fr_FR" / "en_US"
      // locale: locale === "fr" ? "fr_FR" : "en_US",
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

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const isFr = locale === "fr";

  // JSON-LD (schema.org) : WebPage + fil d’Ariane localisé
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: isFr ? "Demander un devis – MTR Manufacture Tunisienne des Ressorts" : "Request a quote – MTR Manufacture Tunisienne des Ressorts",
    description: isFr
      ? "Obtenez un devis rapide pour vos ressorts de compression, traction, torsion, fils dressés et grilles métalliques."
      : "Get a quick quote for compression, extension, torsion springs, straightened wires and wire mesh.",
    primaryImageOfPage: `${APP_URL}/og/devis.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: isFr ? "Accueil" : "Home",
          item: `${APP_URL}/${locale}`,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: isFr ? "Demander un devis" : "Request a quote",
          item: `${APP_URL}/${locale}/devis`,
        },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-devis"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <DevisClient />
    </>
  );
}
