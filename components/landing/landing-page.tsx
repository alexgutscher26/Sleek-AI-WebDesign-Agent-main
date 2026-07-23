/* eslint-disable react/no-unescaped-entities */
"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Sparkles, Play, Plus, Minus, Twitter, Linkedin, Github, ArrowRight, Zap, Palette, Clock, ArrowUp, RefreshCw } from "lucide-react";
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton, useAuth, SignUpButton as SignUpTrigger } from "@clerk/nextjs";

// ── Control option definitions ────────────────────────────────────────────────
const CONTENT_DEPTH_OPTS = [
  { value: "wireframe",      label: "Wireframe",      statsVal: "Wireframe",  statsSub: "Layout",   bars: [100, 38, 68] },
  { value: "realistic-copy",label: "Realistic Copy", statsVal: "Realistic",  statsSub: "Copy",     bars: [38, 100, 68] },
  { value: "complete",       label: "Complete",       statsVal: "Complete",   statsSub: "Fidelity", bars: [38, 68, 100] },
] as const;

const MODEL_OPTS = [
  { value: "auto",   label: "Auto",   statsVal: "Auto",   statsSub: "Provider", bars: [100, 78, 56] },
  { value: "gemini", label: "Gemini", statsVal: "Gemini", statsSub: "Provider", bars: [78, 100, 56] },
  { value: "claude", label: "Claude", statsVal: "Claude", statsSub: "Provider", bars: [56, 78, 100] },
] as const;

const CREATIVITY_OPTS = [
  { value: "strict",      label: "Strict",      v: 48,  accent: "#22c55e" },
  { value: "balanced",    label: "Balanced",    v: 100, accent: "#22c55e" },
  { value: "exploratory", label: "Exploratory", v: 80,  accent: "#22c55e" },
] as const;

const GEN_MODE_OPTS = [
  { value: "landing",    label: "Landing" },
  { value: "dashboard",  label: "Dashboard" },
  { value: "auth",       label: "Auth" },
  { value: "docs",       label: "Docs" },
  { value: "ecommerce",  label: "Ecommerce" },
  { value: "mobile-app", label: "Mobile" },
] as const;

const PLATFORM_OPTS = [
  { value: "both",    label: "iOS + Android", statsVal: "iOS +",   statsSub: "Android",  bars: [100, 80, 65] },
  { value: "ios",     label: "iOS",           statsVal: "iOS",     statsSub: "Platform", bars: [80, 100, 65] },
  { value: "android", label: "Android",       statsVal: "Android", statsSub: "Platform", bars: [65, 80, 100] },
] as const;

const STYLE_OPTS = [
  { value: "minimal",  label: "Minimal",  bars: [20,35,25,40,30] },
  { value: "balanced", label: "Balanced", bars: [45,75,55,85,65] },
  { value: "bold",     label: "Bold",     bars: [70,95,80,100,85] },
] as const;

const FAQ_ITEMS = [
  { q: "What is Sleek and how does it work?", a: "Sleek is an AI-powered UI generation workspace. You describe a landing page, dashboard, or mobile screen in plain language, and Sleek generates production-ready HTML screens on an interactive canvas. Projects, messages, and generated pages are all persisted so you can keep iterating." },
  { q: "Do I need design or coding experience?", a: "None at all. Sleek is built for founders, product managers, and developers who want professional UI without touching Figma or writing CSS. Just describe what you want in the chat and let the AI do the rest." },
  { q: "What kinds of UIs can Sleek generate?", a: "Sleek handles web landing pages, SaaS dashboards, mobile app screens, auth flows, e-commerce pages, onboarding sequences, and more. You can attach reference images to guide the style and content of each generation." },
  { q: "Can I edit the generated designs?", a: "Yes. After generation you can describe changes in the chat — things like change the hero background to dark or add a pricing section below the features — and Sleek will regenerate or patch the affected pages automatically." },
  { q: "How do I get my designs out of Sleek?", a: "Every generated page is clean, sanitized HTML you can copy or export at any time. Export as a standalone file, copy the code, or integrate it directly into your codebase." },
  { q: "Is my project data secure?", a: "Yes. All projects and generated pages are stored in your own account on an encrypted Postgres database. We never use your designs to train AI models, and you retain full ownership of everything you create." },
];

