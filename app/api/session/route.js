// app/api/session/route.js
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req) {
  // Cookies visibles 3ala domaine el FRONT
  const role   = req.cookies.get("role")?.value || null;   // posé au login côté front
  const token  = req.cookies.get("token")?.value || null;  // peut être vide si backend est sur autre domaine
  const consent = req.cookies.get("mtr_consent")?.value || null;

  // Considère l'utilisateur connecté si AU MOINS role existe
  const authenticated = Boolean(role || token);

  return NextResponse.json(
    { authenticated, role, consent: consent ? "set" : "none" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
