// middleware.js
import { NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config.ts';

// 1) i18n: ajoute la locale par défaut sur "/" et normalise les URLs
const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  // Laisser next-intl réécrire/normaliser l'URL d'abord
  const i18nResponse = handleI18n(req);
  const url = i18nResponse?.nextUrl ?? req.nextUrl;

  const pathname = url.pathname || '/';

  // locale déduite du chemin (ex: /fr/..., /en/..., /ar/...)
  const maybeLocale = pathname.split('/')[1];
  const locale = routing.locales.includes(maybeLocale)
    ? maybeLocale
    : routing.defaultLocale;

  // 2) Auth simple par cookies
  const token = req.cookies.get('token')?.value || null;
  const role  = req.cookies.get('role')?.value  || null;

  const isAdminPath  = pathname.startsWith(`/${locale}/admin`);
  const isClientPath = pathname.startsWith(`/${locale}/client`);
  const isProtected  = isAdminPath || isClientPath;

  // Non connecté -> login
  if (isProtected && !token) {
    return NextResponse.redirect(new URL(`/${locale}/login`, url));
  }

  // Mauvais rôle -> unauthorized
  if (isAdminPath && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/unauthorized`, url));
  }
  if (isClientPath && role !== 'client') {
    return NextResponse.redirect(new URL(`/${locale}/unauthorized`, url));
  }

  // 3) Continuer avec la réponse i18n (préserve réécritures/headers)
  return i18nResponse;
}

// Appliquer le middleware sur les bonnes routes
export const config = {
  matcher: [
    '/',                         // racine → sera réécrite vers /fr (par défaut)
    '/(fr|en|ar)/:path*',        // URLs déjà localisées
    '/((?!fr|en|api|_next|.*\\..*).*)' // sans locale → i18n l’ajoute
  ]
};
