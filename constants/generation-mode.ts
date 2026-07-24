export const GENERATION_MODES = [
  {
    value: "landing",
    label: "Landing",
    description: "Marketing pages with strong storytelling and conversion flow.",
  },
  {
    value: "dashboard",
    label: "Dashboard",
    description: "Data-heavy product UIs with charts, navigation, and workspace panels.",
  },
  {
    value: "auth",
    label: "Auth",
    description: "Login, signup, onboarding, and account access flows.",
  },
  {
    value: "docs",
    label: "Docs",
    description: "Documentation hubs with navigation, content rails, and code examples.",
  },
  {
    value: "ecommerce",
    label: "Ecommerce",
    description: "Storefronts, catalog layouts, PDPs, and commerce-first surfaces.",
  },
  {
    value: "mobile-app",
    label: "Mobile App",
    description:
      "Native-style mobile app screens, flows, and component systems for handheld products.",
  },
] as const

export type GenerationMode = (typeof GENERATION_MODES)[number]["value"]

export const DEFAULT_GENERATION_MODE: GenerationMode = "landing"

export const GENERATION_MODE_SET = new Set<GenerationMode>(
  GENERATION_MODES.map((mode) => mode.value)
)
