import { NextResponse } from "next/server";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

export async function GET(request) {
  const token = request.cookies.get("token")?.value;
  if (!token) {
    return NextResponse.json({ success: false, message: "Non authentifié" }, { status: 401 });
  }

  const res = await fetch(`${BACKEND}/api/admin/devis/traction`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  // retourne tel quel la réponse du backend
  const text = await res.text();
  let data; try { data = JSON.parse(text); } catch { data = { success:false, message: text } }
  return NextResponse.json(data, { status: res.status });
}
