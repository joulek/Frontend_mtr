"use client";
import Link from "next/link";

export default function UnauthorizedPage() {
  return (
    <main className="mx-auto max-w-md p-6 text-center">
      <h1 className="text-2xl font-semibold">Accès refusé</h1>
      <p className="mt-2 opacity-80">
        Vous n'avez pas la permission d'accéder à cette page.
      </p>
      <Link
        href="/login"
        className="mt-6 inline-block rounded-lg px-4 py-2 bg-black text-white"
      >
        Se connecter
      </Link>
    </main>
  );
}
