import { createErrorResponse } from "@/lib/api-response"
import {
  ALLOWED_FILE_MIME_TYPES,
  MAX_FILE_SIZE_BYTES,
  MAX_MESSAGES,
  MAX_TEXT_PART_LENGTH,
  MAX_TOTAL_TEXT_LENGTH,
  MIME_EXTENSIONS
} from "@/lib/request-limits"
import { verifyInlineFilePayload } from "@/lib/file-validation"
import {
  CONTENT_DEPTH_SET,
  DEFAULT_CONTENT_DEPTH,
  type ContentDepth
} from "@/constants/content-depth"
import {
  CREATIVITY_LEVEL_SET,
  DEFAULT_CREATIVITY_LEVEL,
  type CreativityLevel
} from "@/constants/creativity-level"
import { DEFAULT_GENERATION_MODE, GENERATION_MODE_SET, type GenerationMode } from "@/constants/generation-mode"
import {
  DEFAULT_LAYOUT_COMPLEXITY,
  LAYOUT_COMPLEXITY_SET,
  type LayoutComplexity
} from "@/constants/layout-complexity"
import {
  DEFAULT_MODEL_PROVIDER,
  MODEL_PROVIDER_SET,
  type ModelProvider
} from "@/constants/model-provider"
import { DEFAULT_STYLE_INTENSITY, STYLE_INTENSITY_SET, type StyleIntensity } from "@/constants/style-intensity"
import { detectPromptInjection } from "@/lib/prompt-injection"

const SLUG_ID_PATTERN = /^[A-Za-z0-9]{6,64}$/
const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_-]{8,128}$/
const ALLOWED_MESSAGE_ROLES = new Set(["user", "assistant"])
const ALLOWED_PART_TYPES = new Set(["text", "file"])
const ALLOWED_FILE_MIME_TYPES_SET = new Set(ALLOWED_FILE_MIME_TYPES)

type ValidationIssue = {
  field: string
  message: string
}

export class RequestValidationError extends Error {
  issues: ValidationIssue[]

  constructor(issues: ValidationIssue[]) {
    super("Invalid request")
    this.name = "RequestValidationError"
    this.issues = issues
  }
}

type TextPart = {
  type: "text"
  text: string
}

type FilePart = {
  type: "file"
  url: string
  mediaType: string
  filename?: string
  size?: number
}

export type ApiMessagePart = TextPart | FilePart

export type ApiMessage = {
  role: "system" | "user" | "assistant"
  parts: ApiMessagePart[]
}

export type ProjectPostBody = {
  slugId: string
  selectedPageId: string | null
  idempotencyKey: string | null
  contentDepth: ContentDepth
  creativityLevel: CreativityLevel
  generationMode: GenerationMode
  layoutComplexity: LayoutComplexity
  modelProvider: ModelProvider
  styleIntensity: StyleIntensity
  messages: ApiMessage[]
}

export type AuthPostBody =
  | {
      action: "sign-in" | "sign-up"
      email: string
      password: string
    }
  | {
      action: "sync-token"
      user?: {
        id: string
        email: string
        profile?: unknown
      }
    }

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const validateSlugId = (value: unknown, field = "slugId") => {
  if (typeof value !== "string" || !SLUG_ID_PATTERN.test(value)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be an alphanumeric slug ID." }
    }
  }

  return { ok: true as const, value }
}

const validateOptionalEntityId = (value: unknown, field: string) => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: null }
  }

  if (typeof value !== "string" || !ENTITY_ID_PATTERN.test(value)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be a valid identifier string." }
    }
  }

  return { ok: true as const, value }
}

const validateOptionalIdempotencyKey = (value: unknown, field = "idempotencyKey") => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: null }
  }

  if (typeof value !== "string" || !IDEMPOTENCY_KEY_PATTERN.test(value)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be a valid idempotency key." }
    }
  }

  return { ok: true as const, value }
}

