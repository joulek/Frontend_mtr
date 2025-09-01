// app/[locale]/layout.tsx
import '../globals.css';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { ReactNode } from 'react';

// ⬇️ AJOUTS
import CookieBanner from '@/components/CookieBanner';
import AnalyticsGate from '@/components/AnalyticsGate';

export function generateStaticParams() {
  return [{ locale: 'fr' }, { locale: 'en' }];
}

async function getMessages(locale: string) {
  try {
    return (await import(`../../messages/${locale}.json`)).default;
  } catch {
    notFound();
  }
}

export default async function LocaleLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>; // Next 15
}) {
  const { locale } = await params;     // await le promise params
  const messages = await getMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}

      {/* ⬇️ Bannière cookies visible si pas encore de consentement */}
      <CookieBanner />

      {/* ⬇️ Charge GA (ou autres scripts) seulement si consentement analytics = true */}
      <AnalyticsGate />
    </NextIntlClientProvider>
  );
}
