// app/api/register/route.js
import { NextResponse } from "next/server";
const BACKEND_URL = "https://backend-mtr.onrender.com";

export async function POST(request) {
  try {
    const body = await request.json();

    const res = await fetch(`${BACKEND_URL}/api/auth/register-client`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log("REGISTER backend raw:", text); // <-- utile

    let data;
    try { data = JSON.parse(text); }
    catch { data = { message: text || "Réponse non JSON du backend" }; }

    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    console.error("Erreur /api/register:", e);
    return NextResponse.json({ message: "Erreur serveur interne (proxy register)" }, { status: 500 });
  }
}
