"use client";

import dynamic from "next/dynamic";
import SiteHeader from "@/components/SiteHeader";

// On charge le formulaire côté client uniquement
const ReclamationClient = dynamic(
  () => import("../client/reclamations/ReclamationClient"),
  { ssr: false }
);

export default function Page() {
  // Pas de gate d'auth ici -> accessible à tous
  return (
    <>
      <SiteHeader />

      <main className="pt-6 bg-[#f5f5f5] min-h-screen px-4 py-10">
        <div className="max-w-5xl mx-auto">
          <ReclamationClient userIdFromProps={null} />
        </div>
      </main>
    </>
  );
}