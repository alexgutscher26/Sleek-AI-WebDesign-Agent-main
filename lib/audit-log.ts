import { headers } from "next/headers"
import { createHash } from "node:crypto"
import { createCompatDatabaseClient } from "@/lib/compat-backend"

type AuditAction =
  | "page.delete"
  | "page.rename"
  | "page.reorder"
  | "page.duplicate"

type AuditEventInput = {
  userId: string
  action: AuditAction
  entityType: "page"
  entityId: string
  projectId?: string
  metadata?: Record<string, unknown>
}

const hashIp = (ip: string) => (
  createHash("sha256")
    .update(ip)
    .digest("hex")
)

const getClientIpFromHeaders = (headerStore: Pick<Headers, "get">) => {
  const forwardedFor = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim()
  if (forwardedFor) {
    return forwardedFor
  }

  const realIp = headerStore.get("x-real-ip")?.trim()
  return realIp || null
}

export const writeAuditLog = async ({
  userId,
  action,
  entityType,
  entityId,
  projectId,
  metadata,
}: AuditEventInput) => {
  try {
    const headerStore = await headers()
    const clientIp = getClientIpFromHeaders(headerStore)
    const db = createCompatDatabaseClient()

    const payload = {
      userId,
      action,
      entityType,
      entityId,
      projectId: projectId ?? null,
      ipHash: clientIp ? hashIp(clientIp) : null,
      metadata: metadata ?? {},
    }

    const result = await db.from("audit_logs").insert([payload])
    if (result.error) {
      console.info("Audit log fallback:", payload, result.error.message)
    }
  } catch (error) {
    console.info("Audit log fallback:", {
      userId,
      action,
      entityType,
      entityId,
      projectId: projectId ?? null,
      metadata: metadata ?? {},
      error: error instanceof Error ? error.message : String(error),
    })
  }
}
