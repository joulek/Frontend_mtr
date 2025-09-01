import RegisterClient from "./RegisterClient";
import { SITE_URL } from "@/config/site";

export async function generateMetadata({ params }) {
   const { locale } = await params; 

  const titles = {
    fr: "Créer un compte – Espace client MTR",
    en: "Create an account – MTR Client Area",
  };
  const descriptions = {
    fr: "Inscrivez-vous pour accéder à votre espace client MTR et gérer vos commandes, factures et documents.",
    en: "Sign up to access your MTR client area and manage your orders, invoices and documents.",
  };

  const url = `${SITE_URL}/${locale}/register`;

  return {
    title: titles[locale] || titles.fr,
    description: descriptions[locale] || descriptions.fr,

    robots: {
      index: false,
      follow: false,
      nocache: true,
      googleBot: {
        index: false,
        follow: false,
        noimageindex: true,
      },
    },

    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr/register`,
        en: `${SITE_URL}/en/register`,
      },
    },

    openGraph: {
      type: "website",
      url,
      title: titles[locale] || titles.fr,
      description: descriptions[locale] || descriptions.fr,
      siteName: "MTR",
      images: [
        {
          url: `${SITE_URL}/logo.png`,
          width: 1200,
          height: 630,
          alt: "MTR – Register",
        },
      ],
    },

    twitter: {
      card: "summary_large_image",
      title: titles[locale] || titles.fr,
      description: descriptions[locale] || descriptions.fr,
      images: [`${SITE_URL}/og-login.png`],
    },
  };
}

export default function Page() {
  return <RegisterClient />;
}
