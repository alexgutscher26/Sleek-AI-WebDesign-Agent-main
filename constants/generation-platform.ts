export const GENERATION_PLATFORMS = [
  {
    value: "both",
    label: "iOS + Android",
    description:
      "Design a shared mobile app experience that translates cleanly across both platforms.",
  },
  {
    value: "ios",
    label: "iOS",
    description: "Prioritize iPhone-native patterns, spacing, and interaction conventions.",
  },
  {
    value: "android",
    label: "Android",
    description: "Prioritize Material-style structure, navigation, and Android UI cues.",
  },
] as const

export type GenerationPlatform = (typeof GENERATION_PLATFORMS)[number]["value"]

export const DEFAULT_GENERATION_PLATFORM: GenerationPlatform = "both"

export const GENERATION_PLATFORM_SET = new Set<GenerationPlatform>(
  GENERATION_PLATFORMS.map((platform) => platform.value)
)
