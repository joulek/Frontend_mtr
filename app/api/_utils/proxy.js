import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { BACKEND_URL } from "@/app/config";

// Proxy générique pour POST multipart + GET JSON
export async function proxyMultipart(req, backendPath) {
  const token = cookies().get("token")?.value;
  const fd = await req.formData();

  const res = await fetch(`${BACKEND_URL}${backendPath}`, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: fd, // surtout ne pas mettre Content-Type, le browser gère (multipart)
  });

  const text = await res.text(); // renvoyer tel quel
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}

export async function proxyGet(backendPath) {
  const token = cookies().get("token")?.value;

  const res = await fetch(`${BACKEND_URL}${backendPath}`, {
    method: "GET",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    // next: { revalidate: 0 } // si tu veux éviter le cache
  });

  const text = await res.text();
  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  });
}
