import { ALLOWED_FILE_MIME_TYPES, MAX_FILE_SIZE_BYTES } from "@/lib/request-limits"

type FileSignatureCheck = {
  ok: true
  byteLength: number
} | {
  ok: false
  message: string
}

const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/
const ALLOWED_FILE_MIME_TYPE_SET = new Set(ALLOWED_FILE_MIME_TYPES)

const decodeBase64 = (value: string) => {
  if (!BASE64_PATTERN.test(value.replace(/\s+/g, ""))) {
    throw new Error("Invalid base64 payload.")
  }

  return Uint8Array.from(Buffer.from(value, "base64"))
}

const hasPrefix = (bytes: Uint8Array, prefix: number[]) =>
  prefix.every((value, index) => bytes[index] === value)

const sniffMimeType = (bytes: Uint8Array) => {
  if (bytes.length >= 3 && hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg"
  }

  if (bytes.length >= 8 && hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }

  if (bytes.length >= 6) {
    const header = String.fromCharCode(...bytes.slice(0, 6))
    if (header === "GIF87a" || header === "GIF89a") {
      return "image/gif"
    }
  }

  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp"
  }

  return null
}

export function verifyInlineFilePayload(
  url: string,
  mediaType: string,
  expectedSize?: number
): FileSignatureCheck {
  if (!ALLOWED_FILE_MIME_TYPE_SET.has(mediaType as (typeof ALLOWED_FILE_MIME_TYPES)[number])) {
    return {
      ok: false,
      message: "Unsupported uploaded file type."
    }
  }

  if (!url.startsWith("data:")) {
    return {
      ok: false,
      message: "Uploaded files must be sent as inline data URLs."
    }
  }

  const match = url.match(/^data:([^;,]+);base64,([\s\S]+)$/)
  if (!match) {
    return {
      ok: false,
      message: "Uploaded files must use base64 data URLs."
    }
  }

  const [, declaredDataUrlType, base64Payload] = match

  if (declaredDataUrlType !== mediaType) {
    return {
      ok: false,
      message: "Uploaded file MIME metadata does not match the inline payload."
    }
  }

  let bytes: Uint8Array
  try {
    bytes = decodeBase64(base64Payload)
  } catch {
    return {
      ok: false,
      message: "Uploaded file data could not be decoded."
    }
  }

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: `Files must be between 1 byte and ${MAX_FILE_SIZE_BYTES} bytes.`
    }
  }

  if (typeof expectedSize === "number" && expectedSize !== bytes.byteLength) {
    return {
      ok: false,
      message: "Uploaded file size metadata does not match the inline payload."
    }
  }

  const sniffedMimeType = sniffMimeType(bytes)

  if (sniffedMimeType !== mediaType) {
    return {
      ok: false,
      message: "Uploaded file content does not match the declared file type."
    }
  }

  return {
    ok: true,
    byteLength: bytes.byteLength
  }
}

export function verifyBinaryFilePayload(
  bytes: Uint8Array,
  mediaType: string,
  expectedSize?: number
): FileSignatureCheck {
  if (!ALLOWED_FILE_MIME_TYPE_SET.has(mediaType as (typeof ALLOWED_FILE_MIME_TYPES)[number])) {
    return {
      ok: false,
      message: "Unsupported uploaded file type."
    }
  }

  if (bytes.byteLength === 0 || bytes.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      message: `Files must be between 1 byte and ${MAX_FILE_SIZE_BYTES} bytes.`
    }
  }

  if (typeof expectedSize === "number" && expectedSize !== bytes.byteLength) {
    return {
      ok: false,
      message: "Uploaded file size metadata does not match the payload."
    }
  }

  const sniffedMimeType = sniffMimeType(bytes)

  if (sniffedMimeType !== mediaType) {
    return {
      ok: false,
      message: "Uploaded file content does not match the declared file type."
    }
  }

  return {
    ok: true,
    byteLength: bytes.byteLength
  }
}
