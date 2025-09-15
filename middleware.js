import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './next-intl.config.ts';
import { NextResponse } from 'next/server';

const handleI18n = createIntlMiddleware(routing);

export function middleware(req) {
  const res = handleI18n(req);
  const url = res?.nextUrl ?? req.nextUrl;
  const pathname = url.pathname || '/';

  const maybeLocale = pathname.split('/')[1];
  const locale = ['fr','en','ar'].includes(maybeLocale) ? maybeLocale : routing.defaultLocale;

  const role = req.cookies.get('role')?.value || null;
  const isAdminPath  = pathname.startsWith(`/${locale}/admin`);
  const isClientPath = pathname.startsWith(`/${locale}/client`);

  if (isAdminPath && role !== 'admin') {
    return NextResponse.redirect(new URL(`/${locale}/unauthorized`, url));
  }
  if (isClientPath && role !== 'client') {
    return NextResponse.redirect(new URL(`/${locale}/login`, url));
  }

  return res;
}

export const config = {
  matcher: ['/', '/(fr|en|ar)/:path*', '/((?!fr|en|ar|api|_next|.*\\..*).*)']
};
