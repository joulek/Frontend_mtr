import { NextResponse } from "next/server";
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

export async function GET(request) {
  try {
    const res = await fetch(`${BACKEND}/api/admin/users`, {
      method: "GET",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    });

    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = text; }

    const users = Array.isArray(data) ? data : (data.users || data.data || data.items || []);
    return NextResponse.json({ success: true, users }, { status: res.status });
  } catch (err) {
    return NextResponse.json({ success: false, message: "Proxy users error" }, { status: 500 });
  }
}
