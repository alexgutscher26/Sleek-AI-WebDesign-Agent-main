import { NextRequest } from 'next/server';
import { createAuthRouteHandlers } from '@insforge/nextjs/api';
import { requireInsforgeConfig } from '@/lib/insforge-config';
import { createValidationErrorResponse, parseAuthPostBody, parseJsonBody, RequestValidationError } from '@/lib/api-validation';
import { createErrorResponse } from '@/lib/api-response';

const handlers = createAuthRouteHandlers({
  baseUrl: requireInsforgeConfig("initializing auth route handlers").baseUrl
});

export async function POST(request: NextRequest) {
  try {
    const body = await parseJsonBody(request.clone())
    parseAuthPostBody(body)
    return handlers.POST(request)
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return createValidationErrorResponse(error)
    }

    return createErrorResponse(500, "INTERNAL_SERVER_ERROR", "Internal server error")
  }
}

export async function GET(request: NextRequest) {
  return handlers.GET(request)
}

export async function DELETE(request: NextRequest) {
  return handlers.DELETE(request)
}
