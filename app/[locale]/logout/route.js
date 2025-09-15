import { NextResponse } from "next/server";

// (optionnel) exécution edge = latence plus faible
export const runtime = "nodejs";
// (optionnel) jamais mis en cache
export const dynamic = "force-dynamic";

const COOKIE_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",   // ⚠️ doit matcher la config du login
  path: "/",         // ⚠️ idem
  // domain: ".ton-domaine.com", // si utilisé au login, remets-le ici
};

export async function POST() {
  const res = new NextResponse(null, {
    status: 204, // plus léger/rapide qu'un JSON
    headers: { "Cache-Control": "no-store", "Location": "/login" }, // redirection vers /login
  });

  const gone = { ...COOKIE_BASE, maxAge: 0, expires: new Date(0) };
  res.cookies.set("token", "", gone);
  res.cookies.set("role", "", gone);
  res.cookies.set("rememberMe", "", gone); // Supprime aussi le cookie rememberMe si utilisé
  // supprime ici d'autres cookies d'auth si tu en as (refresh, etc.)

  return res;
}

// (facultatif) si tu appelles /api/logout depuis un autre origin
export async function OPTIONS() {
  const res = new NextResponse(null, { status: 204 });
  res.headers.set("Access-Control-Allow-Origin", process.env.NEXT_PUBLIC_APP_ORIGIN ?? "*");
  res.headers.set("Access-Control-Allow-Credentials", "true");
  res.headers.set("Access-Control-Allow-Methods", "POST,OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "content-type");
  return res;
}