const validateGenerationMode = (value: unknown, field = "generationMode") => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: DEFAULT_GENERATION_MODE }
  }

  if (typeof value !== "string" || !GENERATION_MODE_SET.has(value as GenerationMode)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be one of: landing, dashboard, auth, docs, ecommerce." }
    }
  }

  return { ok: true as const, value: value as GenerationMode }
}

const validateContentDepth = (value: unknown, field = "contentDepth") => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: DEFAULT_CONTENT_DEPTH }
  }

  if (typeof value !== "string" || !CONTENT_DEPTH_SET.has(value as ContentDepth)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be one of: wireframe, realistic-copy, complete." }
    }
  }

  return { ok: true as const, value: value as ContentDepth }
}

const validateCreativityLevel = (value: unknown, field = "creativityLevel") => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: DEFAULT_CREATIVITY_LEVEL }
  }

  if (typeof value !== "string" || !CREATIVITY_LEVEL_SET.has(value as CreativityLevel)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be one of: strict, balanced, exploratory." }
    }
  }

  return { ok: true as const, value: value as CreativityLevel }
}

const validateLayoutComplexity = (value: unknown, field = "layoutComplexity") => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: DEFAULT_LAYOUT_COMPLEXITY }
  }

  if (typeof value !== "string" || !LAYOUT_COMPLEXITY_SET.has(value as LayoutComplexity)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be one of: simple, balanced, complex." }
    }
  }

  return { ok: true as const, value: value as LayoutComplexity }
}

const validateModelProvider = (value: unknown, field = "modelProvider") => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: DEFAULT_MODEL_PROVIDER }
  }

  if (typeof value !== "string" || !MODEL_PROVIDER_SET.has(value as ModelProvider)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be one of: auto, gemini, claude." }
    }
  }

  return { ok: true as const, value: value as ModelProvider }
}

const validateStyleIntensity = (value: unknown, field = "styleIntensity") => {
  if (value === undefined || value === null || value === "") {
    return { ok: true as const, value: DEFAULT_STYLE_INTENSITY }
  }

  if (typeof value !== "string" || !STYLE_INTENSITY_SET.has(value as StyleIntensity)) {
    return {
      ok: false as const,
      issue: { field, message: "Must be one of: minimal, balanced, bold." }
    }
  }

  return { ok: true as const, value: value as StyleIntensity }
}

const validateTextPart = (value: Record<string, unknown>, field: string) => {
  if (typeof value.text !== "string" || !value.text.trim()) {
    return {
      ok: false as const,
      issue: { field, message: "Text parts must include non-empty text." }
    }
  }

  if (value.text.length > MAX_TEXT_PART_LENGTH) {
    return {
      ok: false as const,
      issue: {
        field,
        message: `Text parts must be ${MAX_TEXT_PART_LENGTH} characters or fewer.`
      }
    }
  }

  return {
    ok: true as const,
    value: {
      type: "text" as const,
      text: value.text
    }
  }
}

