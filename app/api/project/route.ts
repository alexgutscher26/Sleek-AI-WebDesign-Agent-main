import { NextRequest } from "next/server";
import { convertModelMessages, generateProjectTitle } from "@/app/action/action";
import { getAuthServer } from "@/lib/insforge-server";
import { createUIMessageStream, createUIMessageStreamResponse, generateId, UIMessage, UIMessageStreamWriter } from "ai";
import {
  CONTENT_DEPTH_PROMPT_GUIDANCE,
  CREATIVITY_LEVEL_PROMPT_GUIDANCE,
  GENERATION_MODE_PROMPT_GUIDANCE,
  LAYOUT_COMPLEXITY_PROMPT_GUIDANCE,
  PRE_GENERATION_PREFLIGHT_PROMPT,
  SLEEK_CHAT_PROMPT,
  SLEEK_INTENT_PROMPT,
  STYLE_INTENSITY_PROMPT_GUIDANCE,
  WEB_ANALYSIS_PROMPT,
  WEB_GENERATION_PROMPT
} from "@/lib/prompt";
import {
  ApiMessagePart,
  createValidationErrorResponse,
  parseJsonBody,
  parseProjectPostBody,
  RequestValidationError
} from "@/lib/api-validation";
import { getOwnedProjectBySlug } from "@/lib/project-access";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";
import { DEFAULT_CONTENT_DEPTH } from "@/constants/content-depth";
import { DEFAULT_CREATIVITY_LEVEL } from "@/constants/creativity-level";
import { DEFAULT_LAYOUT_COMPLEXITY } from "@/constants/layout-complexity";
import { type ModelProvider } from "@/constants/model-provider";
import { DEFAULT_STYLE_INTENSITY } from "@/constants/style-intensity";
import { createChatCompletionWithRetries, isAbortLikeError } from "@/lib/ai-retry";
import { createHash } from "node:crypto";
import { extractPrimaryHtml, sanitizeGeneratedHtml } from "@/lib/html-guardrails";
import { getClientIp, hashClientIp, mapGenerationRateLimitError, RateLimitError } from "@/lib/generation-abuse";

class AbortError extends Error {
  constructor() {
    super("Request aborted");
    this.name = "AbortError";
  }
}

class GenerationTimeoutError extends Error {
  constructor() {
    super("Generation timed out");
    this.name = "GenerationTimeoutError";
  }
}

type RouteInsforge = Awaited<ReturnType<typeof getAuthServer>>["insforge"]

type PersistedPage = {
  id: string
  name: string
  rootStyles: string
  htmlContent: string
}

type PersistedProject = {
  id: string
  title: string
  slugId?: string
}

type ProjectOwnershipRecord = {
  id: string
  userId: string
}

type PersistedMessage = {
  id: string
  role: string
  parts: ApiMessagePart[]
  createdAt?: string
}

type GeneratedPageDraft = {
  tempId: string
  name: string
  rootStyles: string
  htmlContent: string
}

type AnalysisPage = {
  id: string
  name: string
  purpose: string
  visualDescription: string
  rootStyles: string
}

type AnalysisResult = {
  rootStyles?: string
  pages: AnalysisPage[]
}

type PreflightResult = {
  shouldGenerate: boolean
  improvedPrompt: string
  assistantMessage: string
  clarifyingQuestions: string[]
}

type StreamWriter = UIMessageStreamWriter<UIMessage>

type CompletionChunk = {
  choices: Array<{
    delta?: {
      content?: string
    }
  }>
}

