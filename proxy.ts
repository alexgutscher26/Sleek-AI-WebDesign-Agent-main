import { InsforgeMiddleware } from '@insforge/nextjs/middleware';
import { getInsforgeBaseUrl } from './lib/insforge-config';

export default InsforgeMiddleware({
  baseUrl: getInsforgeBaseUrl(),
  publicRoutes: ['/'],
});

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
