type PlatformConfig = {
  databaseUrl: string
  openAiApiKey: string
  openAiBaseUrl: string
  aiBackend: "openrouter" | "openai"
}

function required(name: string, value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) {
    throw new Error(`[platform-config] Missing required env var: ${name}`)
  }

  return trimmed
}

export function getPlatformConfig(): PlatformConfig {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim() ?? ""
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? ""

  if (!openRouterApiKey && !openAiApiKey) {
    throw new Error("[platform-config] Configure either OPENROUTER_API_KEY or OPENAI_API_KEY.")
  }

  return {
    databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
    openAiApiKey: openRouterApiKey || openAiApiKey,
    openAiBaseUrl: process.env.OPENAI_BASE_URL?.trim()
      || (openRouterApiKey ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1"),
    aiBackend: openRouterApiKey ? "openrouter" : "openai"
  }
}

export function isOpenRouterBackend() {
  return getPlatformConfig().aiBackend === "openrouter"
}