type CompletionResponse = {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

type StreamingCompletionResponse = AsyncIterable<CompletionChunk>

type RequestKind = "chat" | "generate" | "regenerate"

type StoredResponse =
  | {
      kind: "chat"
      text: string
    }
  | {
      kind: "generate"
      pages: PersistedPage[]
      preflightText?: string
      summaryText: string
    }
  | {
      kind: "regenerate"
      page: PersistedPage
      preflightText?: string
      summaryText: string
    }

type GenerationRequestRecord = {
  id: string
  wasCreated: boolean
  status: "in_progress" | "completed" | "failed" | "timed_out"
  requestHash: string
  requestKind: RequestKind
  response: StoredResponse | null
  error: string | null
}

type RouteDeps = {
  insforge: RouteInsforge
  projectId: string
  latestUserParts: ApiMessagePart[]
}

type ModelTask = "intent" | "chat" | "analysis" | "generate" | "regenerate"

type ModelStrategy = {
  model: string
  fallbackModels: string[]
}

const GENERATION_TIMEOUT_MS = 480_000
const ANALYSIS_MAX_TOKENS = 12000
const GENERATION_MAX_TOKENS = 14000

const getModelStrategy = (
  provider: ModelProvider,
  task: ModelTask
): ModelStrategy => {
  if (provider === "gemini") {
    switch (task) {
      case "intent":
        return {
          model: "google/gemini-2.5-pro",
          fallbackModels: ["google/gemini-3-flash-preview"]
        }
      case "chat":
        return {
          model: "google/gemini-2.5-pro",
          fallbackModels: ["google/gemini-3-flash-preview"]
        }
      case "analysis":
        return {
          model: "google/gemini-2.5-pro",
          fallbackModels: ["google/gemini-3-flash-preview"]
        }
      case "generate":
        return {
          model: "google/gemini-3.1-pro-preview",
          fallbackModels: ["google/gemini-2.5-pro", "google/gemini-3-flash-preview"]
        }
      case "regenerate":
        return {
          model: "google/gemini-3-flash-preview",
          fallbackModels: ["google/gemini-2.5-pro", "google/gemini-2.5-flash-lite"]
        }
    }
  }

  if (provider === "claude") {
    return {
      model: "anthropic/claude-sonnet-4.5",
      fallbackModels: []
    }
  }

  switch (task) {
    case "intent":
      return {
        model: "anthropic/claude-sonnet-4.5",
        fallbackModels: ["google/gemini-2.5-pro"]
      }
    case "chat":
      return {
        model: "google/gemini-2.5-pro",
        fallbackModels: ["anthropic/claude-sonnet-4.5"]
      }
    case "analysis":
      return {
        model: "anthropic/claude-sonnet-4.5",
        fallbackModels: ["google/gemini-2.5-pro"]
      }
    case "generate":
      return {
        model: "google/gemini-3.1-pro-preview",
        fallbackModels: ["google/gemini-2.5-pro", "google/gemini-3-flash-preview"]
      }
    case "regenerate":
      return {
        model: "google/gemini-3-flash-preview",
        fallbackModels: ["google/gemini-2.5-pro", "google/gemini-2.5-flash-lite"]
      }
  }
}

export async function GET() {
  try {
    const { user, insforge } = await getAuthServer();
    if (!user) return createErrorResponse(401, "UNAUTHORIZED", "Unauthorized");

    const { data: projects, error } = await insforge.database.from("projects")
      .select("id, title, slugId, createdAt")
      .eq("userId", user.id)
      .order("createdAt", { ascending: false })
      .limit(10);

    if (error) return createErrorResponse(400, "PROJECT_FETCH_FAILED", "Failed to fetch projects");

    return createSuccessResponse(projects)
  } catch (error) {
    console.log(error);
    return createErrorResponse(500, "INTERNAL_SERVER_ERROR", "Internal server error")
  }
}

const emit = (
  writer: StreamWriter,
  type: string,
  data: object = {},
  options?: {
    id?: string;
    transient?: boolean
  }
) => {
  writer.write({
    id: options?.id,
    type: `data-${type}`,
    data,
    transient: options?.transient
  })
}

const throwIfAborted = (signal: AbortSignal) => {
  if (signal.aborted) {
    throw new AbortError()
  }
}

const throwIfTimedOut = (timedOut: boolean) => {
  if (timedOut) {
    throw new GenerationTimeoutError()
  }
}

const createOperationSignal = (requestSignal: AbortSignal, timeoutMs: number) => {
  const controller = new AbortController()
  let timedOut = false
  let cleanedUp = false

  const cleanup = () => {
    if (cleanedUp) {
      return
    }

    cleanedUp = true
    clearTimeout(timeoutId)
    requestSignal.removeEventListener("abort", onAbort)
  }

  const abortWith = (reason: "request" | "timeout") => {
    if (controller.signal.aborted) {
      return
    }

    timedOut = reason === "timeout"
    controller.abort()
    cleanup()
  }

  const onAbort = () => abortWith("request")
  const timeoutId = setTimeout(() => abortWith("timeout"), timeoutMs)

  if (requestSignal.aborted) {
    abortWith("request")
  } else {
    requestSignal.addEventListener("abort", onAbort, { once: true })
  }

  return {
    signal: controller.signal,
    cleanup,
    didTimeOut: () => timedOut
  }
}

const createRequestHash = (input: object) => (
  createHash("sha256")
    .update(JSON.stringify(input))
    .digest("hex")
)

const classifyIntent = (value: string) => {
  const firstWord = value.trim().toLowerCase().split(" ")[0]
  const validIntents: RequestKind[] = ["chat", "generate", "regenerate"]
  return validIntents.includes(firstWord as RequestKind)
    ? firstWord as RequestKind
    : "chat"
}

const prepareGeneratedHtml = (rawHtml: string) => {
  const extractedHtml = extractPrimaryHtml(rawHtml)
  const sanitized = sanitizeGeneratedHtml(extractedHtml)

  if (!sanitized.html) {
    throw new Error("Generated HTML was empty after safety sanitization")
  }

  return sanitized.html
}

const parsePreflightResult = (
  preflightText: string,
  options: {
    latestUserMessage: string
  }
): PreflightResult => {
  try {
    const jsonStart = preflightText.indexOf("{")
    const jsonEnd = preflightText.lastIndexOf("}")
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON object found")
    }

    const parsed = JSON.parse(preflightText.substring(jsonStart, jsonEnd + 1)) as Partial<PreflightResult>
    const clarifyingQuestions = Array.isArray(parsed.clarifyingQuestions)
      ? parsed.clarifyingQuestions.filter((question): question is string => (
        typeof question === "string" && question.trim().length > 0
      ))
      : []

    return {
      shouldGenerate: parsed.shouldGenerate !== false,
      improvedPrompt: typeof parsed.improvedPrompt === "string" && parsed.improvedPrompt.trim().length > 0
        ? parsed.improvedPrompt.trim()
        : options.latestUserMessage,
      assistantMessage: typeof parsed.assistantMessage === "string"
        ? parsed.assistantMessage.trim()
        : "",
      clarifyingQuestions
    }
  } catch (error) {
    console.log("Preflight parse fallback", error)

    return {
      shouldGenerate: true,
      improvedPrompt: options.latestUserMessage,
      assistantMessage: "",
      clarifyingQuestions: []
    }
  }
}

const parseAnalysisResult = (
  analysisText: string,
  options: {
    latestUserMessage: string
    contentDepth: string
    creativityLevel: string
    generationMode: string
    layoutComplexity: string
    styleIntensity: string
    selectedPage?: PersistedPage | null
    isRegen: boolean
  }
): AnalysisResult => {
  try {
    const jsonStart = analysisText.indexOf("{");
    const jsonEnd = analysisText.lastIndexOf("}");
    if (jsonStart === -1 || jsonEnd === -1) {
      throw new Error("No JSON object found")
    }

    const cleanJson = analysisText.substring(jsonStart, jsonEnd + 1);
    const parsed = JSON.parse(cleanJson) as AnalysisResult

    if (!parsed.pages || parsed.pages.length === 0) {
      throw new Error("No pages in analysis payload")
    }

    return parsed
  } catch (error) {
    console.log("Analysis parse fallback", error)

    if (options.isRegen && options.selectedPage) {
      return {
        rootStyles: options.selectedPage.rootStyles,
        pages: [
          {
            id: options.selectedPage.id,
            name: options.selectedPage.name,
            purpose: `Refine ${options.selectedPage.name}`,
            visualDescription: options.latestUserMessage,
            rootStyles: options.selectedPage.rootStyles
          }
        ]
      }
    }

    return {
      pages: [
        {
          id: generateId(),
          name: "Home",
          purpose: `${options.generationMode} experience`,
          visualDescription: `${options.latestUserMessage}\nContent depth: ${options.contentDepth}\nCreativity level: ${options.creativityLevel}\nLayout complexity: ${options.layoutComplexity}\nStyle intensity: ${options.styleIntensity}`,
          rootStyles: ""
        }
      ]
    }
  }
}

const createInsforgeCompletion = (insforge: RouteInsforge) => <T,>(options: Record<string, unknown>) => (
  insforge.ai.chat.completions.create(
    options as Parameters<RouteInsforge["ai"]["chat"]["completions"]["create"]>[0]
  ) as unknown as Promise<T>
)

const safeDeleteProject = async (insforge: RouteInsforge, projectId: string) => {
  try {
    await insforge.database.from("messages").delete().eq("projectId", projectId)
    await insforge.database.from("pages").delete().eq("projectId", projectId)
    await insforge.database.from("projects").delete().eq("id", projectId)
  } catch (cleanupError) {
    console.log(cleanupError, "Project cleanup failed")
  }
}

const isMissingRpcError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return message.includes("could not find the function") || message.includes("function") && message.includes("does not exist")
}

const isLegacyGenerationRequestSchemaError = (error: unknown) => {
  if (!(error instanceof Error)) {
    return false
  }

  const message = error.message.toLowerCase()
  return (
    message.includes(`column "iphash" does not exist`) ||
    message.includes(`could not find the function public.begin_generation_request`) ||
    message.includes(`p_ip_hash`) ||
    message.includes(`function begin_generation_request(`)
  )
}

const getBackendUnavailableMessage = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error)
  return message.includes("No backend services available for app:")
    ? "InsForge backend services are not available for the configured app. Open your InsForge project and provision its backend services before generating."
    : null
}

