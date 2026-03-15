import { createHash } from "node:crypto";
import { NextRequest } from "next/server";

const IPV4_MAPPED_IPV6_PREFIX = "::ffff:"

export const USER_GENERATION_LIMIT_WINDOW_SECONDS = 10 * 60
export const IP_GENERATION_LIMIT_WINDOW_SECONDS = 10 * 60
export const REGENERATE_COOLDOWN_SECONDS = 20

export class RateLimitError extends Error {
  code: string
  retryAfterSeconds: number

  constructor(code: string, message: string, retryAfterSeconds: number) {
    super(message)
    this.name = "RateLimitError"
    this.code = code
    this.retryAfterSeconds = retryAfterSeconds
  }
}

const normalizeIp = (value: string) => {
  const trimmed = value.trim()
  if (!trimmed) {
    return null
  }

  if (trimmed.startsWith(IPV4_MAPPED_IPV6_PREFIX)) {
    return trimmed.slice(IPV4_MAPPED_IPV6_PREFIX.length)
  }

  return trimmed
}

export const getClientIp = (request: NextRequest) => {
  const forwardedFor = request.headers.get("x-forwarded-for")
  if (forwardedFor) {
    const firstIp = forwardedFor.split(",")[0]
    const normalized = normalizeIp(firstIp)
    if (normalized) {
      return normalized
    }
  }

  const fallbackHeaders = ["x-real-ip", "cf-connecting-ip", "true-client-ip"]
  for (const header of fallbackHeaders) {
    const value = request.headers.get(header)
    if (!value) {
      continue
    }

    const normalized = normalizeIp(value)
    if (normalized) {
      return normalized
    }
  }

  return null
}

export const hashClientIp = (ip: string | null) => {
  if (!ip) {
    return null
  }

  return createHash("sha256")
    .update(ip)
    .digest("hex")
}

export const mapGenerationRateLimitError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return null
  }

  const message = error.message.toUpperCase()

  if (message.includes("USER_RATE_LIMIT_EXCEEDED")) {
    return new RateLimitError(
      "USER_RATE_LIMIT_EXCEEDED",
      "You have hit the generation limit for the last 10 minutes. Please wait a bit before generating again.",
      USER_GENERATION_LIMIT_WINDOW_SECONDS
    )
  }

  if (message.includes("IP_RATE_LIMIT_EXCEEDED")) {
    return new RateLimitError(
      "IP_RATE_LIMIT_EXCEEDED",
      "This connection has hit the generation limit for the last 10 minutes. Please wait before trying again.",
      IP_GENERATION_LIMIT_WINDOW_SECONDS
    )
  }

  if (message.includes("REGENERATE_COOLDOWN_ACTIVE")) {
    return new RateLimitError(
      "REGENERATE_COOLDOWN_ACTIVE",
      "That page was regenerated very recently. Please wait a few seconds before regenerating it again.",
      REGENERATE_COOLDOWN_SECONDS
    )
  }

  return null
}
