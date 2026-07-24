export const CONTENT_DEPTHS = [
  {
    value: "wireframe",
    label: "Wireframe",
    description:
      "Sparse placeholder-style structure with minimal copy and simplified content blocks.",
  },
  {
    value: "realistic-copy",
    label: "Realistic Copy",
    description:
      "Believable product messaging with meaningful labels, headlines, and supporting text.",
  },
  {
    value: "complete",
    label: "Complete",
    description:
      "Fully fleshed-out copy and content detail that feels close to a finished marketing or product surface.",
  },
] as const

export type ContentDepth = (typeof CONTENT_DEPTHS)[number]["value"]

export const DEFAULT_CONTENT_DEPTH: ContentDepth = "realistic-copy"

export const CONTENT_DEPTH_SET = new Set<ContentDepth>(CONTENT_DEPTHS.map((level) => level.value))