const getAiProviderErrorMessage = (error: unknown) => {
  const status = error && typeof error === "object" && "status" in error
    ? Number((error as { status?: unknown }).status)
    : NaN
  const message = error instanceof Error ? error.message : String(error)
  const normalizedMessage = message.toLowerCase()

  if (status === 401 || normalizedMessage.includes("401 user not found")) {
    return "AI provider authentication failed. This is not a database users-table issue. Check your OPENROUTER_API_KEY or OPENAI_API_KEY and make sure the key belongs to an active account."
  }

  if (status === 402 || normalizedMessage.includes("requires more credits") || normalizedMessage.includes("fewer max_tokens")) {
    return "OpenRouter rejected this request because the token budget is too high for your current credits. Try again with the reduced limits now in place, or add credits if you still want larger generations."
  }

  if (normalizedMessage.includes("invalid api key") || normalizedMessage.includes("incorrect api key")) {
    return "The configured AI API key is invalid. Update your OPENROUTER_API_KEY or OPENAI_API_KEY and try again."
  }

  if (normalizedMessage.includes("model") && normalizedMessage.includes("not found")) {
    return "The selected AI model is not available for your current provider. If you want Claude or Gemini models, use OpenRouter; if you use OpenAI directly, switch to OpenAI-supported models."
  }

  return null
}

const getOrCreateProjectAtomic = async (
  insforge: RouteInsforge,
  userId: string,
  slugId: string,
  title: string
) => {
  try {
    const { data, error } = await insforge.database.rpc("get_or_create_project", {
      p_user_id: userId,
      p_slug_id: slugId,
      p_title: title
    })

    if (error) {
      throw error
    }

    const project = Array.isArray(data) ? data[0] : data

    if (!project) {
      throw new Error("Failed to get or create project")
    }

    return {
      project: project as { id: string; title: string; slugId: string },
      wasCreated: Boolean((project as { wasCreated?: boolean }).wasCreated),
      usedRpc: true
    }
  } catch (error) {
    if (!isMissingRpcError(error)) {
      if (error instanceof Error && error.message.includes("PROJECT_OWNERSHIP_CONFLICT")) {
        throw error
      }

      console.log(error, "get_or_create_project RPC failed; falling back")
    }

    return {
      project: null,
      wasCreated: false,
      usedRpc: false
    }
  }
}

const beginGenerationRequest = async (
  insforge: RouteInsforge,
  userId: string,
  projectId: string,
  selectedPageId: string | null,
  idempotencyKey: string | null,
  requestHash: string,
  requestKind: RequestKind,
  ipHash: string | null
) => {
  if (!idempotencyKey) {
    return {
      record: null,
      supported: false
    }
  }

  try {
    const { data, error } = await insforge.database.rpc("begin_generation_request", {
      p_user_id: userId,
      p_project_id: projectId,
      p_selected_page_id: selectedPageId,
      p_idempotency_key: idempotencyKey,
      p_request_hash: requestHash,
      p_request_kind: requestKind,
      p_ip_hash: ipHash
    })

    if (error) {
      throw error
    }

    const record = (Array.isArray(data) ? data[0] : data) as GenerationRequestRecord | null

    return {
      record,
      supported: true
    }
  } catch (error) {
    const mappedError = mapGenerationRateLimitError(error)
    if (mappedError) {
      throw mappedError
    }

    if (!isMissingRpcError(error) && !isLegacyGenerationRequestSchemaError(error)) {
      throw error
    }

    try {
      const { data, error } = await insforge.database.rpc("begin_generation_request", {
        p_user_id: userId,
        p_project_id: projectId,
        p_selected_page_id: selectedPageId,
        p_idempotency_key: idempotencyKey,
        p_request_hash: requestHash,
        p_request_kind: requestKind
      })

      if (error) {
        throw error
      }

      const record = (Array.isArray(data) ? data[0] : data) as GenerationRequestRecord | null

      return {
        record,
        supported: true
      }
    } catch (fallbackError) {
      if (!isMissingRpcError(fallbackError)) {
        throw fallbackError
      }

      return {
        record: null,
        supported: false
      }
    }
  }
}

const finishGenerationRequest = async (
  insforge: RouteInsforge,
  requestId: string | null,
  status: GenerationRequestRecord["status"],
  response: StoredResponse | null,
  errorText: string | null
) => {
  if (!requestId) {
    return
  }

  try {
    await insforge.database.rpc("finish_generation_request", {
      p_request_id: requestId,
      p_status: status,
      p_response: response,
      p_error: errorText
    })
  } catch (error) {
    if (!isMissingRpcError(error)) {
      console.log(error, "Failed to update generation request")
    }
  }
}

const replayStoredResponse = async (
  writer: StreamWriter,
  response: StoredResponse
) => {
  switch (response.kind) {
    case "chat": {
      const textId = generateId()
      writer.write({ type: "text-start", id: textId })
      if (response.text) {
        writer.write({ type: "text-delta", id: textId, delta: response.text })
      }
      writer.write({ type: "text-end", id: textId })
      return
    }
    case "generate": {
      if (response.preflightText) {
        const preflightTextId = generateId()
        writer.write({ type: "text-start", id: preflightTextId })
        writer.write({ type: "text-delta", id: preflightTextId, delta: response.preflightText })
        writer.write({ type: "text-end", id: preflightTextId })
      }

      emit(writer, "generation", {
        status: "complete",
        pages: response.pages.map((page) => ({
          id: page.id,
          name: page.name,
          done: true
        }))
      }, { id: "gen-card" })

      response.pages.forEach((page) => {
        emit(writer, "page-created", {
          persisted: true,
          page: {
            ...page,
            isLoading: false
          }
        }, { transient: true })
      })

      const textId = generateId()
      writer.write({ type: "text-start", id: textId })
      if (response.summaryText) {
        writer.write({ type: "text-delta", id: textId, delta: response.summaryText })
      }
      writer.write({ type: "text-end", id: textId })
      return
    }
    case "regenerate": {
      if (response.preflightText) {
        const preflightTextId = generateId()
        writer.write({ type: "text-start", id: preflightTextId })
        writer.write({ type: "text-delta", id: preflightTextId, delta: response.preflightText })
        writer.write({ type: "text-end", id: preflightTextId })
      }

      emit(writer, "page-created", {
        persisted: true,
        page: {
          ...response.page,
          isLoading: false
        }
      }, { transient: true })

      emit(writer, "generation", {
        status: "complete",
        regeneratePage: {
          id: response.page.id,
          name: response.page.name,
          done: true
        }
      }, { id: "gen-card" })

      const textId = generateId()
      writer.write({ type: "text-start", id: textId })
      if (response.summaryText) {
        writer.write({ type: "text-delta", id: textId, delta: response.summaryText })
      }
      writer.write({ type: "text-end", id: textId })
      return
    }
  }
}

const persistMessagePair = async (
  insforge: RouteInsforge,
  projectId: string,
  latestUserParts: ApiMessagePart[],
  assistantParts: Array<{ type: string; text?: string; id?: string; data?: unknown }>
) => {
  try {
    const { error } = await insforge.database.rpc("commit_message_pair", {
      p_project_id: projectId,
      p_user_parts: latestUserParts,
      p_assistant_parts: assistantParts
    })

    if (error) {
      throw error
    }

    return
  } catch (error) {
    if (!isMissingRpcError(error)) {
      throw error
    }
  }

  const { error } = await insforge.database.from("messages").insert([
    {
      projectId,
      role: "user",
      parts: latestUserParts
    },
    {
      projectId,
      role: "assistant",
      parts: assistantParts
    }
  ])

  if (error) {
    throw error
  }
}

