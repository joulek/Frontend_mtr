"use client";
import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";

// Pages admin (listes)
import DevisCompressionList from "@/components/admin/devis/DevisCompressionList";
import DevisTractionList from "@/components/admin/devis/DevisTractionList";
import DevisTorsionList from "@/components/admin/devis/DevisTorsionList";
import DevisAutreList from "@/components/admin/devis/DevisAutreList";
import DevisFillList from "@/components/admin/devis/DevisFillList";
import DevisGrilleList from "@/components/admin/devis/DevisGrilleList";
// Images
import compressionImg from "@/public/devis/compression_logo.png";
import tractionImg from "@/public/devis/ressort_traction_1.jpg";
import torsionImg from "@/public/devis/torsion_ressorts.png";
import fillImg from "@/public/devis/dresser.png";
import grillImg from "@/public/devis/grille.png";
import autresImg from "@/public/devis/autre.jpg";

export default function AdminDevisSelector() {
  const [type, setType] = useState("compression");
  const t = useTranslations("auth.devis");

  const TYPES = [
    { key: "compression", label: t("types.compression"), img: compressionImg },
    { key: "traction", label: t("types.traction"), img: tractionImg },
    { key: "torsion", label: t("types.torsion"), img: torsionImg },
    { key: "fill", label: t("types.fil"), img: fillImg },
    { key: "grille", label: t("types.grille") || "", img: grillImg },
    { key: "autre", label: t("types.autre") || "", img: autresImg },
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
      <h1 className="mb-6 sm:mb-8 text-3xl font-extrabold tracking-tight text-[#0B1E3A] text-center">
        Gestion des demandes de devis
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {TYPES.map(({ key, label, img }) => {
          const active = type === key;
          return (
            <button
              key={key}
              onClick={() => setType(key)}
              className={`rounded-xl border p-4 flex items-center gap-3 justify-start transition ${active
                  ? "border-yellow-500 bg-yellow-50 shadow"
                  : "border-gray-200 bg-white hover:border-yellow-400"
                }`}
            >
              <div className="relative w-10 h-10 overflow-hidden rounded-lg ring-1 ring-gray-200">
                <Image src={img} alt={label} fill className="object-cover" />
              </div>
              <span className="font-semibold text-[#0B1E3A] text-left">{label}</span>
            </button>

          );
        })}
      </div>

      <div className="mt-8 bg-white rounded-lg shadow p-6">{renderPage()}</div>
    </div>
  );
}
