import { ChatStatus } from "ai";
import { motion } from "motion/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowUpRight, Layers3 } from "lucide-react";
import { PromptInputMessage } from "../ai-elements/prompt-input";
import { Suggestion, Suggestions } from "../ai-elements/suggestion";
import ChatInput from "./chat-input";
import { EmptyState, ErrorState } from "../ui/view-state";
import type { ContentDepth } from "@/constants/content-depth";
import type { CreativityLevel } from "@/constants/creativity-level";
import type { GenerationPlatform } from "@/constants/generation-platform";
import type { GenerationMode } from "@/constants/generation-mode";
import type { LayoutComplexity } from "@/constants/layout-complexity";
import type { ModelProvider } from "@/constants/model-provider";
import type { StyleIntensity } from "@/constants/style-intensity";

type PropsType = {
  input: string;
  contentDepth: ContentDepth;
  creativityLevel: CreativityLevel;
  generationPlatform: GenerationPlatform;
  generationMode: GenerationMode;
  layoutComplexity: LayoutComplexity;
  modelProvider: ModelProvider;
  styleIntensity: StyleIntensity;
  isLoading: boolean;
  status: ChatStatus;
  setContentDepth: (depth: ContentDepth) => void;
  setCreativityLevel: (level: CreativityLevel) => void;
  setGenerationPlatform: (platform: GenerationPlatform) => void;
  setGenerationMode: (mode: GenerationMode) => void;
  setLayoutComplexity: (complexity: LayoutComplexity) => void;
  setModelProvider: (provider: ModelProvider) => void;
  setStyleIntensity: (intensity: StyleIntensity) => void;
  setInput: (input: string) => void;
  onStop: () => void;
  onSubmit: (message: PromptInputMessage, options?: Record<string, unknown>) => void;
};

