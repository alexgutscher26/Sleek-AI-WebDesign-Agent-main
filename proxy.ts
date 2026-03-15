import { NextResponse } from 'next/server';
import { InsforgeMiddleware } from '@insforge/nextjs/middleware';
import { getInsforgeBaseUrl, getInsforgeSetupStatus } from './lib/insforge-config';

const insforgeMiddleware = InsforgeMiddleware({
  baseUrl: getInsforgeBaseUrl(),
  publicRoutes: ['/'],
});

export default function proxy(request: Request) {
  if (!getInsforgeSetupStatus().configured) {
    return NextResponse.next();
  }

  return insforgeMiddleware(request as never);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
