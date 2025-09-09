// app/api/devis/traction/route.js
import { NextResponse } from "next/server";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";


export async function POST(request) {
  try {
    // sécurité : exiger une session
    const token = request.cookies.get("token")?.value;
    if (!token) {
      return NextResponse.json(
        { success: false, message: "Veuillez vous connecter." },
        { status: 401 }
      );
    }


    // récupérer le FormData (avec fichiers)
    const formData = await request.formData();
    console.log("→ Envoi au backend:", `${BACKEND}/api/devis/torsion`);
    console.log("→ Token utilisé:", token.slice(0, 10) + "...");

    // proxy vers le backend (NE PAS définir Content-Type en multipart)
    const res = await fetch(`${BACKEND}/api/devis/torsion`, {
      method: "POST",
      body: formData,
      headers: { Authorization: `Bearer ${token}` },
    });

    console.log("← Réponse backend:", res.status);
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { message: text }; }

    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("proxy /api/devis/torsion:", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur (proxy traction)" },
      { status: 500 }
    );
  }
}