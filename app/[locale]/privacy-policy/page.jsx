import Script from "next/script";
import PrivacyPolicyClient from "./PrivacyPolicyClient";
import { getTranslations } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export async function generateMetadata({ params }) {
 const { locale } = await params;
   const t = await getTranslations({ locale, namespace: "legal.privacy" });

  const title = t("seo.title", { default: "Politique de confidentialité" });
  const description = t("seo.description", {
    default:
      "Découvrez comment nous collectons, utilisons et protégeons vos données personnelles. Transparence et conformité RGPD.",
  });

  const url = `${SITE_URL}/${locale}/privacy-policy`;
  const ogImage = `${SITE_URL}/og/privacy-policy.jpg`; // ajoute une image 1200x630

  return {
    title,
    description,
    keywords: [
      "politique de confidentialité",
      "confidentialité",
      "données personnelles",
      "RGPD",
      "cookies",
      "sécurité",
    ],
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr/privacy-policy`,
        en: `${SITE_URL}/en/privacy-policy`,
      },
    },
    openGraph: {
      type: "article",
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
  const t = await getTranslations({ locale, namespace: "legal.privacy" });

  // Tu peux garder la même date que dans ton composant client si tu veux
  const lastUpdatedISO = "2025-08-26T00:00:00Z";

  // JSON-LD : PrivacyPolicy + Breadcrumb + Organization
  const privacyJsonLd = {
    "@context": "https://schema.org",
    "@type": "PrivacyPolicy",
    name: t("seo.title", { default: "Politique de confidentialité" }),
    inLanguage: locale,
    url: `${SITE_URL}/${locale}/privacy-policy`,
    dateModified: lastUpdatedISO,
    isAccessibleForFree: true
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: t("seo.home", { default: "Accueil" }),
        item: `${SITE_URL}/${locale}`
      },
      {
        "@type": "ListItem",
        position: 2,
        name: t("seo.privacy", { default: "Politique de confidentialité" }),
        item: `${SITE_URL}/${locale}/privacy-policy`
      }
    ]
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MTR",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "customer support",
        email: "contact@mtr.tn",
        availableLanguage: ["fr", "en"]
      }
    ],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Sfax",
      addressCountry: "TN"
    }
  };

  return (
    <>
      <Script id="ld-privacy" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(privacyJsonLd) }} />
      <Script id="ld-breadcrumb" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Script id="ld-org" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }} />

      <PrivacyPolicyClient />
    </>
  );
}
