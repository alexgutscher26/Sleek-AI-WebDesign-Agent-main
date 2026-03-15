import { NextResponse } from "next/server"

const SLUG_ID_PATTERN = /^[A-Za-z0-9]{6,64}$/
const ENTITY_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/
const ALLOWED_MESSAGE_ROLES = new Set(["system", "user", "assistant"])
const ALLOWED_PART_TYPES = new Set(["text", "file"])

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
}

export type ApiMessagePart = TextPart | FilePart

export type ApiMessage = {
  role: "system" | "user" | "assistant"
  parts: ApiMessagePart[]
}

export type ProjectPostBody = {
  slugId: string
  selectedPageId: string | null
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

const validateTextPart = (value: Record<string, unknown>, field: string) => {
  if (typeof value.text !== "string" || !value.text.trim()) {
    return {
      ok: false as const,
      issue: { field, message: "Text parts must include non-empty text." }
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

  return {
    ok: true as const,
    value: {
      type: "file" as const,
      url: value.url,
      mediaType: value.mediaType,
      filename: typeof value.filename === "string" ? value.filename : undefined
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
      issue: { field: `${field}.role`, message: "Unsupported message role." }
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

  for (let partIndex = 0; partIndex < value.parts.length; partIndex += 1) {
    const parsedPart = validateMessagePart(value.parts[partIndex], partIndex)
    if (!parsedPart.ok) {
      issues.push(parsedPart.issue)
      continue
    }
    parts.push(parsedPart.value)
  }

  if (issues.length > 0) {
    return { ok: false as const, issues }
  }

  return {
    ok: true as const,
    value: {
      role: value.role as ApiMessage["role"],
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

  if (!slugIdResult.ok) issues.push(slugIdResult.issue)
  if (!selectedPageIdResult.ok) issues.push(selectedPageIdResult.issue)

  if (!Array.isArray(input.messages) || input.messages.length === 0) {
    issues.push({ field: "messages", message: "Messages must be a non-empty array." })
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
      messages.push(parsedMessage.value)
    }
  }

  if (issues.length > 0) {
    throw new RequestValidationError(issues)
  }

  if (!slugIdResult.ok || !selectedPageIdResult.ok) {
    throw new RequestValidationError([
      { field: "body", message: "Request validation failed." }
    ])
  }

  return {
    slugId: slugIdResult.value,
    selectedPageId: selectedPageIdResult.value,
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
  return NextResponse.json(
    {
      error: "Invalid request",
      issues: error.issues
    },
    { status: 400 }
  )
}
