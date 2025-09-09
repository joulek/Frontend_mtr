// app/[locale]/admin/devis/AdminDevisSelector.jsx (أو وين موجود عندك)
"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

// Pages admin (listes)
import DevisCompressionList from "@/components/admin/devis/DevisCompressionList";
import DevisTractionList from "@/components/admin/devis/DevisTractionList";
import DevisTorsionList from "@/components/admin/devis/DevisTorsionList";
import DevisAutreList from "@/components/admin/devis/DevisAutreList";
import DevisFillList from "@/components/admin/devis/DevisFillList";
import DevisGrilleList from "@/components/admin/devis/DevisGrilleList";

// ❌ نحّينا imports متاع الصور من public
// ❌ ونحّينا import Image من "next/image"

export default function AdminDevisSelector() {
  const t = useTranslations("auth.admin.devisAdmin");
  const [type, setType] = useState("compression");

  const tl = (k) =>
    t.has(`types.${k}`)
      ? t(`types.${k}`)
      : {
          compression: "Compression",
          traction: "Traction",
          torsion: "Torsion",
          fill: "Fil dressé coupé",
          grille: "Grille métallique",
          autre: "Autre article",
        }[k];

  // ✅ نستعمل مسارات نصّية من مجلد public
  const TYPES = [
    { key: "compression", img: "/devis/compression_logo.png" },
    { key: "traction",    img: "/devis/ressort_traction_1.jpg" },
    { key: "torsion",     img: "/devis/torsion_ressorts.png" },
    { key: "fill",        img: "/devis/dresser.png" },
    { key: "grille",      img: "/devis/grille.png" },
    { key: "autre",       img: "/devis/autre.jpg" },
  ];

  const renderPage = () => {
    switch (type) {
      case "compression":
        return <DevisCompressionList />;
      case "traction":
        return <DevisTractionList />;
      case "torsion":
        return <DevisTorsionList />;
      case "fill":
        return <DevisFillList />;
      case "grille":
        return <DevisGrilleList />;
      case "autre":
        return <DevisAutreList />;
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <h1 className="mb-6 sm:mb-8 text-3xl font-extrabold tracking-tight text-[#002147] text-center">
        {t("title")}
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TYPES.map(({ key, img }) => {
          const active = type === key;
          const label = tl(key);

          return (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`rounded-xl border p-4 flex items-center gap-3 justify-start transition ${
                active
                  ? "border-yellow-500 bg-yellow-50 shadow"
                  : "border-gray-200 bg-white hover:border-yellow-400"
              }`}
            >
              {/* ✅ <img> بسيطة، بلا sharp ولا blur */}
              <img
                src={img}
                alt={label}
                className="w-10 h-10 object-cover overflow-hidden rounded-lg ring-1 ring-gray-200"
                loading="lazy"
                width={40}
                height={40}
              />
              <span className="font-semibold text-[#0B1E3A] text-left">
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">{renderPage()}</div>
    </div>
  );
}
