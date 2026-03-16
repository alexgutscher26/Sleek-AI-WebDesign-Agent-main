const HIGH_CONFIDENCE_PATTERNS: Array<{ pattern: RegExp; reason: string }> = [
  { pattern: /\bignore\s+(all\s+)?(previous|prior|above)\s+(instructions|rules|prompts?)\b/i, reason: "override-instructions" },
  { pattern: /\b(disregard|bypass|override)\s+(the\s+)?(system|developer)\s+(prompt|message|instructions?)\b/i, reason: "override-system-prompt" },
  { pattern: /\breveal\b.{0,40}\b(system prompt|developer prompt|hidden prompt|internal instructions?)\b/i, reason: "exfiltrate-prompts" },
  { pattern: /\b(print|show|dump|repeat|quote)\b.{0,40}\b(system prompt|developer prompt|hidden instructions?)\b/i, reason: "exfiltrate-prompts" },
  { pattern: /\byou are now\b.{0,60}\b(system|developer|root|admin|unfiltered)\b/i, reason: "role-reassignment" },
  { pattern: /\bact as\b.{0,60}\b(system|developer|admin|another ai|openai|chatgpt|claude|gemini)\b/i, reason: "role-reassignment" },
  { pattern: /\bdo not follow\b.{0,40}\b(previous|prior|system|developer)\b/i, reason: "disable-guardrails" },
  { pattern: /\b(jailbreak|prompt injection|dan mode)\b/i, reason: "jailbreak-attempt" }
]

const normalizeWhitespace = (value: string) => value.replace(/\s+/g, " ").trim()

export const detectPromptInjection = (value: string) => {
  const normalized = normalizeWhitespace(value)
  const matchedReasons = HIGH_CONFIDENCE_PATTERNS
    .filter(({ pattern }) => pattern.test(normalized))
    .map(({ reason }) => reason)

  return {
    blocked: matchedReasons.length > 0,
    reasons: Array.from(new Set(matchedReasons))
  }
}

