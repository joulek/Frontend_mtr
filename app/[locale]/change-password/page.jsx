import ChangePasswordClient from "./ChangePasswordClient";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "auth.changePasswordPage.seo" });

  const title = t("title", { default: "Changer mon mot de passe | MTR Manufacture Tunisienne des Ressorts" });
  const description = t("description", { default: "Mettez à jour votre mot de passe depuis votre espace client." });
  const url = `${APP_URL}/${locale}/change-password`;
  const images = [{
    url: `${APP_URL}/og/change-password.jpg`,
    width: 1200,
    height: 630,
    alt: t("ogAlt", { default: "Changer le mot de passe – MTR Manufacture Tunisienne des Ressorts" })
  }];

  return {
    title,
    description,
    alternates: { canonical: `/${locale}/change-password` },
    openGraph: { type: "website", url, title, description, siteName: "MTR Manufacture Tunisienne des Ressorts", images, locale },
    twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "Changer mon mot de passe",
    description: "Mettez à jour votre mot de passe depuis votre espace client.",
    primaryImageOfPage: `${APP_URL}/og/change-password.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: locale === "fr" ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: locale === "fr" ? "Changer le mot de passe" : "Change password", item: `${APP_URL}/${locale}/change-password` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-change-password"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ChangePasswordClient />
    </>
  );
}
