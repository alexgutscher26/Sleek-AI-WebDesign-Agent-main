import { NextResponse } from "next/server"

type ErrorDetails = {
  issues?: Array<{ field: string; message: string }>
}

export function createErrorResponse(
  status: number,
  code: string,
  message: string,
  details?: ErrorDetails
) {
  return NextResponse.json(
    {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {})
      }
    },
    { status }
  )
}

export function createSuccessResponse<T>(data: T, status = 200) {
  return NextResponse.json(
    {
      success: true,
      data
    },
    { status }
  )
}
