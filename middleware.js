// middleware.js
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config.ts';

// i18n uniquement : ajoute/normalise la locale dans l’URL
const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  // ⚠️ Pas d’auth ici : on ne peut pas lire le cookie JWT du backend
  return handleI18n(req);
}

// On applique le middleware seulement pour l’i18n.
// (Évite /api, /_next, fichiers statiques, etc.)
export const config = {
  matcher: [
    '/',                                   // racine → redirigée vers la locale par défaut
    `/(?:${routing.locales.join('|')})/:path*`, // URLs déjà localisées (fr|en|ar…)
    '/((?!_next|api|.*\\..*).*)'           // chemins sans locale (on la préfixe)
  ]
};