const validateFilePart = (value: Record<string, unknown>, field: string) => {
  if (typeof value.url !== "string" || !value.url.trim()) {
    return {
      ok: false as const,
      issue: { field, message: "File parts must include a URL." }
    }
  }

  if (typeof value.mediaType !== "string" || !value.mediaType.trim()) {
    return {
      ok: false as const,
      issue: { field, message: "File parts must include a media type." }
    }
  }

  if (!ALLOWED_FILE_MIME_TYPES_SET.has(value.mediaType as (typeof ALLOWED_FILE_MIME_TYPES)[number])) {
    return {
      ok: false as const,
      issue: {
        field,
        message: "Only JPEG, PNG, WEBP, and GIF image uploads are supported."
      }
    }
  }

  if (
    typeof value.size !== "number" ||
    !Number.isFinite(value.size) ||
    value.size <= 0 ||
    value.size > MAX_FILE_SIZE_BYTES
  ) {
    return {
      ok: false as const,
      issue: {
        field,
        message: `Files must be between 1 byte and ${MAX_FILE_SIZE_BYTES} bytes.`
      }
    }
  }

  if (typeof value.filename !== "string" || !value.filename.trim()) {
    return {
      ok: false as const,
      issue: {
        field,
        message: "File parts must include a filename."
      }
    }
  }

  const normalizedFilename = value.filename.toLowerCase()
  const allowedExtensions = MIME_EXTENSIONS[value.mediaType as keyof typeof MIME_EXTENSIONS] ?? []
  const matchesExtension = allowedExtensions.some((extension) =>
    normalizedFilename.endsWith(extension)
  )

  if (!matchesExtension) {
    return {
      ok: false as const,
      issue: {
        field,
        message: "File type does not match the provided filename extension."
      }
    }
  }

  const verification = verifyInlineFilePayload(
    value.url,
    value.mediaType,
    typeof value.size === "number" ? value.size : undefined
  )

  if (!verification.ok) {
    return {
      ok: false as const,
      issue: {
        field,
        message: verification.message
      }
    }
  }

  return {
    ok: true as const,
    value: {
      type: "file" as const,
      url: value.url,
      mediaType: value.mediaType,
      filename: typeof value.filename === "string" ? value.filename : undefined,
      size: typeof value.size === "number" ? value.size : undefined
    }
  }
}

const validateMessagePart = (value: unknown, index: number) => {
  const field = `messages[].parts[${index}]`
  if (!isRecord(value)) {
    return {
      ok: false as const,
      issue: { field, message: "Each message part must be an object." }
    }
  }

  if (!ALLOWED_PART_TYPES.has(String(value.type))) {
    return {
      ok: false as const,
      issue: { field, message: "Unsupported message part type." }
    }
  }

  if (value.type === "text") {
    return validateTextPart(value, field)
  }

  return validateFilePart(value, field)
}

const validateMessage = (value: unknown, index: number) => {
  const field = `messages[${index}]`
  if (!isRecord(value)) {
    return {
      ok: false as const,
      issue: { field, message: "Each message must be an object." }
    }
  }

  if (!ALLOWED_MESSAGE_ROLES.has(String(value.role))) {
    return {
      ok: false as const,
      issue: { field: `${field}.role`, message: "Only user and assistant message roles are supported." }
    }
  }

  if (!Array.isArray(value.parts) || value.parts.length === 0) {
    return {
      ok: false as const,
      issue: { field: `${field}.parts`, message: "Each message must include at least one part." }
    }
  }

  const parts: ApiMessagePart[] = []
  const issues: ValidationIssue[] = []
  const role = value.role as ApiMessage["role"]

  for (let partIndex = 0; partIndex < value.parts.length; partIndex += 1) {
    const rawPart = value.parts[partIndex]
    const parsedPart = validateMessagePart(rawPart, partIndex)
    if (!parsedPart.ok) {
      const rawType = isRecord(rawPart) && typeof rawPart.type === "string"
        ? rawPart.type
        : null

      // Assistant messages can include UI-only metadata parts (for example data-generation).
      // We ignore those on the server and keep only text/file parts for model context.
      if (role === "assistant" && rawType && !ALLOWED_PART_TYPES.has(rawType)) {
        continue
      }

      issues.push(parsedPart.issue)
      continue
    }
    parts.push(parsedPart.value)
  }

  if (issues.length > 0) {
    return { ok: false as const, issues }
  }

  if (parts.length === 0) {
    if (role === "assistant") {
      return {
        ok: true as const,
        value: {
          role,
          parts
        }
      }
    }

    return {
      ok: false as const,
      issue: { field: `${field}.parts`, message: "Each message must include at least one supported part." }
    }
  }

  return {
    ok: true as const,
    value: {
      role,
      parts
    }
  }
}

