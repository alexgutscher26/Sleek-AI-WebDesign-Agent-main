import { NextRequest } from "next/server"
import { getAuthServer } from "@/lib/insforge-server"
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response"
import { parseJsonBody } from "@/lib/api-validation"
import { assertTrustedAppRequest } from "@/lib/request-security"
import { ALLOWED_FILE_MIME_TYPES, MAX_FILE_SIZE_BYTES, MIME_EXTENSIONS } from "@/lib/request-limits"
import { createUploadUrl, issueSignedUploadToken } from "@/lib/upload-signing"

const ALLOWED_FILE_TYPES = new Set(ALLOWED_FILE_MIME_TYPES)

export async function POST(request: NextRequest) {
  try {
    const trustedRequest = assertTrustedAppRequest(request, {
      requireNavigationHeaders: true
    })
    if (!trustedRequest.ok) {
      return createErrorResponse(403, trustedRequest.code, trustedRequest.message)
    }

    const { user } = await getAuthServer()
    if (!user) {
      return createErrorResponse(401, "UNAUTHORIZED", "Unauthorized")
    }

    const body = await parseJsonBody(request) as {
      filename?: unknown
      mediaType?: unknown
      size?: unknown
    }

    const filename = typeof body.filename === "string" ? body.filename.trim() : ""
    const mediaType = typeof body.mediaType === "string" ? body.mediaType.trim() : ""
    const size = typeof body.size === "number" ? body.size : NaN

    if (!filename) {
      return createErrorResponse(400, "INVALID_UPLOAD_FILENAME", "Filename is required.")
    }

    if (!ALLOWED_FILE_TYPES.has(mediaType as (typeof ALLOWED_FILE_MIME_TYPES)[number])) {
      return createErrorResponse(400, "INVALID_UPLOAD_TYPE", "Unsupported upload type.")
    }

    if (!Number.isFinite(size) || size <= 0 || size > MAX_FILE_SIZE_BYTES) {
      return createErrorResponse(400, "INVALID_UPLOAD_SIZE", "File size is invalid.")
    }

    const normalizedFilename = filename.toLowerCase()
    const allowedExtensions = MIME_EXTENSIONS[mediaType as keyof typeof MIME_EXTENSIONS] ?? []
    const matchesExtension = allowedExtensions.some((extension) => normalizedFilename.endsWith(extension))

    if (!matchesExtension) {
      return createErrorResponse(400, "INVALID_UPLOAD_EXTENSION", "File extension does not match the media type.")
    }

    const { token, payload } = issueSignedUploadToken({
      userId: user.id,
      filename,
      mediaType,
      size,
    })

    return createSuccessResponse({
      uploadUrl: createUploadUrl(token),
      token,
      expiresAt: payload.exp,
    })
  } catch (error) {
    console.log(error)
    return createErrorResponse(500, "UPLOAD_INIT_FAILED", "Failed to initialize upload.")
  }
}
