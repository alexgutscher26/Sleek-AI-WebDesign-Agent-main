import OpenAI from "openai"
import { getPlatformConfig, isOpenRouterBackend } from "@/lib/platform-config"

type CreateOptions = Record<string, unknown> & {
  model: string
  messages?: unknown[]
  maxTokens?: number
  stream?: boolean
}

const DEFAULT_MAX_TOKENS = 2048

const globalState = globalThis as typeof globalThis & {
  __sleek_openai__?: OpenAI
}

function getClient() {
  if (!globalState.__sleek_openai__) {
    const config = getPlatformConfig()
    globalState.__sleek_openai__ = new OpenAI({
      apiKey: config.openAiApiKey,
      baseURL: config.openAiBaseUrl,
      defaultHeaders: isOpenRouterBackend()
        ? {
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "Sleek AI Web Design Agent"
          }
        : undefined
    })
  }

  return globalState.__sleek_openai__
}

function normalizeMessages(messages: unknown[] = []) {
  return messages.map((message) => {
    if (!message || typeof message !== "object") {
      return message
    }

    const typedMessage = message as Record<string, unknown>
    const content = typedMessage.content
    if (!Array.isArray(content)) {
      return message
    }

    return {
      ...typedMessage,
      content: content.map((part) => {
        if (!part || typeof part !== "object") {
          return part
        }

        const typedPart = part as Record<string, unknown>
        if (typedPart.type === "image" && typeof typedPart.image === "string") {
          return {
            type: "image_url",
            image_url: {
              url: typedPart.image
            }
          }
        }

        return part
      })
    }
  })
}

export function createCompatAiClient() {
  const client = getClient()

  return {
    chat: {
      completions: {
        create(options: CreateOptions) {
          const { webSearch: _webSearch, maxTokens, messages, ...rest } = options

          return client.chat.completions.create({
            ...rest,
            max_tokens: typeof maxTokens === "number" ? maxTokens : DEFAULT_MAX_TOKENS,
            messages: normalizeMessages(messages)
          } as OpenAI.Chat.ChatCompletionCreateParams)
        }
      }
    }
  }
}
