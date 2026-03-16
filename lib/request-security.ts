import { NextRequest } from "next/server"

type TrustedRequestResult =
  | { ok: true }
  | { ok: false; code: string; message: string }

const getRequestHost = (request: NextRequest) => {
  const forwardedHost = request.headers.get("x-forwarded-host")?.trim()
  if (forwardedHost) {
    return forwardedHost.toLowerCase()
  }

  const host = request.headers.get("host")?.trim()
  return host ? host.toLowerCase() : ""
}

const getUrlHost = (value: string | null) => {
  if (!value) {
    return null
  }

  try {
    return new URL(value).host.toLowerCase()
  } catch {
    return null
  }
}

export const assertTrustedAppRequest = (
  request: NextRequest,
  options?: {
    requireNavigationHeaders?: boolean
  }
): TrustedRequestResult => {
  const expectedHost = getRequestHost(request)
  if (!expectedHost) {
    return {
      ok: false,
      code: "UNTRUSTED_REQUEST",
      message: "Unable to verify request origin."
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site")?.toLowerCase()
  if (fetchSite === "cross-site") {
    return {
      ok: false,
      code: "CROSS_SITE_BLOCKED",
      message: "Cross-site requests are not allowed."
    }
  }

  const originHost = getUrlHost(request.headers.get("origin"))
  if (originHost && originHost !== expectedHost) {
    return {
      ok: false,
      code: "UNTRUSTED_ORIGIN",
      message: "Request origin is not allowed."
    }
  }

  const refererHost = getUrlHost(request.headers.get("referer"))
  if (refererHost && refererHost !== expectedHost) {
    return {
      ok: false,
      code: "UNTRUSTED_REFERER",
      message: "Request referer is not allowed."
    }
  }

  if (options?.requireNavigationHeaders && !originHost && !refererHost) {
    return {
      ok: false,
      code: "MISSING_REQUEST_ORIGIN",
      message: "Missing trusted browser origin headers."
    }
  }

  return { ok: true }
}
