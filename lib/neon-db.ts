import { getPlatformConfig } from "@/lib/platform-config"
import postgres from "postgres"

const globalState = globalThis as typeof globalThis & {
  __sleek_sql__?: ReturnType<typeof postgres>
}

export function getSql() {
  if (!globalState.__sleek_sql__) {
    const maxConnections = Number(process.env.POSTGRES_MAX_CONNECTIONS) || 10
    globalState.__sleek_sql__ = postgres(getPlatformConfig().databaseUrl, {
      prepare: false,
      max: maxConnections,
      idle_timeout: 20,
      connect_timeout: 10,
      max_lifetime: 60 * 30,
    })
  }

  return globalState.__sleek_sql__
}
