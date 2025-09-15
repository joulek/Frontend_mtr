import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const token = request.cookies.get("token")?.value || "";
  const role  = request.cookies.get("role")?.value || "";

  // اعتبره لوجيّن كان فما token "أو" role (خاطر role نحطّوه من الفرونت)
  const authenticated = Boolean(token || role);

  return NextResponse.json(
    { authenticated, role: role || "" },
    { headers: { "Cache-Control": "no-store" } }
  );
}