export async function parseJsonBody(request: Request) {
  try {
    return await request.json()
  } catch {
    throw new RequestValidationError([
      { field: "body", message: "Request body must be valid JSON." }
    ])
  }
}

export function parseProjectPostBody(input: unknown): ProjectPostBody {
  if (!isRecord(input)) {
    throw new RequestValidationError([
      { field: "body", message: "Request body must be a JSON object." }
    ])
  }

  const issues: ValidationIssue[] = []
  const slugIdResult = validateSlugId(input.slugId)
  const selectedPageIdResult = validateOptionalEntityId(input.selectedPageId, "selectedPageId")
  const idempotencyKeyResult = validateOptionalIdempotencyKey(input.idempotencyKey)
  const contentDepthResult = validateContentDepth(input.contentDepth)
  const creativityLevelResult = validateCreativityLevel(input.creativityLevel)
  const generationModeResult = validateGenerationMode(input.generationMode)
  const layoutComplexityResult = validateLayoutComplexity(input.layoutComplexity)
  const modelProviderResult = validateModelProvider(input.modelProvider)
  const styleIntensityResult = validateStyleIntensity(input.styleIntensity)

  if (!slugIdResult.ok) issues.push(slugIdResult.issue)
  if (!selectedPageIdResult.ok) issues.push(selectedPageIdResult.issue)
  if (!idempotencyKeyResult.ok) issues.push(idempotencyKeyResult.issue)
  if (!contentDepthResult.ok) issues.push(contentDepthResult.issue)
  if (!creativityLevelResult.ok) issues.push(creativityLevelResult.issue)
  if (!generationModeResult.ok) issues.push(generationModeResult.issue)
  if (!layoutComplexityResult.ok) issues.push(layoutComplexityResult.issue)
  if (!modelProviderResult.ok) issues.push(modelProviderResult.issue)
  if (!styleIntensityResult.ok) issues.push(styleIntensityResult.issue)

  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    issues.push({ field: "messages", message: "Messages must be a non-empty array." })
  } else if (input.messages.length > MAX_MESSAGES) {
    issues.push({
      field: "messages",
      message: `Messages must contain ${MAX_MESSAGES} entries or fewer.`
    })
  }

  const messages: ApiMessage[] = []
  if (Array.isArray(input.messages)) {
    for (let index = 0; index < input.messages.length; index += 1) {
      const parsedMessage = validateMessage(input.messages[index], index)
      if (!parsedMessage.ok) {
        const parsedIssues = "issues" in parsedMessage
          ? (parsedMessage.issues ?? [])
          : parsedMessage.issue
            ? [parsedMessage.issue]
            : []
        issues.push(...parsedIssues)
        continue
      }
      if (parsedMessage.value.parts.length === 0) {
        continue
      }
      messages.push(parsedMessage.value)
    }
  }

  if (issues.length > 0) {
    throw new RequestValidationError(issues)
  }

  const totalTextLength = messages.reduce((sum, message) => (
    sum + message.parts.reduce((partSum, part) => (
      part.type === "text" ? partSum + part.text.length : partSum
    ), 0)
  ), 0)

  if (messages.length === 0) {
    throw new RequestValidationError([
      {
        field: "messages",
        message: "Messages must include at least one supported message."
      }
    ])
  }

  const lastMessage = messages[messages.length - 1]
  const hasUserMessage = messages.some((message) => message.role === "user")
  const hasLastUserText = lastMessage.role === "user" && lastMessage.parts.some((part) => (
    part.type === "text" && part.text.trim().length > 0
  ))

  if (!hasUserMessage) {
    throw new RequestValidationError([
      {
        field: "messages",
        message: "Messages must include at least one user message."
      }
    ])
  }

  if (lastMessage.role !== "user") {
    throw new RequestValidationError([
      {
        field: "messages[last].role",
        message: "The latest message must be from the user."
      }
    ])
  }

  if (!hasLastUserText) {
    throw new RequestValidationError([
      {
        field: "messages[last]",
        message: "The latest user message must include a non-empty text part."
      }
    ])
  }

  if (totalTextLength > MAX_TOTAL_TEXT_LENGTH) {
    throw new RequestValidationError([
      {
        field: "messages",
        message: `Total prompt text must be ${MAX_TOTAL_TEXT_LENGTH} characters or fewer.`
      }
    ])
  }

  const latestUserText = lastMessage.parts
    .filter((part): part is Extract<ApiMessagePart, { type: "text" }> => part.type === "text")
    .map((part) => part.text)
    .join("\n")

  const injectionCheck = detectPromptInjection(latestUserText)
  if (injectionCheck.blocked) {
    throw new RequestValidationError([
      {
        field: "messages[last]",
        message: "The latest user message appears to contain prompt-injection or instruction-override content."
      }
    ])
  }

  if (
    !slugIdResult.ok ||
    !selectedPageIdResult.ok ||
    !idempotencyKeyResult.ok ||
    !contentDepthResult.ok ||
    !creativityLevelResult.ok ||
    !generationModeResult.ok ||
    !layoutComplexityResult.ok ||
    !modelProviderResult.ok ||
    !styleIntensityResult.ok
  ) {
    throw new RequestValidationError([
      { field: "body", message: "Request validation failed." }
    ])
  }

  return {
    slugId: slugIdResult.value,
    selectedPageId: selectedPageIdResult.value,
    idempotencyKey: idempotencyKeyResult.value,
    contentDepth: contentDepthResult.value,
    creativityLevel: creativityLevelResult.value,
    generationMode: generationModeResult.value,
    layoutComplexity: layoutComplexityResult.value,
    modelProvider: modelProviderResult.value,
    styleIntensity: styleIntensityResult.value,
    messages
  }
}

