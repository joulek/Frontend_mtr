// app/api/auth/set-password/route.js
import { NextResponse } from "next/server";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";
export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const payload = await request.json();
    if (!payload?.uid || !payload?.token || !payload?.password) {
      return NextResponse.json(
        { success: false, message: "Lien invalide" },
        { status: 400 }
      );
    }

    const res = await fetch(`${BACKEND}/api/auth/set-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { message: text }; }
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    console.error("proxy /api/auth/set-password:", err);
    return NextResponse.json(
      { success: false, message: "Erreur serveur (proxy set-password)" },
      { status: 500 }
    );
  }
}