const persistGeneratedState = async (
  deps: RouteDeps,
  generatedPages: GeneratedPageDraft[],
  preflightText: string | null,
  summaryText: string
) => {
  const { insforge, projectId, latestUserParts } = deps

  try {
    const { data, error } = await insforge.database.rpc("commit_generation_result", {
      p_project_id: projectId,
      p_user_parts: latestUserParts,
      p_assistant_parts: [
        ...(preflightText ? [{ type: "text", text: preflightText }] : []),
        {
          type: "data-generation",
          id: "gen-card",
          data: {
            status: "complete",
            pages: generatedPages.map((page, index) => ({
              id: `temp-${index}`,
              name: page.name,
              done: true
            }))
          }
        },
        { type: "text", text: summaryText }
      ],
      p_pages: generatedPages.map((page) => ({
        name: page.name,
        rootStyles: page.rootStyles,
        htmlContent: page.htmlContent
      }))
    })

    if (error) {
      throw error
    }

    const savedPages = (Array.isArray(data) ? data : []) as PersistedPage[]

    if (savedPages.length > 0) {
      return savedPages
    }
  } catch (error) {
    if (!isMissingRpcError(error)) {
      throw error
    }
  }

  const { data: savedPages, error: pagesError } = await insforge.database.from<PersistedPage[]>("pages").insert(
    generatedPages.map((page) => ({
      projectId,
      name: page.name,
      rootStyles: page.rootStyles,
      htmlContent: page.htmlContent
    }))
  ).select("id, name, rootStyles, htmlContent")

  if (pagesError || !savedPages) {
    throw pagesError ?? new Error("Failed to save generated pages")
  }

  try {
    await persistMessagePair(insforge, projectId, latestUserParts, [
      ...(preflightText ? [{ type: "text", text: preflightText }] : []),
      {
        type: "data-generation",
        id: "gen-card",
        data: {
          status: "complete",
          pages: generatedPages.map((page, index) => ({
            id: savedPages[index].id,
            name: page.name,
            done: true
          }))
        }
      },
      { type: "text", text: summaryText }
    ])
  } catch (error) {
    const savedPageIds = savedPages.map((page: PersistedPage) => page.id)
    if (savedPageIds.length > 0) {
      await insforge.database.from("pages").delete().in("id", savedPageIds)
    }
    throw error
  }

  return savedPages as PersistedPage[]
}

const persistRegeneratedState = async (
  deps: RouteDeps,
  selectedPage: PersistedPage,
  nextPage: Pick<PersistedPage, "htmlContent" | "rootStyles">,
  preflightText: string | null,
  summaryText: string
) => {
  const { insforge, projectId, latestUserParts } = deps

  try {
    const { data, error } = await insforge.database.rpc("commit_regeneration_result", {
      p_project_id: projectId,
      p_page_id: selectedPage.id,
      p_html_content: nextPage.htmlContent,
      p_root_styles: nextPage.rootStyles,
      p_user_parts: latestUserParts,
      p_assistant_parts: [
        ...(preflightText ? [{ type: "text", text: preflightText }] : []),
        {
          type: "data-generation",
          id: "gen-card",
          data: {
            status: "complete",
            regeneratePage: {
              id: selectedPage.id,
              name: selectedPage.name,
              done: true
            }
          }
        },
        { type: "text", text: summaryText }
      ]
    })

    if (error) {
      throw error
    }

    const updatedPage = (Array.isArray(data) ? data[0] : data) as PersistedPage | null

    if (updatedPage) {
      return updatedPage
    }
  } catch (error) {
    if (!isMissingRpcError(error)) {
      throw error
    }
  }

  const previousPage = {
    htmlContent: selectedPage.htmlContent,
    rootStyles: selectedPage.rootStyles
  }

  const { data: updatedPage, error: updateError } = await insforge.database.from("pages")
    .update(nextPage)
    .eq("id", selectedPage.id)
    .eq("projectId", projectId)
    .select("id, name, rootStyles, htmlContent")
    .single()

  if (updateError || !updatedPage) {
    throw updateError ?? new Error("Failed to save regenerated page")
  }

  try {
    await persistMessagePair(insforge, projectId, latestUserParts, [
      ...(preflightText ? [{ type: "text", text: preflightText }] : []),
      {
        type: "data-generation",
        id: "gen-card",
        data: {
          status: "complete",
          regeneratePage: {
            id: updatedPage.id,
            name: updatedPage.name,
            done: true
          }
        }
      },
      { type: "text", text: summaryText }
    ])
  } catch (error) {
    await insforge.database.from("pages")
      .update(previousPage)
      .eq("id", selectedPage.id)
      .eq("projectId", projectId)
    throw error
  }

  return updatedPage as PersistedPage
}

const streamTextResponse = async (
  writer: StreamWriter,
  result: AsyncIterable<CompletionChunk>,
  signal: AbortSignal
) => {
  const textId = generateId();
  let fullText = "";

  writer.write({ type: "text-start", id: textId })

  for await (const chunk of result) {
    throwIfAborted(signal)
    const delta = chunk.choices[0]?.delta?.content || ""
    fullText += delta

    if (delta) {
      writer.write({ type: "text-delta", id: textId, delta })
    }
  }

  writer.write({ type: "text-end", id: textId });
  return fullText
}

const writeTextResponse = (writer: StreamWriter, text: string) => {
  const textId = generateId()
  writer.write({ type: "text-start", id: textId })
  writer.write({ type: "text-delta", id: textId, delta: text })
  writer.write({ type: "text-end", id: textId })
}

const buildGenerationSummaryText = (pages: AnalysisPage[]) => {
  if (pages.length === 1) {
    return `I've generated the ${pages[0].name} page and saved it to your project.`
  }

  const pageNames = pages.map((page) => page.name).join(", ")
  return `I've generated ${pages.length} pages for this project: ${pageNames}.`
}

const buildRegenerationSummaryText = (pageName: string) => (
  `I've updated the ${pageName} page and saved the latest version to your project.`
)

