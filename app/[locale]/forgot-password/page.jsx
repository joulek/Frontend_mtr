// app/[locale]/forgot-password/page.jsx  (SERVER)
import ForgotPasswordClient from "./ForgotPasswordClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "auth.forgotPage.seo" });

  const title = t("title", { default: "Mot de passe oublié – MTR Manufacture Tunisienne des Ressorts" });
  const description = t("description", {
    default: "Saisissez votre email pour recevoir un code de réinitialisation de mot de passe.",
  });

  const url = `${APP_URL}/${locale}/forgot-password`;
  const images = [
    {
      url: `${APP_URL}/og/forgot-password.jpg`,
      width: 1200,
      height: 630,
      alt: t("ogAlt", { default: "Réinitialiser mon mot de passe – MTR Manufacture Tunisienne des Ressorts" }),
    },
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/forgot-password`,
      languages: { fr: "/fr/forgot-password", en: "/en/forgot-password" },
    },
    openGraph: { type: "website", url, title, description, siteName: "MTR Manufacture Tunisienne des Ressorts", images /*, locale: ...*/ },
    twitter: { card: "summary_large_image", title, description, images: images.map((i) => i.url) },
    // Page d’auth → éviter l’indexation
    robots: { index: false, follow: false, noimageindex: true },
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: locale === "fr" ? "Mot de passe oublié" : "Forgot password", item: `${APP_URL}/${locale}/forgot-password` },
    ],
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Mot de passe oublié – MTR Industry",
    description: "Formulaire pour recevoir un code de réinitialisation.",
    primaryImageOfPage: `${APP_URL}/og/forgot-password.jpg`,
    breadcrumb,
  };

  return (
    <>
      <Script
        id="ldjson-forgot"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ForgotPasswordClient />
    </>
  );
}
