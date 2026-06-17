import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  // We explicitly exclude /admin, /api, /next, /_next, and static files
  matcher: ['/', '/(ro|en)/:path*', '/((?!admin|api|next|_next|_vercel|.*\\..*).*)']
};
