// app/api/categories/route.js
import { proxyMultipart, proxyGet } from "@/app/api/_utils/proxy";
import { NextResponse } from "next/server";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

// CREATE
export async function POST(req) {
  // Si tu uploades une image/logo de catégorie, garde proxyMultipart
  return proxyMultipart(req, "/api/categories");
}

// READ (list)
export async function GET() {
  const res = await fetch(`${BASE}/api/categories`, { method: "GET" });
  const data = await res.json().catch(() => ([]));
  return NextResponse.json(data, { status: res.status });
}


// UPDATE
export async function PUT(req) {
  try {
    // accepter id via body JSON OU via query ?id=...
    const url = new URL(req.url);
    let idFromQuery = url.searchParams.get("id");

    let payload = {};
    try {
      payload = await req.json();
    } catch (_) {
      // pas de body JSON → OK
    }

    const id = payload.id || idFromQuery;
    if (!id) {
      return NextResponse.json({ message: "Missing category id" }, { status: 400 });
    }

    // on n’envoie pas l’id dans le body au backend REST /:id
    const { id: _omit, ...rest } = payload;

    const res = await fetch(`${BASE}/api/categories/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rest),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ message: "Error updating category", error: String(err) }, { status: 500 });
  }
}

// DELETE
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    // priorité au query param ?id=...
    let id = url.searchParams.get("id");

    // fallback: tenter de lire le body JSON { id }
    if (!id) {
      try {
        const body = await req.json();
        id = body?.id;
      } catch (_) {}
    }

    if (!id) {
      return NextResponse.json({ message: "Missing category id" }, { status: 400 });
    }

    const res = await fetch(`${BASE}/api/categories/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ message: "Error deleting category", error: String(err) }, { status: 500 });
  }
}
