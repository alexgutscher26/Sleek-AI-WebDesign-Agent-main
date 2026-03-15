import { NextRequest } from 'next/server';
import { createAuthRouteHandlers } from '@insforge/nextjs/api';
import { getInsforgeBaseUrl } from '@/lib/insforge-config';
import { createValidationErrorResponse, parseAuthPostBody, parseJsonBody, RequestValidationError } from '@/lib/api-validation';

const handlers = createAuthRouteHandlers({
  baseUrl: getInsforgeBaseUrl()
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

    throw error
  }
}

export async function GET(request: NextRequest) {
  return handlers.GET(request)
}

export async function DELETE(request: NextRequest) {
  return handlers.DELETE(request)
}