const FEATURES = [
  { icon: Zap, title: "Chat-Driven Generation", desc: "Describe any UI in plain English — landing pages, dashboards, mobile screens — and Sleek streams fully-rendered, multi-page designs straight to an interactive canvas." },
  { icon: Palette, title: "Reference-Image Input", desc: "Attach screenshots or inspiration images alongside your prompt. Sleek analyzes the visual style and replicates the layout, color palette, and component structure accurately." },
  { icon: Clock, title: "Iterative Edits in Chat", desc: "Refine anything by just describing the change. Say make the nav sticky or swap the hero to a dark gradient and the affected page updates instantly, no manual editing needed." },
];

// ── MiniAppCard ──────────────────────────────────────────────────────────────
type MiniCardDef = {
  id: number;
  label: string;
  bg: string;
  accent: string;
  stats: { val: string; sub: string }[];
  bars: number[];
  onClick?: () => void;
};

function MiniAppCard({ card }: { card: MiniCardDef }) {
  return (
    <button
      onClick={card.onClick}
      className={`relative rounded-2xl bg-gradient-to-br ${card.bg} border border-white/8 overflow-hidden p-4 flex flex-col gap-3 group hover:border-white/20 transition-all duration-300 hover:-translate-y-1 w-full text-left ${
        card.onClick ? "cursor-pointer" : "cursor-default"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">{card.label}</span>
        <div className="flex items-center gap-1">
          {card.onClick && <RefreshCw className="w-2.5 h-2.5 text-white/20 group-hover:text-white/40 transition-colors" />}
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: card.accent }} />
        </div>
      </div>
      <div className="flex gap-3">
        {card.stats.map((s, i) => (
          <div key={i} className="flex flex-col">
            <span className="text-lg font-bold text-white leading-tight">{s.val}</span>
            <span className="text-[10px] text-white/40">{s.sub}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1 h-8">
        {card.bars.map((h, i) => (
          <div key={i} className="flex-1 rounded-t-sm opacity-70 group-hover:opacity-100 transition-opacity" style={{ height: `${h}%`, backgroundColor: card.accent }} />
        ))}
      </div>
    </button>
  );
}

function FAQItem({ item }: { item: typeof FAQ_ITEMS[0] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`border border-white/8 rounded-xl overflow-hidden transition-all duration-300 ${open ? "bg-white/4" : "bg-white/2 hover:bg-white/3"}`}>
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-6 py-4 text-left group">
        <span className="text-sm font-medium text-white/80 group-hover:text-white transition-colors">{item.q}</span>
        <div className="ml-4 shrink-0 text-white/40 group-hover:text-white/70 transition-colors">
          {open ? <Minus className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
        </div>
      </button>
      {open && (
        <div className="px-6 pb-5">
          <p className="text-sm text-white/50 leading-relaxed">{item.a}</p>
        </div>
      )}
    </div>
  );
}

function KudosWallWidget() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    containerRef.current.innerHTML = "";

    const script = document.createElement("script");
    script.src = "https://kudoswall.org/widget.js";
    script.setAttribute("data-id", "339b232f-0807-4f03-a0b2-14df76513e8e");
    script.setAttribute("data-theme", "dark");
    script.setAttribute("data-mode", "dark");
    script.async = true;

    containerRef.current.appendChild(script);
  }, []);

  return (
    <div className="w-full">
      <style>{`
        [data-kudoswall-id] iframe,
        [data-kudoswall-id] > div,
        iframe[src*="kudoswall"] {
          filter: invert(1) hue-rotate(180deg) !important;
          border-radius: 1rem !important;
          background-color: transparent !important;
          max-width: 100% !important;
        }
        [data-kudoswall-id] img,
        [data-kudoswall-id] svg {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `}</style>
      <div
        ref={containerRef}
        data-kudoswall-id="339b232f-0807-4f03-a0b2-14df76513e8e"
        data-theme="dark"
        data-mode="dark"
        className="w-full min-h-[200px]"
      />
    </div>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { isSignedIn } = useAuth();
  const signUpRef = useRef<HTMLButtonElement>(null);

  // Hero input state
  const [heroPrompt, setHeroPrompt] = useState("");

  // Generation control state
  const [contentDepth, setContentDepth] = useState("realistic-copy");
  const [modelProvider, setModelProvider] = useState("auto");
  const [creativityLevel, setCreativityLevel] = useState("balanced");
  const [generationMode, setGenerationMode] = useState("landing");
  const [generationPlatform, setGenerationPlatform] = useState("both");
  const [styleIntensity, setStyleIntensity] = useState("balanced");

  // Cycle helpers for mini-cards without expanded panels
  const cycle = <T extends string>(opts: readonly { value: T }[], cur: T, set: (v: T) => void) => {
    const idx = opts.findIndex(o => o.value === cur);
    set(opts[(idx + 1) % opts.length].value);
  };

  const handleGenerate = () => {
    if (!heroPrompt.trim()) return;
    const seed = { prompt: heroPrompt, contentDepth, modelProvider, creativityLevel, generationMode, generationPlatform, styleIntensity };
    try { localStorage.setItem("sleek_landing_seed", JSON.stringify(seed)); } catch {}
    if (isSignedIn) {
      router.push("/project");
    } else {
      signUpRef.current?.click();
    }
  };

  // Build mini card configs from current state
  const cdOpt = CONTENT_DEPTH_OPTS.find(o => o.value === contentDepth)!;
  const mdOpt = MODEL_OPTS.find(o => o.value === modelProvider)!;
  const pfOpt = PLATFORM_OPTS.find(o => o.value === generationPlatform)!;
  const crOpt = CREATIVITY_OPTS.find(o => o.value === creativityLevel)!;
  const gmOpt = GEN_MODE_OPTS.find(o => o.value === generationMode)!;
  const stOpt = STYLE_OPTS.find(o => o.value === styleIntensity)!;

  const miniCards: MiniCardDef[] = [
    { id: 1, label: "Content Depth", bg: "from-[#1a1030] to-[#0d0820]", accent: "#7c3aed",
      stats: [{ val: cdOpt.statsVal, sub: cdOpt.statsSub }, { val: "3", sub: "Options" }],
      bars: [...cdOpt.bars], onClick: () => cycle(CONTENT_DEPTH_OPTS, contentDepth as "wireframe"|"realistic-copy"|"complete", setContentDepth) },
    { id: 2, label: "Model",         bg: "from-[#102030] to-[#0a1520]", accent: "#0ea5e9",
      stats: [{ val: mdOpt.statsVal, sub: mdOpt.statsSub }, { val: "3", sub: "Models" }],
      bars: [...mdOpt.bars], onClick: () => cycle(MODEL_OPTS, modelProvider as "auto"|"gemini"|"claude", setModelProvider) },
    { id: 3, label: "Creativity",    bg: "from-[#0d2010] to-[#081208]", accent: "#22c55e",
      stats: [{ val: crOpt.label, sub: "Level" }, { val: "3", sub: "Levels" }],
      bars: creativityLevel === "strict" ? [100, 48, 80] : creativityLevel === "balanced" ? [48, 100, 80] : [48, 80, 100] },
    { id: 4, label: "Gen. Mode",     bg: "from-[#200d10] to-[#120508]", accent: "#f43f5e",
      stats: [{ val: gmOpt.label, sub: "Mode" }, { val: "6", sub: "Types" }],
      bars: [100, 70, 50, 60, 55, 80] },
    { id: 5, label: "Platform",      bg: "from-[#1a1000] to-[#0d0800]", accent: "#f97316",
      stats: [{ val: pfOpt.statsVal, sub: pfOpt.statsSub }, { val: "3", sub: "Targets" }],
      bars: [...pfOpt.bars], onClick: () => cycle(PLATFORM_OPTS, generationPlatform as "both"|"ios"|"android", setGenerationPlatform) },
    { id: 6, label: "Style",         bg: "from-[#0a1030] to-[#06091c]", accent: "#818cf8",
      stats: [{ val: stOpt.label, sub: "Intensity" }, { val: "3", sub: "Presets" }],
      bars: [...stOpt.bars] },
  ];

  const [email, setEmail] = useState("");

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white" style={{ fontFamily: "var(--font-geist-sans)" }}>
      {/* Ambient top glow */}
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full bg-orange-600/8 blur-[140px]" />
      </div>

      {/* NAVBAR */}
      <nav className="relative z-50 w-full border-b border-white/6 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
              <Sparkles className="w-4 h-4 text-white fill-white/30" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Sleek<span className="text-orange-500">.</span></span>
          </Link>
          <div className="hidden md:flex items-center gap-7 text-sm text-white/50">
            {["Features", "Templates", "Pricing", "Changelog", "Blog"].map((l) => (
              <Link key={l} href="#" className="hover:text-white transition-colors">{l}</Link>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton>
                <button className="text-sm text-white/60 hover:text-white transition-colors px-3 py-1.5">Login</button>
              </SignInButton>
              <SignUpButton>
                <button className="text-sm bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-lg font-medium transition-colors shadow-lg shadow-orange-500/25">Try free</button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
              <Link href="/project" className="text-sm bg-orange-500 hover:bg-orange-400 text-white px-4 py-1.5 rounded-lg font-medium transition-colors">Dashboard</Link>
            </SignedIn>
          </div>
        </div>
      </nav>

          {/* Hidden Clerk SignUp trigger for unauthenticated generate */}
          <SignUpButton>
            <button ref={signUpRef} className="sr-only" aria-hidden>sign-up-trigger</button>
          </SignUpButton>

        {/* HERO */}
        <section className="relative z-10 pt-24 pb-16 text-center px-6">
          <div className="inline-flex items-center gap-2 border border-orange-500/30 bg-orange-500/10 rounded-full px-4 py-1.5 text-xs text-orange-400 font-medium mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
            AI UI Generation Workspace — Now in Beta
          </div>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight leading-none mb-6 max-w-5xl mx-auto">
            Design web &amp; mobile UI{" "}
            <em className="text-orange-500 not-italic">in minutes ✦</em>
          </h1>
          <p className="text-base md:text-lg text-white/50 max-w-xl mx-auto mb-10 leading-relaxed">
            Describe any screen in plain language. Sleek generates production-ready landing pages, dashboards, and mobile UIs on an interactive canvas — no design tools required.
          </p>
          <div className="max-w-2xl mx-auto mb-8">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-orange-500/40 focus-within:bg-white/7 transition-all">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <input
                type="text"
                value={heroPrompt}
                onChange={e => setHeroPrompt(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleGenerate()}
                placeholder="Build a SaaS dashboard with a dark sidebar and revenue charts..."
                className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none"
              />
              <button
                onClick={handleGenerate}
                disabled={!heroPrompt.trim()}
                className="bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-xl transition-colors shadow-lg shadow-orange-500/30"
              >
                Generate
              </button>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 text-xs text-white/30">
            <div className="flex -space-x-2">
              {["#f97316","#818cf8","#22c55e","#f43f5e"].map((c,i)=>(
                <div key={i} className="w-6 h-6 rounded-full border-2 border-[#0a0a0a]" style={{ backgroundColor: c }} />
              ))}
            </div>
            <span>Trusted by 8,000+ founders, developers &amp; product teams</span>
            <span className="text-orange-400/70">★★★★★ 4.9</span>
          </div>
        </section>

      {/* GENERATION CONTROLS GRID */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-xs font-medium uppercase tracking-widest text-white/25 mb-6 text-center">Generation Controls</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
          {miniCards.map((c) => <MiniAppCard key={c.id} card={c} />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">

          {/* Creativity Level — interactive row selector */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0d2010] to-[#081208] border border-white/8 p-5 flex flex-col gap-4 hover:border-green-500/30 transition-all duration-300">
            <div className="text-[10px] uppercase tracking-widest text-white/30">Creativity Level</div>
            <div className="flex-1 flex flex-col justify-center gap-2">
              {CREATIVITY_OPTS.map((r) => {
                const active = creativityLevel === r.value;
                return (
                  <button key={r.value} onClick={() => setCreativityLevel(r.value)}
                    className="flex items-center gap-2 w-full rounded-lg px-2 py-1 transition-all hover:bg-white/4 text-left"
                  >
                    <div className="text-xs w-20 shrink-0 font-medium transition-colors" style={{ color: active ? "#22c55e" : "rgba(255,255,255,0.35)" }}>
                      {r.label}
                    </div>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${r.v}%`, backgroundColor: active ? "#22c55e" : "rgba(255,255,255,0.1)" }} />
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-green-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
              {CREATIVITY_OPTS.find(o => o.value === creativityLevel)?.label} selected
            </div>
          </div>

          {/* Generation Mode — interactive chip grid */}
          <div className="rounded-2xl bg-gradient-to-br from-[#200d10] to-[#120508] border border-white/8 p-5 flex flex-col justify-between hover:border-red-500/30 transition-all duration-300">
            <div className="text-[10px] uppercase tracking-widest text-white/30">Generation Mode</div>
            <div className="grid grid-cols-3 gap-1.5 py-3">
              {GEN_MODE_OPTS.map((m) => {
                const active = generationMode === m.value;
                return (
                  <button key={m.value} onClick={() => setGenerationMode(m.value)}
                    className="rounded-lg px-1.5 py-1 text-center text-[10px] font-medium transition-all hover:opacity-90"
                    style={{
                      background: active ? "rgba(244,63,94,0.25)" : "rgba(255,255,255,0.04)",
                      color:      active ? "#f43f5e"              : "rgba(255,255,255,0.35)",
                      border:     `1px solid ${active ? "rgba(244,63,94,0.4)" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    {m.label}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-red-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {GEN_MODE_OPTS.find(o => o.value === generationMode)?.label} selected
            </div>
          </div>

          {/* Style Intensity — interactive row selector */}
          <div className="rounded-2xl bg-gradient-to-br from-[#0a1030] to-[#06091c] border border-white/8 p-5 overflow-hidden relative hover:border-indigo-500/30 transition-all duration-300">
            <div className="text-[10px] uppercase tracking-widest text-white/30 mb-3">Style Intensity</div>
            <div className="flex flex-col gap-2 mt-1">
              {STYLE_OPTS.map((s) => {
                const active = styleIntensity === s.value;
                return (
                  <button key={s.value} onClick={() => setStyleIntensity(s.value)}
                    className="flex items-center gap-2 w-full rounded-lg px-2 py-1 transition-all hover:bg-white/4 text-left"
                  >
                    <div className="text-[10px] w-14 shrink-0 font-medium transition-colors" style={{ color: active ? "#818cf8" : "rgba(255,255,255,0.3)" }}>
                      {s.label}
                    </div>
                    <div className="flex items-end gap-0.5 h-5 flex-1">
                      {s.bars.map((h, i) => (
                        <div key={i} className="flex-1 rounded-t-sm transition-colors" style={{ height: `${h}%`, backgroundColor: active ? "#818cf8" : "rgba(255,255,255,0.1)" }} />
                      ))}
                    </div>
                    {active && <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
            <div className="mt-3 text-xs text-indigo-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              {STYLE_OPTS.find(o => o.value === styleIntensity)?.label} selected
            </div>
          </div>

        </div>
      </section>

      {/* KUDOSWALL SOCIAL PROOF WIDGET */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 py-16">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-orange-500/70 mb-3">Wall of Love</div>
          <h2 className="text-3xl md:text-4xl font-bold">What our <span className="text-orange-500">customers</span> say</h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed mt-2">Real feedback from founders and developers shipping with Sleek.</p>
        </div>
        <div className="relative rounded-3xl overflow-hidden border border-white/8 bg-[#0d0d0d] p-6 md:p-10 shadow-2xl">
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: "linear-gradient(rgba(255,107,43,0.04) 1px, transparent 1px), linear-gradient(to right, rgba(255,107,43,0.04) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative z-10">
            <KudosWallWidget />
          </div>
        </div>
      </section>

      {/* VIDEO DEMO */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 pb-24">
        <div className="text-center mb-10">
          <div className="text-xs uppercase tracking-widest text-orange-500/70 mb-3">Live Demo</div>
          <h2 className="text-3xl md:text-4xl font-bold">See Sleek in <span className="text-orange-500">Action</span></h2>
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-white/8 group cursor-pointer bg-[#0d0d0d]">
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(rgba(255,107,43,0.06) 1px, transparent 1px), linear-gradient(to right, rgba(255,107,43,0.06) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
          <div className="relative p-8 md:p-14">
            <div className="flex gap-4 items-start">
              <div className="hidden md:flex flex-col gap-2 w-40 shrink-0">
                <div className="h-6 bg-white/5 rounded-lg border border-white/8" />
                <div className="h-32 bg-white/3 rounded-xl border border-white/6 p-2 flex flex-col gap-1.5">
                  {[...Array(5)].map((_,i)=>(
                    <div key={i} className="h-2 bg-white/10 rounded" style={{ width: `${60 + i*8}%` }} />
                  ))}
                </div>
              </div>
              <div className="flex-1 aspect-video bg-gradient-to-br from-[#1a0d00] to-[#0d0800] rounded-xl border border-orange-500/20 flex items-center justify-center">
                <button className="w-16 h-16 rounded-full bg-orange-500 flex items-center justify-center shadow-2xl shadow-orange-500/50 group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-6 h-6 text-white ml-1 fill-white" />
                </button>
              </div>
            </div>
            <div className="mt-4 text-center text-xs text-white/30">3-minute walkthrough · No sign-up required</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Turn your ideas into reality</h2>
          <p className="text-white/40 max-w-xl mx-auto text-sm leading-relaxed">From a single chat prompt to a full multi-page UI — Sleek generates, persists, and iterates your designs so you can ship without a designer.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {FEATURES.map((f,i)=>(
            <div key={i} className="group rounded-2xl border border-white/8 bg-white/2 p-6 hover:bg-white/4 hover:border-orange-500/20 transition-all duration-300">
              <div className="w-10 h-10 rounded-xl bg-orange-500/15 border border-orange-500/20 flex items-center justify-center mb-4 group-hover:bg-orange-500/25 transition-colors">
                <f.icon className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="text-base font-semibold mb-2">{f.title}</h3>
              <p className="text-sm text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-5">
          {[
            { title: "Prompt → Rendered UI", tag: "Web, mobile & dashboards", color: "#f97316", sym: "✦" },
            { title: "Draggable Canvas", tag: "Reorder, zoom & compare pages", color: "#818cf8", sym: "◈" },
            { title: "Clean HTML Export", tag: "Paste straight into your codebase", color: "#22c55e", sym: "⊕" },
          ].map((c,i)=>(
            <div key={i} className="rounded-2xl border border-white/8 bg-white/2 overflow-hidden group hover:border-white/15 transition-all duration-300">
              <div className="h-36 relative flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${c.color}18, transparent)` }}>
                <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `linear-gradient(${c.color}40 1px, transparent 1px), linear-gradient(to right, ${c.color}40 1px, transparent 1px)`, backgroundSize: "24px 24px" }} />
                <div className="relative text-4xl font-black opacity-25" style={{ color: c.color }}>{c.sym}</div>
              </div>
              <div className="p-4">
                <div className="text-sm font-semibold mb-1">{c.title}</div>
                <div className="text-xs text-white/40">{c.tag}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative z-10 max-w-3xl mx-auto px-6 pb-24">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-3">Frequently asked questions.</h2>
          <p className="text-white/40 text-sm">Everything you need to know about Sleek.</p>
        </div>
        <div className="flex flex-col gap-2">
          {FAQ_ITEMS.map((item,idx)=><FAQItem key={idx} item={item} />)}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-6xl mx-auto px-6 pb-24">
        <div className="relative rounded-3xl border border-white/8 bg-white/2 overflow-hidden p-10 md:p-16">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[200px] bg-orange-500/12 blur-[80px] rounded-full" />
          </div>
          <div className="relative grid md:grid-cols-2 gap-10 items-center">
            <div>
              <div className="text-xs uppercase tracking-widest text-orange-500/70 mb-3">Get started free</div>
              <h2 className="text-3xl md:text-4xl font-bold leading-tight mb-3">Start building UI<br />with a single prompt</h2>
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/40 mt-4">
                <span className="flex items-center gap-1.5"><span className="text-orange-400">✓</span> Free to start</span>
                <span className="flex items-center gap-1.5"><span className="text-orange-400">✓</span> No credit card needed</span>
                <span className="flex items-center gap-1.5"><span className="text-orange-400">✓</span> Web &amp; mobile UI</span>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-3 focus-within:border-orange-500/40 transition-all">
                <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Enter your email address" className="flex-1 bg-transparent text-sm text-white placeholder-white/30 outline-none" />
              </div>
              <SignUpButton>
                <button className="w-full bg-orange-500 hover:bg-orange-400 text-white font-semibold py-3.5 rounded-xl transition-colors shadow-xl shadow-orange-500/20 text-sm flex items-center justify-center gap-2">
                  Start for free <ArrowRight className="w-4 h-4" />
                </button>
              </SignUpButton>
              <p className="text-center text-xs text-white/25">By signing up, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="relative z-10 border-t border-white/6">
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-orange-500/30 to-transparent" />
        <div className="absolute -bottom-20 left-1/2 -translate-x-1/2 w-[800px] h-[200px] bg-orange-600/8 blur-[100px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-10 mb-14">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white fill-white/30" />
                </div>
                <span className="text-sm font-semibold">Sleek<span className="text-orange-500">.</span></span>
              </div>
              <p className="text-xs text-white/30 leading-relaxed">AI-powered web &amp; mobile UI workspace. Describe any screen — Sleek generates and iterates it.</p>
            </div>
            {[
              { title: "Product", links: ["Features","Templates","Pricing","Changelog","Roadmap"] },
              { title: "Company", links: ["About","Blog","Careers","Press","Contact"] },
              { title: "Resources", links: ["Docs","API","Community","Tutorials","Status"] },
              { title: "Legal", links: ["Privacy","Terms","Security","Cookies"] },
            ].map((col)=>(
              <div key={col.title}>
                <div className="text-xs font-semibold uppercase tracking-widest text-white/30 mb-4">{col.title}</div>
                <ul className="flex flex-col gap-2.5">
                  {col.links.map((l)=>(
                    <li key={l}><Link href="#" className="text-xs text-white/50 hover:text-white transition-colors">{l}</Link></li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-white/6">
            <p className="text-xs text-white/25">© 2025 Sleek. All rights reserved.</p>
            <div className="flex items-center gap-4">
              {[{ icon: Twitter, label: "Twitter" },{ icon: Linkedin, label: "LinkedIn" },{ icon: Github, label: "GitHub" }].map(({ icon: Icon, label })=>(
                <Link key={label} href="#" aria-label={label} className="w-8 h-8 rounded-lg border border-white/10 flex items-center justify-center text-white/40 hover:text-white hover:border-white/20 transition-all">
                  <Icon className="w-3.5 h-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
