import { NextResponse } from "next/server"
import { getSql } from "@/lib/neon-db"

export const dynamic = "force-dynamic"

export async function GET() {
  const startTime = Date.now()
  try {
    const sql = getSql()

    // 1. Check database ping and basic connectivity
    const pingResult = await sql`SELECT 1 as alive`
    if (!pingResult || pingResult.length === 0) {
      throw new Error("Database ping failed")
    }

    // 2. Perform referential integrity check for orphan pages
    const orphanPages = await sql`
      SELECT count(*)::int as count
      from public.pages p
      left join public.projects pr on p."projectId" = pr.id
      where pr.id is null
    `

    // 3. Perform referential integrity check for orphan messages
    const orphanMessages = await sql`
      SELECT count(*)::int as count
      from public.messages m
      left join public.projects pr on m."projectId" = pr.id
      where pr.id is null
    `

    // 4. Verify non-empty HTML integrity
    const emptyHtmlPages = await sql`
      SELECT count(*)::int as count
      from public.pages
      where length(trim("htmlContent")) = 0
    `

    const latencyMs = Date.now() - startTime
    const orphanPageCount = orphanPages[0]?.count ?? 0
    const orphanMessageCount = orphanMessages[0]?.count ?? 0
    const emptyHtmlCount = emptyHtmlPages[0]?.count ?? 0

    const isHealthy = orphanPageCount === 0 && orphanMessageCount === 0 && emptyHtmlCount === 0

    return NextResponse.json(
      {
        status: isHealthy ? "healthy" : "degraded",
        timestamp: new Date().toISOString(),
        latencyMs,
        integrity: {
          orphanPages: orphanPageCount,
          orphanMessages: orphanMessageCount,
          emptyHtmlPages: emptyHtmlCount,
        },
      },
      { status: isHealthy ? 200 : 500 }
    )
  } catch (error) {
    console.error("[DB Health Check Error]", error)
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Database health check failed",
      },
      { status: 500 }
    )
  }
}
