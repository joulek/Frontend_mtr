import { NextResponse } from "next/server";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

export async function GET(request, { params }) {
  const token = request.cookies.get("token")?.value;
  if (!token) return NextResponse.json({ success:false, message:"Non authentifié" }, { status:401 });

  const res = await fetch(`${BACKEND}/api/admin/devis/traction/${params.id}/pdf`, {
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok) return new NextResponse(await res.text(), { status: res.status });

  const buf = await res.arrayBuffer();
  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": "inline"
    }
  });
}
