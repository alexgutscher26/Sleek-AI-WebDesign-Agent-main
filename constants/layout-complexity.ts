export const LAYOUT_COMPLEXITIES = [
  {
    value: "simple",
    label: "Simple",
    description:
      "Cleaner layouts with fewer sections, lower density, and more straightforward composition.",
  },
  {
    value: "balanced",
    label: "Balanced",
    description: "Moderate structure with enough layering and section variety for most projects.",
  },
  {
    value: "complex",
    label: "Complex",
    description:
      "Richer composition with denser grids, more section interplay, and advanced layout choreography.",
  },
] as const

export type LayoutComplexity = (typeof LAYOUT_COMPLEXITIES)[number]["value"]

export const DEFAULT_LAYOUT_COMPLEXITY: LayoutComplexity = "balanced"

export const LAYOUT_COMPLEXITY_SET = new Set<LayoutComplexity>(
  LAYOUT_COMPLEXITIES.map((level) => level.value)
)