async function runGenerationWorker({
  insforge,
  writer,
  projectId,
  latestUserParts,
  latestUserMessage,
  analysis,
  existingPages,
  contentDepth,
  creativityLevel,
  generationMode,
  layoutComplexity,
  modelProvider,
  preflightText,
  styleIntensity,
  signal,
}: {
  insforge: RouteInsforge
  writer: StreamWriter
  projectId: string
  latestUserParts: ApiMessagePart[]
  latestUserMessage: string
  analysis: AnalysisResult
  existingPages: PersistedPage[] | null
  contentDepth: string
  creativityLevel: string
  generationMode: string
  layoutComplexity: string
  modelProvider: ModelProvider
  preflightText: string | null
  styleIntensity: string
  signal: AbortSignal
}): Promise<{ savedPages: PersistedPage[]; summaryText: string }> {
  const { pages } = analysis;
  const createCompletion = createInsforgeCompletion(insforge)
  const modelStrategy = getModelStrategy(modelProvider, "generate")

  if (!analysis || !pages || pages.length === 0) {
    throw new Error("No pages generated");
  }

  emit(writer, "generation", {
    status: "generating",
    pages: pages.map((page) => ({
      id: page.id,
      name: page.name,
      done: false
    }))
  }, { id: "gen-card" })

  emit(writer, "pages-skeleton", {
    pages: pages.map((page) => ({
      id: page.id,
      name: page.name,
      rootStyles: page.rootStyles,
      htmlContent: "",
      isLoading: true
    }))
  }, { transient: true });

  const generationPages: Array<{ name: string; htmlContent: string }> = [
    ...(existingPages?.map((page) => ({
      name: page.name,
      htmlContent: page.htmlContent
    })) ?? [])
  ]
  const generatedDrafts: GeneratedPageDraft[] = []

  for (const page of pages) {
    throwIfAborted(signal)

    emit(writer, "generation", {
      status: "generating",
      currentPageId: page.id,
      pages: pages.map((currentPage) => ({
        id: currentPage.id,
        name: currentPage.name,
        done: generatedDrafts.some((draft) => draft.tempId === currentPage.id)
      }))
    }, { id: "gen-card" })

    const previousPagesContext = generationPages.length > 0
      ? generationPages.slice(-2).map((p) => `<!--${p.name}-->\n${p.htmlContent}`).join("\n\n")
      : "No previous pages";

    const result = await createChatCompletionWithRetries<CompletionResponse>(createCompletion, {
      model: modelStrategy.model,
      messages: [
        {
          role: "system",
          content: WEB_GENERATION_PROMPT,
        },
        {
          role: "user",
          content: `
         GENERATE HTML FOR THE FOLLOWING PAGE:
- Content Depth: ${contentDepth}
- Creativity Level: ${creativityLevel}
- Generation Mode: ${generationMode}
- Layout Complexity: ${layoutComplexity}
- Style Intensity: ${styleIntensity}
- Page Name: ${page.name}
- Page Purpose: ${page.purpose}
- Visual Description: ${page.visualDescription}
- Theme Variables for this page (already injected in :root - reference via var(), do NOT redeclare):
${page.rootStyles}
- Context from previous pages : ${previousPagesContext}

    CRITICAL REQUIREMENTS:
    1. STYLE PRIORITY: Follow the "Visual Description" above as the ultimate source of truth.
    2. OUTPUT FORMAT: Generate ONLY raw HTML markup. Start exactly with <div. Do not include \`\`\`html or any markdown wrappers.
    CRITICAL:
        1. Generate ONLY raw HTML markup production-ready responsive web page using Tailwind CSS for layout spacing, typography, shadows, etc.
        2. **All content must be inside a single root <div> that controls the layout.**
            - No overflow classes on the root.
            - All scrollable content must be in inner containers with hidden scrollbars: [&::-webkit-scrollbar]:hidden scrollbar-none
        3. ***Important*** For absolute overlays (maps, modals, etc.):**
            - Use \`relative w-full h-screen\` on the top div of the overlay.
        4. ***Important*** For regular content:**
            - Use \`w-full h-full min-h-screen\` on the top div.
        5. ***Important*** Do not use h-screen on inner content unless absolutely required.**
            - Height must grow with content; content must be fully visible inside an iframe.
        6. **For z-index layering:**
            - Ensure absolute elements do not block other content unnecessarily.
        7. **Output raw HTML only, starting with <div>.**
            - Do not include markdown, comments, <html>, <body>, or <head>.
        8. **Hardcode a style only if a theme variable is not needed for that element.**
        9. **Ensure iframe-friendly rendering:**
            - All elements must contribute to the final scrollHeight so your parent iframe can correctly resize.
        Generate the complete, production-ready HTML for "${page.name}" now:`.trim(),
        }
      ],
      webSearch: { enabled: false },
      maxTokens: GENERATION_MAX_TOKENS
    }, {
      fallbackModels: modelStrategy.fallbackModels,
      signal
    })

    const htmlContent = prepareGeneratedHtml(result.choices[0]?.message?.content ?? "")

    const draft = {
      tempId: page.id,
      name: page.name,
      rootStyles: page.rootStyles,
      htmlContent
    }

    generatedDrafts.push(draft)
    generationPages.push({
      name: page.name,
      htmlContent
    })

    emit(writer, "page-created", {
      tempId: page.id,
      persisted: false,
      page: {
        id: page.id,
        name: page.name,
        rootStyles: page.rootStyles,
        htmlContent,
        isLoading: false
      }
    }, { transient: true });
  }

  const fullSummaryText = buildGenerationSummaryText(pages)

  const savedPages = await persistGeneratedState(
    { insforge, projectId, latestUserParts },
    generatedDrafts,
    preflightText,
    fullSummaryText
  )

  writeTextResponse(writer, fullSummaryText)

  emit(writer, "generation", {
    status: "complete",
    pages: savedPages.map((page) => ({
      id: page.id,
      name: page.name,
      done: true
    }))
  }, { id: "gen-card" })

  savedPages.forEach((savedPage, index) => {
    emit(writer, "page-created", {
      tempId: generatedDrafts[index].tempId,
      persisted: true,
      page: {
        id: savedPage.id,
        name: savedPage.name,
        rootStyles: savedPage.rootStyles,
        htmlContent: savedPage.htmlContent,
        isLoading: false
      }
    }, { transient: true });
  })

  return {
    savedPages,
    summaryText: fullSummaryText
  }
}

