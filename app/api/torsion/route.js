import { proxyMultipart, proxyGet } from "@/app/api/_utils/proxy";

export async function POST(req) {
  return proxyMultipart(req, "/api/devis/torsion");
}

export async function GET() {
  return proxyGet("/api/devis/torsion");
}
