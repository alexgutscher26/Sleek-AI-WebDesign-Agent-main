type SanitizedHtmlResult = {
  html: string
  blocked: string[]
}

const DANGEROUS_BLOCK_PATTERNS: Array<{ label: string; pattern: RegExp }> = [
  { label: "script tag", pattern: /<script\b[\s\S]*?<\/script>/gi },
  { label: "iframe tag", pattern: /<iframe\b[\s\S]*?<\/iframe>/gi },
  { label: "object tag", pattern: /<object\b[\s\S]*?<\/object>/gi },
  { label: "embed tag", pattern: /<embed\b[^>]*>/gi },
  { label: "base tag", pattern: /<base\b[^>]*>/gi },
  { label: "meta refresh", pattern: /<meta\b[^>]*http-equiv\s*=\s*["']?refresh["']?[^>]*>/gi },
]

const DANGEROUS_ATTRIBUTE_PATTERNS: Array<{ label: string; pattern: RegExp; replaceWith: string }> =
  [
    {
      label: "inline event handler",
      pattern: /\son[a-z-]+\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      replaceWith: "",
    },
    {
      label: "javascript url",
      pattern: /\s(href|src|action|formaction|xlink:href)\s*=\s*(['"])\s*javascript:[\s\S]*?\2/gi,
      replaceWith: ' $1="#"',
    },
    {
      label: "html data url",
      pattern: /\s(href|src|action|formaction)\s*=\s*(['"])\s*data:text\/html[\s\S]*?\2/gi,
      replaceWith: ' $1="#"',
    },
    {
      label: "srcdoc attribute",
      pattern: /\ssrcdoc\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi,
      replaceWith: "",
    },
  ]

export const extractPrimaryHtml = (rawHtml: string) => {
  const withoutCodeFences = rawHtml.replace(/```(?:html)?/gi, "").trim()
  const match = withoutCodeFences.match(/<div[\s\S]*<\/div>/i)
  return (match ? match[0] : withoutCodeFences).trim()
}

export const sanitizeGeneratedHtml = (htmlContent: string): SanitizedHtmlResult => {
  let html = htmlContent
  const blocked = new Set<string>()

  for (const { label, pattern } of DANGEROUS_BLOCK_PATTERNS) {
    if (pattern.test(html)) {
      blocked.add(label)
      html = html.replace(pattern, "")
    }
  }

  for (const { label, pattern, replaceWith } of DANGEROUS_ATTRIBUTE_PATTERNS) {
    if (pattern.test(html)) {
      blocked.add(label)
      html = html.replace(pattern, replaceWith)
    }
  }

  return {
    html: html.trim(),
    blocked: Array.from(blocked),
  }
}
