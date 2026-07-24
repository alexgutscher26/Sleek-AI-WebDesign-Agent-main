import { NextRequest } from "next/server"
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response"
import { verifyBinaryFilePayload } from "@/lib/file-validation"
import { getAuthServer } from "@/lib/insforge-server"
import { assertTrustedAppRequest } from "@/lib/request-security"
import { verifySignedUploadToken } from "@/lib/upload-signing"

const bytesToDataUrl = (bytes: Uint8Array, mediaType: string) =>
  `data:${mediaType};base64,${Buffer.from(bytes).toString("base64")}`

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const trustedRequest = assertTrustedAppRequest(request, {
      requireNavigationHeaders: true,
    })
    if (!trustedRequest.ok) {
      return createErrorResponse(403, trustedRequest.code, trustedRequest.message)
    }

    const { user } = await getAuthServer()
    if (!user) {
      return createErrorResponse(401, "UNAUTHORIZED", "Unauthorized")
    }

    const routeParams = await params
    const token = decodeURIComponent(routeParams.token)
    const verification = verifySignedUploadToken(token)

    if (!verification.ok) {
      return createErrorResponse(403, "INVALID_UPLOAD_TOKEN", verification.message)
    }

    if (verification.payload.userId !== user.id) {
      return createErrorResponse(
        403,
        "UPLOAD_TOKEN_USER_MISMATCH",
        "Upload token does not belong to this user."
      )
    }

    const contentType = request.headers.get("content-type")?.trim() ?? ""
    if (contentType !== verification.payload.mediaType) {
      return createErrorResponse(
        400,
        "UPLOAD_CONTENT_TYPE_MISMATCH",
        "Upload content type does not match the signed token."
      )
    }

    const bytes = new Uint8Array(await request.arrayBuffer())
    const fileCheck = verifyBinaryFilePayload(
      bytes,
      verification.payload.mediaType,
      verification.payload.size
    )

    if (!fileCheck.ok) {
      return createErrorResponse(400, "INVALID_UPLOAD_PAYLOAD", fileCheck.message)
    }

    return createSuccessResponse({
      file: {
        filename: verification.payload.filename,
        mediaType: verification.payload.mediaType,
        size: fileCheck.byteLength,
        url: bytesToDataUrl(bytes, verification.payload.mediaType),
      },
    })
  } catch (error) {
    console.log(error)
    return createErrorResponse(500, "UPLOAD_FAILED", "Failed to upload file.")
  }
}
