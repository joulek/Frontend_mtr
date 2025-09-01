import Script from "next/script";
import HelpDeskClient from "./HelpDeskClient";
import { getTranslations } from "next-intl/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

/** Metadata côté server (SEO) */
export async function generateMetadata({ params }) {
 const { locale } = await params;
   const t = await getTranslations({ locale, namespace: "auth.support.helpDesk" });

  const title = t("seo.title", { default: "Help Desk – Support & Devis" });
  const description = t("seo.description", {
    default: "Contactez notre support, demandez un devis ou consultez la FAQ. Réponse rapide.",
  });

  const url = `${SITE_URL}/${locale}/help-desk`;
  const ogImage = `${SITE_URL}/og/help-desk.jpg`; // place une image 1200x630 dans /public/og/help-desk.jpg

  return {
    title,
    description,
    keywords: [
      "support",
      "help desk",
      "devis",
      "contact",
      "service client",
      "Sfax",
      "Tunisie",
    ],
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr/help-desk`,
        en: `${SITE_URL}/en/help-desk`,
      },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR",
      locale,
      images: [{ url: ogImage, width: 1200, height: 630, alt: t("hero.alt") }],
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
   const t = await getTranslations({ locale, namespace: "auth.support.helpDesk" });

  // JSON-LD FAQPage
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      { "@type": "Question", name: t("faq.q1.t"), acceptedAnswer: { "@type": "Answer", text: t("faq.q1.a") } },
      { "@type": "Question", name: t("faq.q2.t"), acceptedAnswer: { "@type": "Answer", text: t("faq.q2.a") } },
      { "@type": "Question", name: t("faq.q3.t"), acceptedAnswer: { "@type": "Answer", text: t("faq.q3.a") } },
      { "@type": "Question", name: t("faq.q4.t"), acceptedAnswer: { "@type": "Answer", text: t("faq.q4.a") } },
      { "@type": "Question", name: t("faq.q5.t"), acceptedAnswer: { "@type": "Answer", text: t("faq.q5.a") } },
    ],
  };

  // JSON-LD BreadcrumbList
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: t("seo.home", { default: "Accueil" }), item: `${SITE_URL}/${locale}` },
      { "@type": "ListItem", position: 2, name: t("seo.helpdesk", { default: "Help Desk" }), item: `${SITE_URL}/${locale}/help-desk` },
    ],
  };

  // JSON-LD Organization (optionnel mais utile si c’est ta page contact)
  const orgJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "MTR",
    url: SITE_URL,
    logo: `${SITE_URL}/logo.png`,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Route Sidi Mansour Km 6.5",
      addressLocality: "Sfax",
      addressCountry: "TN",
    },
    contactPoint: [{
      "@type": "ContactPoint",
      telephone: "+216-XX-XXX-XXX",
      contactType: "customer support",
      availableLanguage: ["fr", "en"],
    }],
  };

  return (
    <>
      <Script id="ld-faq" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <Script id="ld-breadcrumb" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <Script id="ld-org" type="application/ld+json" strategy="afterInteractive"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }} />

      <HelpDeskClient />
    </>
  );
}
