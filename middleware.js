// middleware.js
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config.ts';

// i18n uniquement
const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  return handleI18n(req);
}

export const config = {
  matcher: [
    '/',                       // redirige '/' vers la locale par défaut
    '/(fr|en|ar)/:path*',      // URLs déjà localisées
    '/((?!fr|en|ar|api|_next|.*\\..*).*)' // ajoute la locale sinon
  ]
};
