// app/api/produits/route.js
import { NextResponse } from "next/server";
import { proxyMultipart, proxyGet } from "@/app/api/_utils/proxy";

const BASE = process.env.NEXT_PUBLIC_BACKEND_URL;

// -------------------------------
// CREATE (multipart: images)
// -------------------------------
export async function POST(req) {
  // On forward tel quel (multipart) -> backend POST /api/products
  return proxyMultipart(req, "/api/products");
}

// -------------------------------
// READ
// - GET liste:       /api/produits
// - GET par id:      /api/produits?id=PRODUCT_ID
// - support query:   /api/produits?search=...&page=... (relay au backend)
// -------------------------------
export async function GET(req) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (id) {
      const res = await fetch(`${BASE}/api/products/${id}`, { method: "GET" });
      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    // Liste avec querystring relayé
    const qs = url.searchParams.toString();
    const target = `/api/products${qs ? `?${qs}` : ""}`;
    // Si ton proxyGet accepte un chemin complet avec query
    return proxyGet(target);
  } catch (err) {
    return NextResponse.json({ message: "Error fetching products", error: String(err) }, { status: 500 });
  }
}

// -------------------------------
// UPDATE
// - JSON sans image: body JSON { id, ... }
// - Multipart avec images: form-data (id dans query ?id=... ou dans body "id")
// -------------------------------
export async function PUT(req) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    // On détecte le type de contenu
    const ctype = req.headers.get("content-type") || "";

    // ----- Cas multipart (ex: ajout d'images + champs FR/EN + category)
    if (ctype.startsWith("multipart/form-data")) {
      // Lire le form-data entrant
      const inForm = await req.formData();

      // Récupérer id depuis form-data si non présent en query
      if (!id) id = inForm.get("id");

      if (!id) {
        return NextResponse.json({ message: "Missing product id" }, { status: 400 });
      }

      // Recomposer un nouveau FormData (Node 18+ -> Web FormData)
      const outForm = new FormData();
      for (const [key, value] of inForm.entries()) {
        // On évite de renvoyer le champ "id" dans le body (l'id est dans l'URL)
        if (key === "id") continue;
        outForm.append(key, value);
      }

      const res = await fetch(`${BASE}/api/products/${id}`, {
        method: "PUT",
        body: outForm,
        // headers: ne rien forcer: fetch gère le boundary multipart
      });

      const data = await res.json().catch(() => ({}));
      return NextResponse.json(data, { status: res.status });
    }

    // ----- Cas JSON (maj sans images)
    // Body attendu : { id, name_fr?, name_en?, description_fr?, description_en?, category? }
    const body = await req.json().catch(() => ({}));
    if (!id) id = body?.id;
    if (!id) {
      return NextResponse.json({ message: "Missing product id" }, { status: 400 });
    }

    const { id: _omit, ...rest } = body || {};
    const res = await fetch(`${BASE}/api/products/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(rest),
    });

    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ message: "Error updating product", error: String(err) }, { status: 500 });
  }
}

// -------------------------------
// DELETE
// - /api/produits?id=PRODUCT_ID
// - (fallback) body JSON { id }
// -------------------------------
export async function DELETE(req) {
  try {
    const url = new URL(req.url);
    let id = url.searchParams.get("id");

    if (!id) {
      // Certains clients envoient l'id dans le body JSON
      try {
        const body = await req.json();
        id = body?.id;
      } catch {}
    }

    if (!id) {
      return NextResponse.json({ message: "Missing product id" }, { status: 400 });
    }

    const res = await fetch(`${BASE}/api/products/${id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    return NextResponse.json(data, { status: res.status });
  } catch (err) {
    return NextResponse.json({ message: "Error deleting product", error: String(err) }, { status: 500 });
  }
}
