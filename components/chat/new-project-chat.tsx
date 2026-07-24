import Link from "next/link"
import type { ContentDepth } from "@/constants/content-depth"
import type { CreativityLevel } from "@/constants/creativity-level"
import type { GenerationMode } from "@/constants/generation-mode"
import type { GenerationPlatform } from "@/constants/generation-platform"
import type { LayoutComplexity } from "@/constants/layout-complexity"
import type { ModelProvider } from "@/constants/model-provider"
import type { StyleIntensity } from "@/constants/style-intensity"
import { useQuery } from "@tanstack/react-query"
import { ChatStatus } from "ai"
import { ArrowUpRight, Layers3, Sparkles } from "lucide-react"
import { motion } from "motion/react"
import { PromptInputMessage } from "../ai-elements/prompt-input"
import { EmptyState, ErrorState } from "../ui/view-state"
import ChatInput from "./chat-input"

type PropsType = {
  input: string
  contentDepth: ContentDepth
  creativityLevel: CreativityLevel
  generationPlatform: GenerationPlatform
  generationMode: GenerationMode
  layoutComplexity: LayoutComplexity
  modelProvider: ModelProvider
  styleIntensity: StyleIntensity
  isLoading: boolean
  status: ChatStatus
  setContentDepth: (depth: ContentDepth) => void
  setCreativityLevel: (level: CreativityLevel) => void
  setGenerationPlatform: (platform: GenerationPlatform) => void
  setGenerationMode: (mode: GenerationMode) => void
  setLayoutComplexity: (complexity: LayoutComplexity) => void
  setModelProvider: (provider: ModelProvider) => void
  setStyleIntensity: (intensity: StyleIntensity) => void
  setInput: (input: string) => void
  onStop: () => void
  onSubmit: (message: PromptInputMessage, options?: Record<string, unknown>) => void
}

const promptSuggestions = [
  {
    label: "Finance app",
    value:
      "Design a premium finance mobile app with a calm black interface, strong hierarchy, soft charts, and elegant account overview cards.",
  },
  {
    label: "Health app",
    value:
      "Create a modern health tracking app with refined onboarding, clean progress modules, and polished habit dashboards.",
  },
  {
    label: "Productivity app",
    value:
      "Design a focused productivity app with minimal navigation, structured task views, and a sleek dark mobile UI.",
  },
]

const showcaseCards = [
  {
    title: "Calm Sleep",
    category: "Health & Fitness",
    tone: "soft",
  },
  {
    title: "Subscription Saver",
    category: "Finance",
    tone: "contrast",
  },
  {
    title: "Focus Flow",
    category: "Productivity",
    tone: "minimal",
  },
] as const

const NewProjectChat = ({
  input,
  contentDepth,
  creativityLevel,
  generationPlatform,
  generationMode,
  layoutComplexity,
  modelProvider,
  styleIntensity,
  isLoading,
  status,
  setContentDepth,
  setCreativityLevel,
  setGenerationPlatform,
  setGenerationMode,
  setLayoutComplexity,
  setModelProvider,
  setStyleIntensity,
  setInput,
  onStop,
  onSubmit,
}: PropsType) => {
  const handleSuggestionClick = (value: string) => {
    setInput(value)
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#020202] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_22%),linear-gradient(180deg,#111111_0%,#070707_24%,#010101_100%)]" />
      <div className="pointer-events-none absolute inset-x-[-12%] top-36 h-52 rounded-[100%] border-t border-white/12 blur-md" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 pt-28 pb-16 sm:px-6 lg:px-8">
        <section className="mx-auto w-full max-w-4xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05, duration: 0.4 }}
            className="mx-auto inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/4 px-4 py-2 text-[11px] tracking-[0.22em] text-white/68 uppercase backdrop-blur"
          >
            <Sparkles className="size-3.5 text-white" />
            Design faster with Sleek
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.4 }}
            className="mx-auto mt-8 max-w-3xl text-5xl leading-[1.02] font-semibold tracking-[-0.08em] text-white sm:text-6xl"
          >
            A quieter way to create polished app concepts
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.18, duration: 0.4 }}
            className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-white/62 sm:text-base"
          >
            Start with a prompt, shape the direction, and move straight into a clean canvas for
            refinement.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.24, duration: 0.45 }}
            className="mx-auto mt-10 rounded-[1.75rem] border border-white/10 bg-[#111111]/95 p-3 shadow-[0_40px_120px_-60px_rgba(0,0,0,0.9)]"
          >
            <div className="sleek-chat-shell">
              <ChatInput
                input={input}
                contentDepth={contentDepth}
                creativityLevel={creativityLevel}
                generationPlatform={generationPlatform}
                generationMode={generationMode}
                layoutComplexity={layoutComplexity}
                modelProvider={modelProvider}
                styleIntensity={styleIntensity}
                isLoading={isLoading}
                status={status}
                controlsPosition="below"
                setContentDepth={setContentDepth}
                setCreativityLevel={setCreativityLevel}
                setGenerationPlatform={setGenerationPlatform}
                setGenerationMode={setGenerationMode}
                setLayoutComplexity={setLayoutComplexity}
                setModelProvider={setModelProvider}
                setStyleIntensity={setStyleIntensity}
                setInput={setInput}
                onClearSelectedPage={() => undefined}
                onStop={onStop}
                onSubmit={onSubmit}
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="mx-auto mt-6 flex flex-wrap justify-center gap-3"
          >
            {promptSuggestions.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSuggestionClick(item.value)}
                className="rounded-full border border-white/10 bg-white/4 px-4 py-2 text-sm text-white/70 transition hover:border-white/18 hover:bg-white/7 hover:text-white"
              >
                {item.label}
              </button>
            ))}
          </motion.div>
        </section>

        <section className="mt-24">
          <div className="mb-8 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs tracking-[0.2em] text-white/45 uppercase">
                Selected directions
              </p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
                Clean, focused starting points
              </h2>
            </div>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {showcaseCards.map((item) => (
              <ShowcaseCard
                key={item.title}
                title={item.title}
                category={item.category}
                tone={item.tone}
              />
            ))}
          </div>
        </section>

        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.36, duration: 0.4 }}
          className="mt-24"
        >
          <ProjectGrid />
        </motion.section>
      </div>
    </div>
  )
}

