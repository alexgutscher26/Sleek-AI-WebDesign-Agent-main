import { createHmac, randomUUID, timingSafeEqual } from "node:crypto"

type UploadTokenPayload = {
  userId: string
  filename: string
  mediaType: string
  size: number
  uploadId: string
  exp: number
}

const UPLOAD_SIGNING_SECRET =
  process.env.UPLOAD_SIGNING_SECRET ??
  process.env.CLERK_SECRET_KEY ??
  "development-upload-signing-secret"

const toBase64Url = (value: string | Buffer) => Buffer.from(value).toString("base64url")

const fromBase64Url = (value: string) => Buffer.from(value, "base64url")

const signPayload = (payload: string) =>
  createHmac("sha256", UPLOAD_SIGNING_SECRET).update(payload).digest()

export const issueSignedUploadToken = (input: {
  userId: string
  filename: string
  mediaType: string
  size: number
  ttlSeconds?: number
}) => {
  const payload: UploadTokenPayload = {
    userId: input.userId,
    filename: input.filename,
    mediaType: input.mediaType,
    size: input.size,
    uploadId: randomUUID(),
    exp: Math.floor(Date.now() / 1000) + (input.ttlSeconds ?? 300),
  }

  const encodedPayload = toBase64Url(JSON.stringify(payload))
  const signature = toBase64Url(signPayload(encodedPayload))

  return {
    token: `${encodedPayload}.${signature}`,
    payload,
  }
}

export const verifySignedUploadToken = (token: string) => {
  const [encodedPayload, encodedSignature] = token.split(".")
  if (!encodedPayload || !encodedSignature) {
    return { ok: false as const, message: "Invalid upload token." }
  }

  const expectedSignature = signPayload(encodedPayload)
  const actualSignature = fromBase64Url(encodedSignature)

  if (
    expectedSignature.length !== actualSignature.length ||
    !timingSafeEqual(expectedSignature, actualSignature)
  ) {
    return { ok: false as const, message: "Invalid upload signature." }
  }

  let payload: UploadTokenPayload
  try {
    payload = JSON.parse(fromBase64Url(encodedPayload).toString("utf8")) as UploadTokenPayload
  } catch {
    return { ok: false as const, message: "Malformed upload token." }
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    return { ok: false as const, message: "Upload token has expired." }
  }

  return {
    ok: true as const,
    payload,
  }
}

export const createUploadUrl = (token: string) => `/api/upload/${encodeURIComponent(token)}`
