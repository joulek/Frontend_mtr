import LoginClient from "./LoginClient";
import { SITE_URL } from "@/config/site";

// ⚠️ Ici pas de "use client" : ce fichier reste côté serveur pour le SEO
export async function generateMetadata({ params }) {
   const { locale } = await params; 

  // Titres/desc simples (tu peux affiner par locale si tu veux)
  const titles = {
    fr: "Connexion – Espace client MTR",
    en: "Sign in – MTR Client Area"
  };
  const descriptions = {
    fr: "Accédez à votre espace client MTR pour consulter vos factures, commandes et documents.",
    en: "Access your MTR client area to view invoices, orders and documents."  };

  const url = `${SITE_URL}/${locale}/login`;

  return {
    // Titre / description
    title: titles[locale] || titles.fr,
    description: descriptions[locale] || descriptions.fr,

    // Très important pour une page de login : éviter l’indexation
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

    // Canonical & hreflang
    alternates: {
      canonical: url,
      languages: {
        fr: `${SITE_URL}/fr/login`,
        en: `${SITE_URL}/en/login`,
      },
    },

    // Open Graph
    openGraph: {
      type: "website",
      url,
      title: titles[locale] || titles.fr,
      description: descriptions[locale] || descriptions.fr,
      siteName: "MTR",
      images: [
        {
          url: `${SITE_URL}/og-login.png`, // ajoute une image 1200x630 dans /public
          width: 1200,
          height: 630,
          alt: "MTR – Login",
        },
      ],
    },

    // Twitter Card
    twitter: {
      card: "summary_large_image",
      title: titles[locale] || titles.fr,
      description: descriptions[locale] || descriptions.fr,
      images: [`${SITE_URL}/og-login.jpg`],
    },
  };
}

export default function Page() {
  return <LoginClient />;
}