async function runRegenerateWorker({
  insforge,
  writer,
  projectId,
  selectedPage,
  latestUserParts,
  latestUserMessage,
  analysis,
  contentDepth,
  creativityLevel,
  generationMode,
  layoutComplexity,
  modelProvider,
  preflightText,
  styleIntensity,
  signal,
}: {
  insforge: RouteInsforge
  writer: StreamWriter
  projectId: string
  selectedPage: PersistedPage
  latestUserParts: ApiMessagePart[]
  latestUserMessage: string
  analysis: AnalysisResult
  contentDepth: string
  creativityLevel: string
  generationMode: string
  layoutComplexity: string
  modelProvider: ModelProvider
  preflightText: string | null
  styleIntensity: string
  signal: AbortSignal
}): Promise<{ page: PersistedPage; summaryText: string }> {
  const createCompletion = createInsforgeCompletion(insforge)
  const modelStrategy = getModelStrategy(modelProvider, "regenerate")

  if (!analysis || analysis.pages?.length === 0) {
    throw new Error("No pages generated");
  }

  emit(writer, "page-loading", {
    pageId: selectedPage.id,
    isLoading: true
  }, { transient: true })

  emit(writer, "generation", {
    status: "regenerating",
    regeneratePage: {
      id: selectedPage.id,
      name: selectedPage.name,
      done: false
    }
  }, { id: "gen-card" })

  const result = await createChatCompletionWithRetries<CompletionResponse>(createCompletion, {
    model: modelStrategy.model,
    messages: [
      {
        role: "system",
        content: WEB_GENERATION_PROMPT,
      },
      {
        role: "user",
        content: `
                You are surgically editing an existing page.
                RULE: Return the COMPLETE page HTML with ONLY the requested change applied. Every other section, component, and element must remain exactly as it is in the Current HTML.

                CONTENT DEPTH: ${contentDepth}
                CREATIVITY LEVEL: ${creativityLevel}
                GENERATION MODE: ${generationMode}
                LAYOUT COMPLEXITY: ${layoutComplexity}
                STYLE INTENSITY: ${styleIntensity}
                EDITING: "${selectedPage.name}"
                USER REQUEST: "${latestUserMessage}"
                CHANGE ONLY: ${analysis.pages[0].visualDescription}
                Current HTML: ${selectedPage.htmlContent}
                Return the full page HTML with only the requested change. Start with <div.`.trim()
      }
    ],
    webSearch: { enabled: false },
    maxTokens: ANALYSIS_MAX_TOKENS
  }, {
    fallbackModels: modelStrategy.fallbackModels,
    signal
  });

  const htmlContent = prepareGeneratedHtml(result.choices[0]?.message?.content ?? "");

  const fullSummaryText = buildRegenerationSummaryText(selectedPage.name)

  const updatedPage = await persistRegeneratedState(
    { insforge, projectId, latestUserParts },
    selectedPage,
    {
      htmlContent,
      rootStyles: analysis.rootStyles ?? selectedPage.rootStyles
    },
    preflightText,
    fullSummaryText
  )

  writeTextResponse(writer, fullSummaryText)

  emit(writer, "page-created", {
    persisted: true,
    page: {
      id: updatedPage.id,
      name: updatedPage.name,
      rootStyles: updatedPage.rootStyles,
      htmlContent: updatedPage.htmlContent,
      isLoading: false,
    }
  }, { transient: true })

  emit(writer, "generation", {
    status: "complete",
    regeneratePage: {
      id: updatedPage.id,
      name: updatedPage.name,
      done: true
    }
  }, { id: "gen-card" })

  return {
    page: updatedPage,
    summaryText: fullSummaryText
  }
}

