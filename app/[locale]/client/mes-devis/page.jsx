// app/[locale]/client/mes-devis/page.jsx
import MesDevisClient from "./MesDevisClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "auth.client.quotesPage" });

  const title = t("seo.title", { default: "Mes devis – Espace client | MTR Manufacture Tunisienne des Ressorts" });
  const description = t("seo.description", {
    default: "Espace client : consultez vos demandes de devis, ouvrez les PDF et confirmez vos commandes.",
  });

  const url = `${APP_URL}/${locale}/client/mes-devis`;
  const images = [
    {
      url: `${APP_URL}/og/mes-devis.jpg`,
      width: 1200,
      height: 630,
      alt: t("seo.ogAlt", { default: "Mes devis MTR Manufacture Tunisienne des Ressorts" }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client/mes-devis`,
      languages: { fr: "/fr/client/mes-devis", en: "/en/client/mes-devis" },
    },
    keywords: ["mes devis", "espace client", "devis MTR", "suivi devis", "commande", "industrie"],
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      images,
      // (optionnel) locale OG : "fr_FR" / "en_US"
      // locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) },
    // Page privée → empêcher l'indexation
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;
  const isFr = locale === "fr";

  // JSON-LD (schema.org) : page de collection privée
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: isFr ? "Mes devis – MTR Manufacture Tunisienne des Ressorts" : "My quotes – MTR Manufacture Tunisienne des Ressorts",
    description: isFr
      ? "Espace client : liste de vos demandes de devis et devis associés."
      : "Client area: list of your quote requests and related quotes.",
    isPartOf: { "@type": "WebSite", name: "MTR Manufacture Tunisienne des Ressorts", url: APP_URL },
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: isFr ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: isFr ? "Espace client" : "Client area", item: `${APP_URL}/${locale}/client` },
        { "@type": "ListItem", position: 3, name: isFr ? "Mes devis" : "My quotes", item: `${APP_URL}/${locale}/client/mes-devis` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-mesdevis"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <MesDevisClient />
    </>
  );
}
