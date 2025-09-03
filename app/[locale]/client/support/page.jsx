// app/[locale]/client/reclamations/page.jsx
import SupportPageClient from "./SupportPageClient";
import { getTranslations } from "next-intl/server";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.mtr-industry.tn").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "auth.support" });

  const title = t("title", { default: "Réclamations – Espace client | MTR Manufacture Tunisienne des Ressorts" });
  const description = t("seo.description", {
    default: "Déposez et suivez vos réclamations client (PDF, détails, statut).",
  });

  const url = `${SITE_URL}/${locale}/client/reclamations`;
  const ogImage = `${SITE_URL}/og/mes-reclamations.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client/reclamations`,
      languages: { fr: "/fr/client/reclamations", en: "/en/client/reclamations" },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      type: "website",
      images: [{ url: ogImage, width: 1200, height: 630 }],
      // (optionnel) locale OG : "fr_FR" / "en_US"
      // locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    // Espace client → pas indexée
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export default async function Page(props) {
  // ✅ Next 15 : params est une Promise (même si tu n'utilises pas la valeur)
  const { locale } = await props.params;
  void locale; // pour éviter un warning "unused"
  return <SupportPageClient />;
}
