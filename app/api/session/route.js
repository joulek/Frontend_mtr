import { NextResponse } from "next/server";

export async function GET(request) {
  const token = request.cookies.get("token")?.value || "";
  const role  = request.cookies.get("role")?.value || "";
  // tu peux aussi renvoyer consent si tu veux le lire côté serveur
  const consent = request.cookies.get("mtr_consent")?.value || "";
  return NextResponse.json({ authenticated: !!token, role, consent: consent ? "set" : "none" });
}
