import Script from "next/script";
import { getTranslations } from "next-intl/server";
import HomeClient from "./HomeClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export async function generateMetadata({ params }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  const title = t("seo.title", { default: "MTR – Ressorts & Fil métallique" });
  const description = t("seo.description", {
    default:
      "Fabricant de ressorts et pièces en fil métallique depuis 1994. Conception sur mesure, qualité industrielle, livraison rapide.",
  });

  const url = `${SITE_URL}/${locale}`;
  const ogImage = `${SITE_URL}/og/home.jpg`; // 1200x630 dans /public/og/home.jpg

  return {
    title,
    description,
    keywords: [
      "ressorts",
      "fil métallique",
      "ressort compression",
      "ressort traction",
      "ressort torsion",
      "grilles 2D 3D",
      "fabricant",
      "Tunisie",
      "Sfax",
      "MTR"
    ],
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr`,
        en: `${SITE_URL}/en`,
      },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR",
      locale,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
        "max-video-preview": -1,
      },
    },
  };
}

export default async function Page({ params }) {
 const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "home" });

  // JSON-LD: WebSite (avec SearchAction), Organization, Breadcrumb
  const websiteJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "MTR",
    url: SITE_URL,
    inLanguage: locale,
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/${locale}/produits?q={search_term_string}`,
      "query-input": "required name=search_term_string"
    }
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MTR",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    foundingDate: "1994",
    areaServed: ["TN"],
    sameAs: [], // ajoute tes réseaux si tu veux
    address: {
      "@type": "PostalAddress",
      streetAddress: "Route Sidi Mansour Km 6.5",
      addressLocality: "Sfax",
      addressCountry: "TN"
    },
    contactPoint: [{
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "contact@mtr.tn",
      telephone: "+21600000000",
      availableLanguage: ["fr", "en"]
    }]
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("seo.home", { default: "Accueil" }), item: `${SITE_URL}/${locale}` }
    ]
  };

  return (
    <>
      <Script id="ld-website" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <Script id="ld-org" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />
      <Script id="ld-breadcrumb" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <HomeClient />
    </>
  );
}