const ShowcaseCard = ({
  title,
  category,
  tone,
}: {
  title: string
  category: string
  tone: "soft" | "contrast" | "minimal"
}) => {
  const tones = {
    soft: "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),transparent_38%),linear-gradient(180deg,#1a1a1a_0%,#080808_100%)]",
    contrast:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),transparent_34%),linear-gradient(180deg,#121212_0%,#030303_100%)]",
    minimal:
      "bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),transparent_34%),linear-gradient(180deg,#171717_0%,#050505_100%)]",
  }[tone]

  return (
    <div className="group">
      <div className="rounded-[1.6rem] border border-white/8 bg-[#0d0d0d] p-3 transition duration-300 group-hover:-translate-y-1 group-hover:border-white/18">
        <div
          className={`relative aspect-[4/5] overflow-hidden rounded-[1.25rem] border border-white/8 ${tones}`}
        >
          <div className="absolute inset-0 p-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] tracking-[0.2em] text-white/55 uppercase">
                {category}
              </span>
              <ArrowUpRight className="size-4 text-white/35" />
            </div>

            <div className="absolute inset-x-5 top-18 bottom-5 flex flex-col justify-between">
              <div>
                <p className="text-2xl font-semibold tracking-[-0.05em] text-white">{title}</p>
                <p className="mt-2 max-w-48 text-sm leading-6 text-white/55">
                  Calm hierarchy, deliberate spacing, and premium dark surfaces.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[1rem] bg-white/6 p-3">
                  <div className="h-2 w-12 rounded-full bg-white/18" />
                  <div className="mt-3 h-18 rounded-[0.9rem] bg-white/8" />
                </div>
                <div className="rounded-[1rem] bg-white/6 p-3">
                  <div className="h-2 w-16 rounded-full bg-white/18" />
                  <div className="mt-3 h-18 rounded-[0.9rem] bg-white/8" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="px-1 pt-3">
        <p className="text-lg font-medium tracking-[-0.03em] text-white">{title}</p>
        <p className="text-sm text-white/52">{category}</p>
      </div>
    </div>
  )
}

const ProjectGrid = () => {
  const {
    data: projects,
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/project")
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: { message?: string }
        } | null

        throw new Error(payload?.error?.message || "Failed to load recent projects.")
      }

      const payload = (await res.json()) as {
        success: true
        data: {
          id: string
          title: string
          slugId: string
          createdAt: string
        }[]
      }
      return payload.data
    },
  })

  if (isLoading) return <ProjectGridSkeleton />
  if (isError) {
    return (
      <div className="rounded-[1.8rem] border border-white/8 bg-[#0b0b0b] p-6">
        <ErrorState
          title="Recent projects are unavailable"
          description="We couldn't load your project history right now."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </div>
    )
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="rounded-[1.8rem] border border-white/8 bg-[#0b0b0b] p-6">
        <EmptyState
          title="No projects yet"
          description="Your generated sites will appear here after you create your first project."
        />
      </div>
    )
  }

  return (
    <div className="rounded-[2rem] border border-white/8 bg-[#060606] p-5 sm:p-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-white/45 uppercase">Recent projects</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.05em] text-white">
            Continue where you left off
          </h2>
        </div>
        <p className="max-w-md text-sm leading-6 text-white/55">
          Reopen a concept, inspect the canvas, and keep refining without starting over.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {projects.map((project, index) => (
          <Link
            key={project.id}
            href={`/project/${project.slugId}`}
            className="group overflow-hidden rounded-[1.4rem] border border-white/8 bg-[#0d0d0d] transition duration-300 hover:-translate-y-1 hover:border-white/18"
          >
            <div className="relative aspect-[4/3] overflow-hidden border-b border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.12),transparent_38%),linear-gradient(180deg,#171717_0%,#070707_100%)]">
              <div className="absolute inset-5 flex flex-col justify-between">
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] tracking-[0.2em] text-white/55 uppercase">
                    Concept 0{(index % 9) + 1}
                  </span>
                  <Layers3 className="size-4 text-white/75" />
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] tracking-[0.2em] text-white/45 uppercase">
                      {new Date(project.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <span className="mt-3 block text-5xl font-semibold tracking-[-0.08em] text-white/90">
                      {project.title.charAt(0)}
                    </span>
                  </div>
                  <ArrowUpRight className="size-5 text-white/40 transition group-hover:text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-2 p-4">
              <h3 className="truncate text-base font-medium tracking-[-0.03em] text-white">
                {project.title}
              </h3>
              <p className="text-sm leading-6 text-white/55">
                Open the conversation and keep refining the direction.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

const ProjectGridSkeleton = () => (
  <div className="rounded-[2rem] border border-white/8 bg-[#060606] p-6">
    <div className="h-3 w-32 rounded bg-white/8" />
    <div className="mt-3 h-8 w-56 rounded bg-white/8" />
    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="overflow-hidden rounded-[1.4rem] border border-white/8">
          <div className="aspect-[4/3] bg-white/6" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-32 rounded bg-white/8" />
            <div className="h-4 w-full rounded bg-white/8" />
          </div>
        </div>
      ))}
    </div>
  </div>
)

export default NewProjectChat
