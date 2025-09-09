import { NextResponse } from "next/server";
import { cookies } from "next/headers";

const BACKEND =
  process.env.NEXT_PUBLIC_BACKEND_URL || "https://backend-mtr.onrender.com";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const ids = searchParams.get("ids") ?? "";

  // ✅ لازم await
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value ?? "";

  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const upstream = await fetch(
      `${BACKEND}/api/order/client/status?ids=${encodeURIComponent(ids)}`,
      { headers, cache: "no-store" }
    );

    const text = await upstream.text();
    return new NextResponse(text, {
      status: upstream.status,
      headers: {
        "content-type":
          upstream.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Proxy error" },
      { status: 502 }
    );
  }
}