export function parseAuthPostBody(input: unknown): AuthPostBody {
  if (!isRecord(input)) {
    throw new RequestValidationError([
      { field: "body", message: "Request body must be a JSON object." }
    ])
  }

  const action = input.action
  if (action !== "sign-in" && action !== "sign-up" && action !== "sync-token") {
    throw new RequestValidationError([
      { field: "action", message: "Action must be sign-in, sign-up, or sync-token." }
    ])
  }

  if (action === "sign-in" || action === "sign-up") {
    const issues: ValidationIssue[] = []

    if (typeof input.email !== "string" || !input.email.trim()) {
      issues.push({ field: "email", message: "Email is required." })
    }

    if (typeof input.password !== "string" || !input.password.trim()) {
      issues.push({ field: "password", message: "Password is required." })
    }

    if (issues.length > 0) {
      throw new RequestValidationError(issues)
    }

    return {
      action,
      email: input.email as string,
      password: input.password as string
    }
  }

  if (input.user !== undefined) {
    if (!isRecord(input.user)) {
      throw new RequestValidationError([
        { field: "user", message: "User must be an object when provided." }
      ])
    }

    if (typeof input.user.id !== "string" || !input.user.id.trim()) {
      throw new RequestValidationError([
        { field: "user.id", message: "User ID must be a non-empty string." }
      ])
    }

    if (typeof input.user.email !== "string" || !input.user.email.trim()) {
      throw new RequestValidationError([
        { field: "user.email", message: "User email must be a non-empty string." }
      ])
    }
  }

  return {
    action: "sync-token",
    user: input.user as { id: string; email: string; profile?: unknown } | undefined
  }
}

export function parseSlugRouteParams(input: unknown) {
  const slugIdResult = validateSlugId(input, "slugId")

  if (!slugIdResult.ok) {
    throw new RequestValidationError([slugIdResult.issue])
  }

  return {
    slugId: slugIdResult.value
  }
}

export function createValidationErrorResponse(error: RequestValidationError) {
  return createErrorResponse(400, "INVALID_REQUEST", "Invalid request", {
    issues: error.issues
  })
}
