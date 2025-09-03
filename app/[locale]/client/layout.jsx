// app/[locale]/client/layout.jsx
import ClientLayoutShell from "./layout.client";
import { getTranslations } from "next-intl/server";

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

export async function generateMetadata(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;

  const t = await getTranslations({ locale, namespace: "auth.client.layout.seo" });
  const title = t("title", { default: "Espace client | MTR Manufacture Tunisienne des Ressorts" });
  const description = t("description", { default: "Accédez à votre espace client MTR Manufacture Tunisienne des Ressorts." });
  const url = `${APP_URL}/${locale}/client`;
  const ogImage = `${APP_URL}/og/client.jpg`;

  return {
    title,
    description,
    alternates: {
      canonical: `/${locale}/client`,
      languages: { fr: "/fr/client", en: "/en/client" },
    },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "MTR Manufacture Tunisienne des Ressorts",
      images: [{ url: ogImage, width: 1200, height: 630, alt: t("ogAlt", { default: "Espace client MTR Manufacture Tunisienne des Ressorts" }) }],
      // (optionnel) locale OG : "fr_FR" / "en_US"
      // locale: locale === "fr" ? "fr_FR" : "en_US",
    },
    twitter: { card: "summary_large_image", title, description, images: [ogImage] },
    // l'espace client ne doit pas être indexé
    robots: { index: false, follow: false, googleBot: { index: false, follow: false, noimageindex: true } },
  };
}

export default async function Layout(props) {
  // ✅ Next 15 : params est une Promise
  const { locale } = await props.params;
  const { children } = props;

  return <ClientLayoutShell locale={locale}>{children}</ClientLayoutShell>;
}
