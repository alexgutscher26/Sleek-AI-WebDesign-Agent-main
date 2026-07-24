export const MODEL_PROVIDERS = [
  {
    value: "auto",
    label: "Auto",
    description: "Best default. Balances quality, cost, and reliability across providers.",
    latencyHint: "Adaptive latency",
    costHint: "Balanced cost",
  },
  {
    value: "gemini",
    label: "Gemini",
    description: "Usually the fastest and most cost-efficient option for larger generation runs.",
    latencyHint: "Lower latency",
    costHint: "Lower cost",
  },
  {
    value: "claude",
    label: "Claude",
    description:
      "Usually slower and pricier, but strong for careful reasoning and structured edits.",
    latencyHint: "Higher latency",
    costHint: "Higher cost",
  },
  {
    value: "ollama",
    label: "Ollama (Local)",
    description: "Runs locally using Ollama (http://localhost:11434). No cloud API keys required.",
    latencyHint: "Local hardware",
    costHint: "Free (Local)",
  },
] as const

export type ModelProvider = (typeof MODEL_PROVIDERS)[number]["value"]

export const DEFAULT_MODEL_PROVIDER: ModelProvider = "auto"

export const MODEL_PROVIDER_SET = new Set<ModelProvider>(
  MODEL_PROVIDERS.map((provider) => provider.value)
)
