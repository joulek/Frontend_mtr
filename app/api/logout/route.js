// app/api/logout/route.js
import { NextResponse } from "next/server";

export async function POST() {
  const resp = NextResponse.json({ success: true, message: "Déconnexion réussie" });
  resp.cookies.set("token", "", { path: "/", maxAge: 0 });
  resp.cookies.set("role", "", { path: "/", maxAge: 0 });
  return resp;
}
