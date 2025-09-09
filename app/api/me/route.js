// app/api/me/route.js
import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

export async function GET() {
  try {
    // 🔁 Récupère le cookie de session du client et le forward au backend
    const cookieHeader = cookies().toString(); // ex: "connect.sid=xxx; other=yyy"
    const auth = headers().get("authorization") || "";

    const res = await fetch(`${BACKEND_URL.replace(/\/$/, "")}/api/auth/me`, {
      method: "GET",
      cache: "no-store",
      headers: {
        cookie: cookieHeader,            // ⬅️ indispensable pour la session !
        authorization: auth,             // (si jamais tu utilises un Bearer)
        "x-forwarded-by": "next-app",    // optionnel
      },
    });

    const data = await res.json().catch(() => ({}));

    // On renvoie le même code au front pour que le header sache si 401/403
    return NextResponse.json(data, { status: res.status });
  } catch (error) {
    return NextResponse.json(
      { message: "Erreur lors de la récupération du profil" },
      { status: 500 }
    );
  }
}
