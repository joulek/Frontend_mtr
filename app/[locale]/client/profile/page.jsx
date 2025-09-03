// app/[locale]/client/profile/page.jsx
import ClientProfileReadOnly from "./ClientProfileReadOnly";
import { getTranslations } from "next-intl/server";
import Script from "next/script";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "profile.seo" });

  const title = t("title", { default: "Mon compte – Espace client | MTR Manufacture Tunisienne des Ressorts" });
  const description = t("description", {
    default:
      "Accédez à vos informations de compte, vos coordonnées et vos raccourcis (réclamations, support, mot de passe).",
  });

  const url = `${APP_URL}/${locale}/client/profile`;
  const images = [
    { url: `${APP_URL}/og/client.jpg`, width: 1200, height: 630, alt: t("ogAlt", { default: "Espace client MTR Manufacture Tunisienne des Ressorts" }) }
  ];

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client/profile`,
      languages: { fr: "/fr/client/profile", en: "/en/client/profile" },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      images,
      // (optionnel) préciser une locale OG standardisée :
      // locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description, images: images.map(i => i.url) },
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "profile.seo" });
  const isFr = locale === "fr";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: t("title", { default: isFr ? "Mon compte – Espace client" : "My account – Client area" }),
    description: t("description", {
      default: isFr
        ? "Accédez à vos informations de compte, vos coordonnées et vos raccourcis (réclamations, support, mot de passe)."
        : "Access your account information, contact details and shortcuts (claims, support, password).",
    }),
    primaryImageOfPage: `${APP_URL}/og/client.jpg`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: isFr ? "Accueil" : "Home", item: `${APP_URL}/${locale}` },
        { "@type": "ListItem", position: 2, name: isFr ? "Espace client" : "Client area", item: `${APP_URL}/${locale}/client` },
        { "@type": "ListItem", position: 3, name: isFr ? "Mon compte" : "My account", item: `${APP_URL}/${locale}/client/profile` },
      ],
    },
  };

  return (
    <>
      <Script
        id="ldjson-client-profile"
        type="application/ld+json"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <ClientProfileReadOnly />
    </>
  );
}
