import postgres from "postgres"
import { getPlatformConfig } from "@/lib/platform-config"

const globalState = globalThis as typeof globalThis & {
  __sleek_sql__?: ReturnType<typeof postgres>
}

export function getSql() {
  if (!globalState.__sleek_sql__) {
    globalState.__sleek_sql__ = postgres(getPlatformConfig().databaseUrl, {
      prepare: false,
      max: 1
    })
  }

  return globalState.__sleek_sql__
}