const suggestions = [
  {
    label: "Modern HR SaaS Landing Page",
    value:
      "A clean, high-conversion B2B SaaS landing page for an HR and Payroll platform. The color palette features a vibrant royal blue primary color, bright yellow accent for CTA buttons, and alternating solid blue and ultra-light gray background sections. The hero section must have a solid blue background with a faint grid mesh, centered bold typography, and a massive overlapping 'bento-style' composition of floating white UI dashboard cards showing mock payroll data and SVG charts. Include a 3-column bento grid for features with mini UI elements, a 2-column section with a stylized SVG globe, a horizontal timeline-based pricing section on a blue background, a 3-column testimonials grid, and a massive bright yellow rounded CTA banner nested just above a clean footer.",
  },
  {
    label: "AI SaaS Landing Page",
    value:
      "A cutting-edge landing page for an autonomous AI workflow platform. Deep space dark mode with vibrant indigo radial light-leaks, floating glassmorphic navbar, hero with glowing gradient text, bento grid showcasing features, and sleek pricing section.",
  },
  {
    label: "B2B SaaS Landing",
    value:
      "A serious B2B SaaS marketing site with structured hero, client logos strip (Vercel, Linear, Notion, Stripe), feature sections with diagrams, data visualization preview, pricing tiers, FAQ accordion, and enterprise call-to-action. Clear hierarchy and strong spacing rhythm.",
  },
  {
    label: "Sales Landing",
    value:
      "A high-contrast, modern B2B SaaS Sales landing page. The theme uses a crisp white background, deep navy/purple-black for inverted containers, and a vibrant Lime Green primary accent. The Hero features a bold H1 with an inline circular icon, next to a floating composition of white and lime-green UI dashboard cards with SVG bar charts. Below the hero is a massive, dark navy rounded-3xl container housing a 2x2 features grid with pill-shaped badges. Follow this with a complex 3-row white bento grid showcasing UI mockups (SVG maps, bar charts, and an overlapping dark stat card). Include a 'How it Works' section with a vertical numbered timeline alongside overlapping login UI mockups. Finish with a dark navy 3-column pricing container and a bright lime-green rounded CTA banner just above a clean, light footer.",
  },
  {
    label: "FinTech Landing",
    value:
      "A Dribbble-quality landing page for a modern global payments app. The theme alternates between a deep, dark forest/emerald green and pristine white. The primary accent color is a vibrant neon Emerald Green. The Hero section is dark mode with an emerald radial light-leak, featuring a centered massive H1, a floating UI card representing a mobile banking interface, and smaller glassmorphic pill badges floating around it (e.g., 'Total Balance'). Follow this with a pristine white section containing a muted partner logo cloud, a 6-card bento grid for features with green icons, and two 2-column split sections matching text/checklists against large floating white UI cards. Include a dark-mode pricing section with 3 glassmorphic cards and emerald accents, a white testimonials grid, and a massive dark-green rounded CTA card with an inner radial glow placed just above a sleek, dark-mode footer.",
  },
  {
    label: "Crypto Exchange",
    value:
      "A futuristic trading interface for a crypto exchange called 'Apex'. Deep midnight background with electric blue glows. Central trading chart with candlesticks, left order book panel, right trade history, top navbar with BTC $67,432 ETH $3,241 live prices, and glowing buy/sell buttons.",
  },
  {
    label: "Payment Platform",
    value:
      "A high-conversion landing page for a payment link product. Strong hero with 'Accept Payments Instantly' headline, live payment preview mockup on the right, trust badges, feature grid explaining no-code checkout, use-case sections (Creators, SaaS, Freelancers), pricing comparison, and a bold CTA. Clean fintech-grade design.",
  },
  {
    label: "Neobank Website",
    value:
      "A modern neobank marketing website. Confident hero with app preview, trust metrics row showing '2M+ users', '$4.2B processed', debit card showcase section, feature breakdown grid, comparison table vs traditional banks, testimonials, and strong sign-up CTA.",
  },
];

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
  const featuredSuggestions = suggestions.slice(0, 4);
  const supportingSuggestions = suggestions.slice(4);

  const handleSuggestionClick = (value: string) => {
    setInput(value);
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="hero-grid pointer-events-none absolute inset-0 opacity-50" />
      <div className="ambient-orb absolute left-[8%] top-28 size-44 rounded-full bg-chart-4/15" />
      <div className="ambient-orb absolute right-[8%] top-40 size-56 rounded-full bg-chart-2/15 [animation-delay:1.5s]" />
      <div className="ambient-orb absolute bottom-24 left-1/2 size-64 -translate-x-1/2 rounded-full bg-primary/10 [animation-delay:3s]" />

      <div className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 pb-14 pt-28 sm:px-6 lg:px-8">
        <section className="mx-auto flex w-full max-w-4xl flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="relative w-full"
          >
            <div className="glass-panel relative overflow-hidden rounded-[2rem] border border-border/70 p-4 shadow-[0_30px_100px_-48px_rgba(0,0,0,0.9)] sm:p-5">
              <div className="absolute inset-x-6 top-0 h-px bg-linear-to-r from-transparent via-primary/40 to-transparent" />
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">
                    Start a new direction
                  </p>
                  <p className="mt-1 text-sm text-foreground">
                    Shape the brief, then generate a multi-page concept.
                  </p>
                </div>
                <div className="flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1.5 text-xs text-muted-foreground">
                  <Layers3 className="size-3.5 text-primary" />
                  Prompt + controls + history
                </div>
              </div>

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
        </section>

        <section className="mt-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.28 }}
            className="flex items-end justify-between gap-4"
          >
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
                Launch points
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
                Start from a strong visual angle
              </h2>
            </div>
            <div className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
              Tap a direction to preload the prompt
              <ArrowUpRight className="size-4" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.32 }}
            className="mt-6 grid gap-4 lg:grid-cols-4"
          >
            {featuredSuggestions.map((item, index) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleSuggestionClick(item.value)}
                className="group glass-panel rounded-[1.8rem] border border-border/60 p-5 text-left shadow-[0_24px_80px_-46px_rgba(0,0,0,0.72)] transition duration-300 hover:-translate-y-1 hover:border-primary/35"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="rounded-full border border-border/70 bg-background/70 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                    0{index + 1}
                  </span>
                  <ArrowUpRight className="size-4 text-muted-foreground transition group-hover:text-primary" />
                </div>
                <h3 className="mt-8 text-lg font-medium tracking-[-0.03em] text-foreground">
                  {item.label}
                </h3>
                <p className="mt-3 line-clamp-4 text-sm leading-6 text-muted-foreground">
                  {item.value}
                </p>
              </button>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.36 }}
            className="mt-6"
          >
            <Suggestions className="justify-start gap-3">
              {supportingSuggestions.map((item) => (
                <Suggestion
                  key={item.label}
                  className="border-border/60 bg-background/75 font-normal shadow-none"
                  suggestion={item.value}
                  onClick={() => handleSuggestionClick(item.value)}
                >
                  {item.label}
                </Suggestion>
              ))}
            </Suggestions>
          </motion.div>
        </section>

        <motion.section
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.44 }}
          className="mt-16"
        >
          <ProjectGrid />
        </motion.section>
      </div>
    </div>
  );
};

