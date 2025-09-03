import { getTranslations } from "next-intl/server";
import HomeClient from "./HomeClient";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

export async function generateMetadata({ params }) {
  const { locale } = await params; // ✅ on attend params
  const t = await getTranslations({ locale, namespace: "home" });

  const title = t("seo.title", { default: "Accueil" });
  const description = t("seo.description", {
    default: "Découvrez nos catégories de produits.",
  });

  const url = `${SITE_URL}/${locale}`;
  const ogImage = `${SITE_URL}/og/home.jpg`;

  return {
    title,
    description,
    keywords: [
      "ressorts",
      "industrie",
      "fabrication",
      "pièces métalliques",
      "catégories",
    ],
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr`,
        en: `${SITE_URL}/en`,
      },
    },
    openGraph: {
      title,
      description,
      url,
      images: [{ url: ogImage, width: 1200, height: 630 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function Page({ params }) {
  const { locale } = await params; // ✅ idem ici
  const t = await getTranslations({ locale, namespace: "home" });

  // Récupération des catégories depuis ton backend (placeholder ici)
  const categories = [];

  return <HomeClient categories={categories} />;
}
