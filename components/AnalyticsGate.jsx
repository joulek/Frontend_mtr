"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { readConsent } from "@/utils/consent";

export default function AnalyticsGate() {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const apply = () => {
      const c = readConsent();
      setEnabled(!!c?.analytics);
    };
    apply();
    window.addEventListener("mtr:consent:changed", apply);
    return () => window.removeEventListener("mtr:consent:changed", apply);
  }, []);

  if (!enabled) return null;

  // Exemple GA4 – remplace G-XXXX par ton id si tu l'utilises
  return (
    <>
      <Script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXX" />
      <Script id="ga-init">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXX', { anonymize_ip: true });
        `}
      </Script>
    </>
  );
}