const ProjectGrid = () => {
  const { data: projects, isLoading, isError, refetch } = useQuery({
    queryKey: ["projects"],
    queryFn: async () => {
      const res = await fetch("/api/project");
      if (!res.ok) {
        const payload = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;

        throw new Error(payload?.error?.message || "Failed to load recent projects.");
      }

      const payload = (await res.json()) as {
        success: true;
        data: {
          id: string;
          title: string;
          slugId: string;
          createdAt: string;
        }[];
      };
      return payload.data;
    },
  });

  if (isLoading) return <ProjectGridSkeleton />;
  if (isError) {
    return (
      <div className="glass-panel rounded-[2rem] border border-border/60 p-6 shadow-[0_24px_80px_-46px_rgba(0,0,0,0.72)]">
        <ErrorState
          title="Recent projects are unavailable"
          description="We couldn't load your project history right now."
          actionLabel="Try again"
          onAction={() => refetch()}
        />
      </div>
    );
  }

  if (!projects || projects.length === 0) {
    return (
      <div className="glass-panel rounded-[2rem] border border-border/60 p-6 shadow-[0_24px_80px_-46px_rgba(0,0,0,0.72)]">
        <EmptyState
          title="No projects yet"
          description="Your generated sites will appear here after you create your first project."
        />
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-[2rem] border border-border/60 p-5 shadow-[0_24px_80px_-46px_rgba(0,0,0,0.72)] sm:p-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
            Workspace memory
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-foreground">
            Recent Projects
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Reopen a concept and keep refining from where you left off.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {projects.map((project, index) => (
          <Link
            key={project.id}
            href={`/project/${project.slugId}`}
            className="group overflow-hidden rounded-[1.6rem] border border-border/60 bg-background/75 transition duration-300 hover:-translate-y-1 hover:border-primary/35"
          >
            <div className="relative aspect-[4/3] overflow-hidden border-b border-border/60">
              <div className="absolute inset-0 bg-linear-to-br from-primary/16 via-transparent to-chart-2/14" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.16),transparent_32%)]" />
              <div className="absolute inset-6 flex flex-col justify-between">
                <span className="w-fit rounded-full border border-border/70 bg-background/75 px-3 py-1 text-[11px] uppercase tracking-[0.24em] text-muted-foreground">
                  Concept 0{(index % 9) + 1}
                </span>
                <div className="flex items-end justify-between gap-3">
                  <span className="text-5xl font-semibold tracking-[-0.08em] text-foreground/85">
                    {project.title.charAt(0)}
                  </span>
                  <ArrowUpRight className="size-5 text-muted-foreground transition group-hover:text-primary" />
                </div>
              </div>
            </div>
            <div className="space-y-2 p-4">
              <h3 className="truncate text-base font-medium tracking-[-0.03em] text-foreground">
                {project.title}
              </h3>
              <p className="text-sm text-muted-foreground">
                Open the canvas, inspect pages, and continue prompting.
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

const ProjectGridSkeleton = () => (
  <div className="glass-panel animate-pulse rounded-[2rem] border border-border/60 p-6 shadow-[0_24px_80px_-46px_rgba(0,0,0,0.72)]">
    <div className="h-3 w-32 rounded bg-muted" />
    <div className="mt-3 h-8 w-56 rounded bg-muted" />
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="overflow-hidden rounded-[1.6rem] border border-border/60">
          <div className="aspect-[4/3] bg-muted" />
          <div className="space-y-3 p-4">
            <div className="h-5 w-32 rounded bg-muted" />
            <div className="h-4 w-full rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  </div>
);

export default NewProjectChat;
