import { NextResponse } from "next/server"

export async function GET() {
  return NextResponse.json(
    {
      success: false,
      error: {
        code: "AUTH_ROUTE_REMOVED",
        message: "Auth is handled by Clerk routes. Use /sign-in or /sign-up.",
      },
    },
    { status: 410 }
  )
}
