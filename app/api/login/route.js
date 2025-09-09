// app/api/login/route.js
import { NextResponse } from "next/server";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

export async function POST(request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(body),
    });

    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { message: text || "Réponse non JSON du backend" }; }

    const reply = NextResponse.json(data, { status: res.status });

    if (res.ok && data?.token) {
      // ✅ pose TOUJOURS le token si présent
      reply.cookies.set("token", data.token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      // 🔎 essaie de trouver le rôle (plusieurs sources possibles)
      let role =
        data.role ||
        data.user?.role ||
        (() => {
          try {
            const payload = JSON.parse(Buffer.from(data.token.split(".")[1], "base64").toString("utf8"));
            return payload.role;
          } catch { return undefined; }
        })();

      if (role) {
        reply.cookies.set("role", role, {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });
      }
    } else {
      // échec login → nettoie d'éventuels vieux cookies
      reply.cookies.set("token", "", { path: "/", maxAge: 0 });
      reply.cookies.set("role", "", { path: "/", maxAge: 0 });
    }

    return reply;
  } catch (err) {
    console.error("Erreur /api/login:", err);
    return NextResponse.json(
      { message: "Erreur serveur interne (proxy login)" },
      { status: 500 }
    );
  }
}
