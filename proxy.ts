import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data: https:",
  "style-src 'self' 'unsafe-inline' https:",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://cdn.tailwindcss.com https://code.iconify.design https://kudoswall.org https://*.kudoswall.org",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://kudoswall.org https://*.kudoswall.org",
  "worker-src 'self' blob:",
  "upgrade-insecure-requests",
].join("; ");

const applySecurityHeaders = (response: NextResponse) => {
  response.headers.set("Content-Security-Policy", CONTENT_SECURITY_POLICY);
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "0");
  response.headers.set("Cross-Origin-Resource-Policy", "same-origin");
  response.headers.set("X-Permitted-Cross-Domain-Policies", "none");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  response.headers.set("Cross-Origin-Opener-Policy", "same-origin");
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  return response;
};

const isSecureRequest = (request: NextRequest) => {
  if (request.nextUrl.protocol === "https:") {
    return true;
  }

  return request.headers.get("x-forwarded-proto") === "https";
};

const getSetCookieHeaders = (response: NextResponse) => {
  const headersWithSetCookie = response.headers as Headers & {
    getSetCookie?: () => string[];
  };

  if (typeof headersWithSetCookie.getSetCookie === "function") {
    return headersWithSetCookie.getSetCookie();
  }

  const raw = response.headers.get("set-cookie");
  return raw ? [raw] : [];
};

const verifySecureCookieSettings = (request: NextRequest, response: NextResponse) => {
  const cookies = getSetCookieHeaders(response);
  if (cookies.length === 0) {
    return response;
  }

  const warnings: string[] = [];
  const secureRequest = isSecureRequest(request);

  for (const header of cookies) {
    const [cookiePair, ...attributes] = header.split(";").map((part) => part.trim());
    const cookieName = cookiePair.split("=")[0] ?? "";
    const normalizedAttributes = attributes.map((attribute) => attribute.toLowerCase());
    const isSessionLikeCookie = /^(__session|__clerk|__Secure-|__Host-)/i.test(cookieName);

    if (!isSessionLikeCookie) {
      continue;
    }

    if (secureRequest && !normalizedAttributes.includes("secure")) {
      warnings.push(`${cookieName}: missing Secure`);
    }

    const sameSiteAttribute = normalizedAttributes.find((attribute) => attribute.startsWith("samesite="));
    if (!sameSiteAttribute) {
      warnings.push(`${cookieName}: missing SameSite`);
    }

    if (
      /^(__session|__Secure-|__Host-)/i.test(cookieName) &&
      !normalizedAttributes.includes("httponly")
    ) {
      warnings.push(`${cookieName}: missing HttpOnly`);
    }
  }

  if (warnings.length > 0) {
    console.warn("Cookie security verification failed:", warnings.join(", "));
  }

  return response;
};

export default clerkMiddleware((_, request) => {
  const response = NextResponse.next();
  applySecurityHeaders(response);
  verifySecureCookieSettings(request, response);
  return response;
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
