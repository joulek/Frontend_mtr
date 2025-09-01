// app/[locale]/client/layout.client.jsx
"use client";

import SiteHeader from "@/components/SiteHeader";
import { useRouter } from "next/navigation";

export default function ClientLayoutShell({ children, locale }) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/logout", { method: "POST", credentials: "include" });
    } finally {
      router.push(`/${locale}/login`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <SiteHeader mode="client" onLogout={handleLogout} />
      <main className="flex-1">{children}</main>
    </div>
  );
}
