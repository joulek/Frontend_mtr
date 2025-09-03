// app/[locale]/set-password/page.jsx
import SetPasswordClient from "./SetPasswordClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

// ⬇️ SEO côté serveur
export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "auth.setPasswordPage.seo" });

  const title = t("title", { default: "Définir mon mot de passe | MTR Manufacture Tunisienne des Ressorts" });
  const description = t("description", {
    default: "Créez votre mot de passe à partir du lien sécurisé reçu par email.",
  });

  const url = `${APP_URL}/${locale}/set-password`;
  const og = `${APP_URL}/og/set-password.jpg`; // 1200x630 à placer dans /public/og/

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/set-password`,
      languages: { fr: "/fr/set-password", en: "/en/set-password" },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [{ url: og, width: 1200, height: 630, alt: t("ogAlt", { default: "Définir mon mot de passe – MTR Manufacture Tunisienne des Ressorts" }) }],
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      // (optionnel) locale OG standardisée :
      // locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
    robots: { index: false, follow: false, noimageindex: true }, // page d'auth
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Définir mon mot de passe – MTR Manufacture Tunisienne des Ressorts",
    description: "Formulaire pour définir un mot de passe via lien sécurisé.",
    primaryImageOfPage: `${APP_URL}/og/set-password.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: locale === "fr" ? "Définir le mot de passe" : "Set password", item: `${APP_URL}/${locale}/set-password` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-setpwd"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <SetPasswordClient />
    </>
  );
}
