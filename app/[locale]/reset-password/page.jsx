// app/[locale]/reset-password/page.jsx
import ResetPasswordClient from "./ResetPasswordClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  // Namespace à ajouter dans tes JSON de traductions
  const t = await getTranslations({ locale, namespace: "auth.resetPasswordPage.seo" });

  const title = t("title", { default: "Réinitialiser le mot de passe | MTR Manufacture Tunisienne des Ressorts" });
  const description = t("description", {
    default: "Saisissez votre email, le code reçu puis un nouveau mot de passe.",
  });

  const url = `${APP_URL}/${locale}/reset-password`;
  const og = `${APP_URL}/og/reset-password.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/reset-password`,
      languages: { fr: "/fr/reset-password", en: "/en/reset-password" },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      images: [{ url: og, width: 1200, height: 630, alt: t("ogAlt", { default: "Réinitialiser mon mot de passe – MTR Manufacture Tunisienne des Ressorts" }) }],
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      // (optionnel) locale OG standardisée :
      // locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description, images: [og] },
    // Page d'auth → éviter l'indexation
    robots: { index: false, follow: false, noimageindex: true },
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Réinitialiser le mot de passe – MTR Manufacture Tunisienne des Ressorts",
    description: "Formulaire sécurisé pour réinitialiser votre mot de passe.",
    primaryImageOfPage: `${APP_URL}/og/reset-password.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: locale === "fr" ? "Réinitialiser le mot de passe" : "Reset password", item: `${APP_URL}/${locale}/reset-password` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-reset"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ResetPasswordClient />
    </>
  );
}
