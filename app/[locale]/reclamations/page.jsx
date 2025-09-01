// app/[locale]/reclamations/page.jsx
import ReclamationClient from "../client/reclamations/ReclamationClient";
import SiteHeader from "@/components/SiteHeader";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  // Garde bien le même namespace dans tes JSON de traduction
  const t = await getTranslations({ locale, namespace: "reclamationsPage.seo" });

  const title = t("title", { default: "Passer une réclamation | MTR Industry" });
  const description = t("description", {
    default: "Soumettez une réclamation (devis, bon de commande, bon de livraison ou facture) et joignez des fichiers.",
  });

  const url = `${APP_URL}/${locale}/reclamations`;
  const ogImage = `${APP_URL}/og/reclamations.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/reclamations`,
      languages: { fr: "/fr/reclamations", en: "/en/reclamations" },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Industry",
      images: [{ url: ogImage, width: 1200, height: 630, alt: t("ogAlt", { default: "Passer une réclamation – MTR Industry" }) }],
      // (optionnel) locale OG : "fr_FR" / "en_US"
      // locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    // Formulaire : souvent désindexé
    robots: { index: false, follow: false, noimageindex: true },
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Passer une réclamation – MTR Industry",
    description: "Formulaire de réclamation client.",
    primaryImageOfPage: `${APP_URL}/og/reclamations.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: locale === "fr" ? "Réclamations" : "Claims", item: `${APP_URL}/${locale}/reclamations` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-reclamations"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <SiteHeader />

      <main className="pt-6 bg-[#f5f5f5] min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <ReclamationClient userIdFromProps={null} />
        </div>
      </main>
    </>
  );
}