export async function POST(request: NextRequest) {
  const { signal } = request;
  let operationSignal: ReturnType<typeof createOperationSignal> | null = null
  let createdProjectId: string | null = null
  try {
    const body = await parseJsonBody(request)
    const { messages, slugId, selectedPageId, idempotencyKey, contentDepth, creativityLevel, generationMode, layoutComplexity, modelProvider, styleIntensity } = parseProjectPostBody(body)

    const { user, insforge } = await getAuthServer()
    if (!user?.id) return createErrorResponse(401, "UNAUTHORIZED", "Unauthorized")

    const lastMessage = messages.at(-1)
    if (!lastMessage) {
      throw new RequestValidationError([
        {
          field: "messages",
          message: "Messages must include at least one supported message."
        }
      ])
    }

    const latestUserMessage = lastMessage.parts.find((part) => part.type === "text")?.text?.trim()

    if (!latestUserMessage) {
      throw new RequestValidationError([
        {
          field: "messages[last]",
          message: "The latest message must include a non-empty text part."
        }
      ])
    }

    let { data: project } = await getOwnedProjectBySlug<PersistedProject>(
      insforge,
      user.id,
      slugId,
      "id, title"
    );

    if (!project) {
      const { data: conflictingProject, error: conflictingProjectError } = await insforge.database
        .from<ProjectOwnershipRecord>("projects")
        .select("id, userId")
        .eq("slugId", slugId)
        .single()

      if (conflictingProjectError && conflictingProjectError.code !== "PGRST116") {
        throw conflictingProjectError
      }

      if (conflictingProject && conflictingProject.userId !== user.id) {
        return createErrorResponse(404, "PROJECT_NOT_FOUND", "Project not found")
      }

      const provisionalTitle = "Untitled Project"
      const { data: newProject, error } = await insforge
        .database
        .from<PersistedProject>("projects")
        .insert([
          {
            slugId,
            title: provisionalTitle,
            userId: user.id
          }
        ])
        .select("id, title")
        .single()

      if (error) {
        const errorMessage = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase()
        if (errorMessage.includes("duplicate") || errorMessage.includes("unique")) {
          const { data: racedProject } = await getOwnedProjectBySlug<PersistedProject>(
            insforge,
            user.id,
            slugId,
            "id, title"
          )

          if (!racedProject) {
            throw error
          }

          project = racedProject
        } else {
          throw error
        }
      } else {
        if (!newProject) throw new Error("Failed to create project");
        project = newProject
        createdProjectId = newProject.id
      }

      if (createdProjectId) {
        const generatedTitle = await generateProjectTitle(latestUserMessage, insforge)

        if (generatedTitle && generatedTitle !== provisionalTitle) {
          const { data: updatedProject } = await insforge.database
            .from<PersistedProject>("projects")
            .update({
              title: generatedTitle
            })
            .eq("id", createdProjectId)
            .eq("userId", user.id)
            .select("id, title")
            .single()

          if (updatedProject) {
            project = updatedProject
          } else {
            project = {
              ...project,
              title: generatedTitle
            }
          }
        }
      }
    }

    if (!project) {
      throw new Error("Failed to resolve project")
    }

    const projectId = project.id;

    const { data: existingPages } = await insforge.database.from<PersistedPage[]>("pages")
      .select("id, name, rootStyles, htmlContent")
      .eq("projectId", projectId)
      .order("createdAt", { ascending: true })
      .limit(2)

    const existingPagesList = existingPages ?? []
    const hasExistingPages = existingPagesList.length > 0

    const modelMessages = await convertModelMessages(messages.slice(10) as UIMessage[])

    const imageParts = lastMessage.parts
      .filter((part): part is Extract<ApiMessagePart, { type: "file" }> => (
        part.type === "file" && part.mediaType.startsWith("image/")
      ))
      .map((part) => ({
        type: "image_url" as const,
        image_url: {
          url: part.url
        }
      }))

    const { data: selectedPage } = selectedPageId ? await insforge.database.from<PersistedPage>("pages")
      .select("id, name, rootStyles, htmlContent")
      .eq("id", selectedPageId)
      .eq("projectId", projectId)
      .single()
      : { data: null }

    if (selectedPageId && !selectedPage) {
      return createErrorResponse(404, "PAGE_NOT_FOUND", "Page not found")
    }

    const activeOperationSignal = createOperationSignal(signal, GENERATION_TIMEOUT_MS)
    operationSignal = activeOperationSignal
    const requestHash = createRequestHash({
      slugId,
      selectedPageId,
      contentDepth,
      creativityLevel,
      generationMode,
      layoutComplexity,
      modelProvider,
      styleIntensity,
      messages
    })
    const createCompletion = createInsforgeCompletion(insforge)
    const intentModelStrategy = getModelStrategy(modelProvider, "intent")
    const intentResult = await createChatCompletionWithRetries<CompletionResponse>(createCompletion, {
      model: intentModelStrategy.model,
      messages: [
        {
          role: "system",
          content: SLEEK_INTENT_PROMPT,
        },
        {
          role: "user",
          content: `${latestUserMessage}\nCLASSIFY THE INTENT NOW. ONE WORD ONLY`
        }
      ]
    }, {
      fallbackModels: intentModelStrategy.fallbackModels,
      signal: activeOperationSignal.signal
    })

    throwIfAborted(activeOperationSignal.signal)
    throwIfTimedOut(activeOperationSignal.didTimeOut())

    let intent = classifyIntent(intentResult.choices[0]?.message?.content ?? "")
    const clientIpHash = hashClientIp(getClientIp(request))

    let preflight: PreflightResult | null = null

    if (intent !== "chat") {
      try {
        const preflightModelStrategy = getModelStrategy(modelProvider, "analysis")
        const preflightResult = await createChatCompletionWithRetries<CompletionResponse>(createCompletion, {
          model: preflightModelStrategy.model,
          messages: [
            {
              role: "system",
              content: PRE_GENERATION_PREFLIGHT_PROMPT,
            },
            {
              role: "user",
              content: `
REQUEST MODE: ${intent}
GENERATION MODE: ${generationMode}
CONTENT DEPTH: ${contentDepth}
CREATIVITY LEVEL: ${creativityLevel}
LAYOUT COMPLEXITY: ${layoutComplexity}
STYLE INTENSITY: ${styleIntensity}
${selectedPage ? `SELECTED PAGE: ${selectedPage.name}` : ""}
USER REQUEST: ${latestUserMessage}
`.trim()
            }
          ]
        }, {
          fallbackModels: preflightModelStrategy.fallbackModels,
          signal: activeOperationSignal.signal
        })

        throwIfAborted(activeOperationSignal.signal)
        throwIfTimedOut(activeOperationSignal.didTimeOut())

        preflight = parsePreflightResult(preflightResult.choices[0]?.message?.content ?? "", {
          latestUserMessage
        })

        if (!preflight.shouldGenerate && preflight.clarifyingQuestions.length > 0) {
          intent = "chat"
        }
      } catch (error) {
        if (error instanceof AbortError || isAbortLikeError(error)) {
          throw error
        }

        console.log(error, "Preflight assistant failed; continuing without preflight")
        preflight = null
      }
    }

    let requestState: Awaited<ReturnType<typeof beginGenerationRequest>> = {
      record: null,
      supported: false
    }

    if (intent !== "chat") {
      requestState = await beginGenerationRequest(
        insforge,
        user.id,
        projectId,
        selectedPageId,
        idempotencyKey,
        requestHash,
        intent,
        clientIpHash
      )

      if (requestState.record && !requestState.record.wasCreated && requestState.record.status === "in_progress") {
        activeOperationSignal.cleanup()
        return createErrorResponse(409, "GENERATION_ALREADY_IN_PROGRESS", "This request is already being processed.")
      }
    }

    if (requestState.record?.status === "completed" && requestState.record.response) {
      const uiStream = createUIMessageStream({
        generateId: generateId,
        async execute({ writer }) {
          try {
            await replayStoredResponse(writer, requestState.record!.response!)
          } finally {
            operationSignal?.cleanup()
          }
        }
      })

      return createUIMessageStreamResponse({
        stream: uiStream
      })
    }

    const uiStream = createUIMessageStream({
      generateId: generateId,
      async execute({ writer }) {
        let genCardEmitted = false;
        let hasCommittedWrites = false
        let generationRequestId: string | null = requestState.record?.id ?? null

        try {
          emit(writer, "project-title", {
            title: project.title
          }, { id: "proj-title", transient: true })

          throwIfAborted(activeOperationSignal.signal)
          throwIfTimedOut(activeOperationSignal.didTimeOut())

          if (intent === "chat") {
            const chatModelStrategy = getModelStrategy(modelProvider, "chat")
            const chatRequestState = await beginGenerationRequest(
              insforge,
              user.id,
              projectId,
              selectedPageId,
              idempotencyKey,
              requestHash,
              intent,
              null
            )

            generationRequestId = chatRequestState.record?.id ?? null

            if (chatRequestState.record?.status === "completed" && chatRequestState.record.response) {
              await replayStoredResponse(writer, chatRequestState.record.response)
              hasCommittedWrites = true
              return
            }

            if (chatRequestState.record && !chatRequestState.record.wasCreated && chatRequestState.record.status === "in_progress") {
              writer.write({ type: "error", errorText: "This request is already being processed." })
              return
            }

            const chatText = preflight && !preflight.shouldGenerate
              ? preflight.assistantMessage
              : await (async () => {
                const chatResult = await createChatCompletionWithRetries<StreamingCompletionResponse>(createCompletion, {
                  model: chatModelStrategy.model,
                  messages: [
                    {
                      role: "system",
                      content: SLEEK_CHAT_PROMPT
                    },
                    ...modelMessages
                  ],
                  stream: true,
                  webSearch: { enabled: false }
                }, {
                  fallbackModels: chatModelStrategy.fallbackModels,
                  signal: activeOperationSignal.signal
                })

                return streamTextResponse(writer, chatResult, activeOperationSignal.signal)
              })()

            if (preflight && !preflight.shouldGenerate) {
              writeTextResponse(writer, chatText)
            }

            throwIfAborted(activeOperationSignal.signal)
            throwIfTimedOut(activeOperationSignal.didTimeOut())

            await persistMessagePair(insforge, projectId, lastMessage.parts, [
              { type: "text", text: chatText }
            ])
            await finishGenerationRequest(
              insforge,
              generationRequestId,
              "completed",
              {
                kind: "chat",
                text: chatText
              },
              null
            )
            hasCommittedWrites = true
            return
          }

          const isRegen = intent === "regenerate" && !!selectedPage

          emit(writer, "generation", {
            status: "analyzing",
            page: []
          }, { id: "gen-card" })

          genCardEmitted = true
          const analysisModelStrategy = getModelStrategy(modelProvider, "analysis")
          const improvedUserPrompt = preflight?.improvedPrompt?.trim() || latestUserMessage
          const preflightText = preflight?.assistantMessage?.trim() || null

          if (preflightText) {
            writeTextResponse(writer, preflightText)
          }

          const analysisResult = await createChatCompletionWithRetries<CompletionResponse>(createCompletion, {
            model: analysisModelStrategy.model,
            messages: [
              {
                role: "system",
                content: WEB_ANALYSIS_PROMPT
              },
              {
                role: "user",
                content: [
                  ...imageParts,
                  {
                    type: "text",
                    text: `${imageParts.length > 0
                      ? "Reference image attached - extract EVERY detail: colors, layout, components, spacing. Match it precisely.\n\n"
                      : ""}
    CONTENT DEPTH: ${contentDepth || DEFAULT_CONTENT_DEPTH}
    CONTENT GUIDANCE:
    ${CONTENT_DEPTH_PROMPT_GUIDANCE}
    Match the requested degree of copy completeness across headlines, supporting text, labels, stats, testimonials, tables, and body content.

    CREATIVITY LEVEL: ${creativityLevel || DEFAULT_CREATIVITY_LEVEL}
    CREATIVITY GUIDANCE:
    ${CREATIVITY_LEVEL_PROMPT_GUIDANCE}
    Match the requested level of prompt adherence versus invention across layout decisions, section selection, and stylistic interpretation.

    GENERATION MODE: ${generationMode}
    MODE GUIDANCE:
    ${GENERATION_MODE_PROMPT_GUIDANCE}
    Build specifically for the "${generationMode}" surface type unless the user explicitly asks for a different format.

    LAYOUT COMPLEXITY: ${layoutComplexity || DEFAULT_LAYOUT_COMPLEXITY}
    LAYOUT GUIDANCE:
    ${LAYOUT_COMPLEXITY_PROMPT_GUIDANCE}
    Match the requested structural richness through section count, grid density, and compositional layering.

    STYLE INTENSITY: ${styleIntensity || DEFAULT_STYLE_INTENSITY}
    STYLE GUIDANCE:
    ${STYLE_INTENSITY_PROMPT_GUIDANCE}
    Match the requested intensity with clear visual restraint or drama in both layout and styling.

    ${selectedPage && isRegen
                        ? `EDITING THIS PAGE:\n- Name: ${selectedPage.name}\n- Current Styles:\n${selectedPage.rootStyles}\n- Current HTML:\n${selectedPage.htmlContent}\nBe surgical apply only requested changes.\n\n`
                        : selectedPage && !isRegen
                          ? `STYLE REFERENCE (match this brand DNA):
                              - Name: ${selectedPage.name}
                              - Brand Colors & Fonts: See Styles below.
                              - Logo/Header Pattern: ${selectedPage.htmlContent.substring(0, 1500)}
                              - Styles:${selectedPage.rootStyles}\n\n`
                          : ""}
        ${hasExistingPages && !isRegen
                        ? `EXISTING PAGES (do NOT recreate):\n${existingPagesList.map((page) => `- ${page.name}\n${page.rootStyles}`).join("\n")}\n\n`
                        : ""}
        USER REQUEST: "${improvedUserPrompt}"OUTPUT RAW JSON ONLY.`.trim()
                  }
                ]
              }
            ],
            maxTokens: ANALYSIS_MAX_TOKENS,
          }, {
            fallbackModels: analysisModelStrategy.fallbackModels,
            signal: activeOperationSignal.signal
          });

          throwIfAborted(activeOperationSignal.signal)
          throwIfTimedOut(activeOperationSignal.didTimeOut())

          const analysisText = analysisResult.choices[0].message.content || "{}"
          const analysis = parseAnalysisResult(analysisText, {
            latestUserMessage: improvedUserPrompt,
            contentDepth,
            creativityLevel,
            generationMode,
            layoutComplexity,
            styleIntensity,
            selectedPage,
            isRegen
          })

          if (isRegen && selectedPageId) {
            const regenerated = await runRegenerateWorker({
              insforge,
              writer,
              projectId,
              selectedPage,
              latestUserParts: lastMessage.parts,
              latestUserMessage: improvedUserPrompt,
              analysis,
              contentDepth,
              creativityLevel,
              generationMode,
              layoutComplexity,
              modelProvider,
              preflightText,
              styleIntensity,
              signal: activeOperationSignal.signal,
            })
            await finishGenerationRequest(
              insforge,
              generationRequestId,
              "completed",
              {
                kind: "regenerate",
                page: regenerated.page,
                preflightText: preflightText ?? undefined,
                summaryText: regenerated.summaryText
              },
              null
            )
            hasCommittedWrites = true
            return
          }

          const generated = await runGenerationWorker({
            insforge,
            writer,
            projectId,
            latestUserParts: lastMessage.parts,
            latestUserMessage: improvedUserPrompt,
            analysis,
            existingPages,
            contentDepth,
            creativityLevel,
            generationMode,
            layoutComplexity,
            modelProvider,
            preflightText,
            styleIntensity,
            signal: activeOperationSignal.signal,
          });
          await finishGenerationRequest(
            insforge,
            generationRequestId,
            "completed",
              {
                kind: "generate",
                pages: generated.savedPages,
                preflightText: preflightText ?? undefined,
                summaryText: generated.summaryText
              },
              null
          )
          hasCommittedWrites = true
        } catch (error) {
          if (createdProjectId && !hasCommittedWrites) {
            await safeDeleteProject(insforge, createdProjectId)
          }

          if (error instanceof GenerationTimeoutError || activeOperationSignal.didTimeOut()) {
            await finishGenerationRequest(
              insforge,
              generationRequestId,
              "timed_out",
              null,
              "Generation timed out before completion."
            )
            emit(writer, "generation", { status: "error" }, { id: "gen-card" });
            writer.write({ type: "error", errorText: "Generation timed out. Please try again." })
            return
          }

          if (error instanceof AbortError || isAbortLikeError(error)) {
            await finishGenerationRequest(
              insforge,
              generationRequestId,
              "failed",
              null,
              "Request canceled by client."
            )
            if (genCardEmitted) {
              emit(writer, "generation", { status: "canceled" }, {
                id: "gen-card"
              })
              writer.write({ type: "abort" })
            }
            return
          }

          console.log(error)
          const backendUnavailableMessage = getBackendUnavailableMessage(error)
          const aiProviderErrorMessage = getAiProviderErrorMessage(error)

          await finishGenerationRequest(
            insforge,
            generationRequestId,
            "failed",
            null,
            aiProviderErrorMessage ?? backendUnavailableMessage ?? (error instanceof Error ? error.message : "Unknown generation error")
          )
          emit(writer, "generation", { status: "error" }, { id: "gen-card" });
          writer.write({ type: "error", errorText: aiProviderErrorMessage ?? backendUnavailableMessage ?? "Something went wrong" })
        } finally {
          activeOperationSignal.cleanup()
        }
      }
    })

    return createUIMessageStreamResponse({
      stream: uiStream
    })

  } catch (error) {
    operationSignal?.cleanup()
    if (error instanceof AbortError || isAbortLikeError(error)) {
      return new Response(null, { status: 499 })
    }
    if (error instanceof RateLimitError) {
      return Response.json(
        {
          success: false,
          error: {
            code: error.code,
            message: error.message
          }
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(error.retryAfterSeconds)
          }
        }
      )
    }
    if (error instanceof RequestValidationError) {
      return createValidationErrorResponse(error)
    }
    const backendUnavailableMessage = getBackendUnavailableMessage(error)
    const aiProviderErrorMessage = getAiProviderErrorMessage(error)
    if (backendUnavailableMessage) {
      return createErrorResponse(503, "BACKEND_UNAVAILABLE", backendUnavailableMessage)
    }
    if (aiProviderErrorMessage) {
      return createErrorResponse(401, "AI_PROVIDER_AUTH_FAILED", aiProviderErrorMessage)
    }
    console.log(error);
    return createErrorResponse(500, "INTERNAL_SERVER_ERROR", "Internal server error");
  }
}
