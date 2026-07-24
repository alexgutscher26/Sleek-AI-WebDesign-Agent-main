type PlatformConfig = {
  databaseUrl: string
  openAiApiKey: string
  openAiBaseUrl: string
  aiBackend: "openrouter" | "openai" | "ollama"
  ollamaModel: string
}

function required(name: string, value: string | undefined) {
  const trimmed = value?.trim() ?? ""
  if (!trimmed) {
    throw new Error(`[platform-config] Missing required env var: ${name}`)
  }

  return trimmed
}

export function isOllamaBackend(): boolean {
  const provider = process.env.AI_PROVIDER?.trim().toLowerCase()
  const baseUrl = process.env.OPENAI_BASE_URL?.trim() || process.env.OLLAMA_BASE_URL?.trim() || ""
  return provider === "ollama" || baseUrl.includes("11434") || process.env.USE_OLLAMA === "true"
}

export function getPlatformConfig(): PlatformConfig {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY?.trim() ?? ""
  const openAiApiKey = process.env.OPENAI_API_KEY?.trim() ?? ""
  const ollamaModel =
    process.env.OLLAMA_MODEL?.trim() || process.env.OPENAI_MODEL?.trim() || "qwen2.5-coder"

  if (isOllamaBackend()) {
    const ollamaBaseUrl =
      process.env.OLLAMA_BASE_URL?.trim() ||
      (process.env.OPENAI_BASE_URL?.includes("11434")
        ? process.env.OPENAI_BASE_URL.trim()
        : "http://localhost:11434/v1")

    return {
      databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
      openAiApiKey: openAiApiKey || openRouterApiKey || "ollama",
      openAiBaseUrl: ollamaBaseUrl,
      aiBackend: "ollama",
      ollamaModel,
    }
  }

  if (!openRouterApiKey && !openAiApiKey) {
    throw new Error(
      "[platform-config] Configure OPENROUTER_API_KEY, OPENAI_API_KEY, or set AI_PROVIDER=ollama."
    )
  }

  return {
    databaseUrl: required("DATABASE_URL", process.env.DATABASE_URL),
    openAiApiKey: openRouterApiKey || openAiApiKey,
    openAiBaseUrl:
      process.env.OPENAI_BASE_URL?.trim() ||
      (openRouterApiKey ? "https://openrouter.ai/api/v1" : "https://api.openai.com/v1"),
    aiBackend: openRouterApiKey ? "openrouter" : "openai",
    ollamaModel,
  }
}

export function isOpenRouterBackend() {
  return getPlatformConfig().aiBackend === "openrouter"
}
