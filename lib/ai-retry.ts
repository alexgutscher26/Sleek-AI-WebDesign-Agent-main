type CompletionFactory = <T = unknown>(options: Record<string, unknown>) => Promise<T>

type RetryOptions = {
  fallbackModels?: string[]
  maxAttemptsPerModel?: number
  initialDelayMs?: number
  signal?: AbortSignal
}

const TRANSIENT_STATUS_CODES = new Set([408, 409, 425, 429, 500, 502, 503, 504])

const sleep = async (ms: number, signal?: AbortSignal) => {
  if (ms <= 0) {
    return
  }

  await new Promise<void>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)

    const onAbort = () => {
      clearTimeout(timeoutId)
      reject(new Error("Request aborted"))
    }

    if (signal) {
      if (signal.aborted) {
        onAbort()
        return
      }

      signal.addEventListener("abort", onAbort, { once: true })
    }
  })
}

export const isAbortLikeError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  return error.name === "AbortError" || error.message === "Request aborted"
}

export const isTransientAiError = (error: unknown) => {
  if (!error || typeof error !== "object") {
    return false
  }

  const status = "status" in error ? Number(error.status) : NaN
  if (Number.isFinite(status) && TRANSIENT_STATUS_CODES.has(status)) {
    return true
  }

  const causeStatus = "cause" in error && error.cause && typeof error.cause === "object" && "status" in error.cause
    ? Number((error.cause as { status?: unknown }).status)
    : NaN

  if (Number.isFinite(causeStatus) && TRANSIENT_STATUS_CODES.has(causeStatus)) {
    return true
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()

  return [
    "rate limit",
    "too many requests",
    "timeout",
    "timed out",
    "temporarily unavailable",
    "temporary failure",
    "internal_error",
    "internal server error",
    "unexpected end of json input",
    "failed to get response",
    "connection reset",
    "econnreset",
    "etimedout",
    "socket hang up",
    "service unavailable",
    "bad gateway",
    "gateway timeout",
    "overloaded",
    "try again"
  ].some((needle) => message.includes(needle))
}

export async function createChatCompletionWithRetries<T = unknown>(
  createCompletion: CompletionFactory,
  options: Record<string, unknown>,
  retryOptions: RetryOptions = {}
): Promise<T> {
  const {
    fallbackModels = [],
    maxAttemptsPerModel = 3,
    initialDelayMs = 350,
    signal
  } = retryOptions

  const modelsToTry = [
    options.model,
    ...fallbackModels.filter((model) => model !== options.model)
  ]

  let lastError: unknown

  for (const model of modelsToTry) {
    for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt += 1) {
      if (signal?.aborted) {
        throw new Error("Request aborted")
      }

      try {
        return await createCompletion<T>({
          ...options,
          model
        })
      } catch (error) {
        lastError = error

        if (
          isAbortLikeError(error) ||
          !isTransientAiError(error) ||
          attempt === maxAttemptsPerModel
        ) {
          break
        }

        await sleep(initialDelayMs * 2 ** (attempt - 1), signal)
      }
    }
  }

  throw lastError
}
