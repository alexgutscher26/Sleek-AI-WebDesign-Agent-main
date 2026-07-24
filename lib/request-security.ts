import { headers } from "next/headers"
import { NextRequest } from "next/server"

type TrustedRequestResult = { ok: true } | { ok: false; code: string; message: string }

type HeaderSource = Pick<Headers, "get">

const getRequestHost = (headerSource: HeaderSource) => {
  const forwardedHost = headerSource.get("x-forwarded-host")?.trim()
  if (forwardedHost) {
    return forwardedHost.toLowerCase()
  }

  const host = headerSource.get("host")?.trim()
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

const assertTrustedHeaders = (
  headerSource: HeaderSource,
  options?: {
    requireNavigationHeaders?: boolean
  }
): TrustedRequestResult => {
  const expectedHost = getRequestHost(headerSource)
  if (!expectedHost) {
    return {
      ok: false,
      code: "UNTRUSTED_REQUEST",
      message: "Unable to verify request origin.",
    }
  }

  const fetchSite = headerSource.get("sec-fetch-site")?.toLowerCase()
  if (fetchSite === "cross-site") {
    return {
      ok: false,
      code: "CROSS_SITE_BLOCKED",
      message: "Cross-site requests are not allowed.",
    }
  }

  const originHost = getUrlHost(headerSource.get("origin"))
  if (originHost && originHost !== expectedHost) {
    return {
      ok: false,
      code: "UNTRUSTED_ORIGIN",
      message: "Request origin is not allowed.",
    }
  }

  const refererHost = getUrlHost(headerSource.get("referer"))
  if (refererHost && refererHost !== expectedHost) {
    return {
      ok: false,
      code: "UNTRUSTED_REFERER",
      message: "Request referer is not allowed.",
    }
  }

  if (options?.requireNavigationHeaders && !originHost && !refererHost) {
    return {
      ok: false,
      code: "MISSING_REQUEST_ORIGIN",
      message: "Missing trusted browser origin headers.",
    }
  }

  return { ok: true }
}

export const assertTrustedAppRequest = (
  request: NextRequest,
  options?: {
    requireNavigationHeaders?: boolean
  }
): TrustedRequestResult => assertTrustedHeaders(request.headers, options)

export const assertTrustedServerActionRequest = async (options?: {
  requireNavigationHeaders?: boolean
}): Promise<TrustedRequestResult> => {
  const headerStore = await headers()
  return assertTrustedHeaders(headerStore, options)
}
