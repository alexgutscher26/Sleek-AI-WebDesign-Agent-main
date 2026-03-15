"use client";

import { useMemo, useState } from "react";
import { CheckCircle2Icon, CopyIcon, ExternalLinkIcon, KeyRoundIcon, RefreshCwIcon, ServerCogIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { InsforgeSetupStatus } from "@/lib/insforge-config";

const envTemplate = `INSFORGE_BASE_URL=https://your-app.region.insforge.app
INSFORGE_ANON_KEY=your-anon-key`;

const setupSteps = [
  {
    title: "Create your Insforge backend",
    body: "Sign up, create a project, and open its settings page to find your base URL and anon key.",
  },
  {
    title: "Add environment variables",
    body: "Create or update .env in the project root with your INSFORGE_BASE_URL and INSFORGE_ANON_KEY values.",
  },
  {
    title: "Apply the schema",
    body: "Run the SQL in insforge/schema.sql so the projects, messages, and pages tables exist before you start generating.",
  },
  {
    title: "Restart the dev server",
    body: "Next.js only picks up new server environment variables after a restart, so restart once your .env file is saved.",
  },
];

const InsforgeSetupWizard = ({ status }: { status: InsforgeSetupStatus }) => {
  const [copied, setCopied] = useState(false);

  const checklist = useMemo(
    () => [
      { label: "Base URL configured", done: status.baseUrl !== "" && status.issues.every((issue) => !issue.includes("BASE_URL")) },
      { label: "Anon key configured", done: status.anonKeyConfigured },
    ],
    [status]
  );

  if (status.configured) {
    return null;
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(envTemplate);
    setCopied(true);
    toast.success("Environment template copied");
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-[120] overflow-y-auto bg-background/96 backdrop-blur-sm">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6">
        <div className="grid w-full gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <section className="rounded-3xl border border-border bg-card p-8 shadow-xl sm:p-10">
            <div className="mb-8 flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <ServerCogIcon className="size-7" />
              </div>
              <div className="space-y-3">
                <p className="text-sm font-medium uppercase tracking-[0.24em] text-muted-foreground">
                  First-Run Setup
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Connect Sleek to Insforge before you continue
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                  The app is ready, but your backend credentials are still missing. Finish the setup below, restart the app, and this wizard will disappear automatically.
                </p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border px-4 py-4 ${item.done
                    ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                    : "border-amber-200 bg-amber-50 text-amber-950"
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2Icon className={`size-5 ${item.done ? "text-emerald-600" : "text-amber-500"}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 space-y-4">
              {setupSteps.map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-2xl border border-border/70 bg-background px-4 py-4">
                  <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    {index + 1}
                  </div>
                  <div className="space-y-1.5">
                    <h2 className="font-medium text-foreground">{step.title}</h2>
                    <p className="text-sm leading-6 text-muted-foreground">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={handleCopy}>
                <CopyIcon className="size-4" />
                {copied ? "Copied template" : "Copy .env template"}
              </Button>
              <Button asChild variant="outline">
                <a href="https://insforge.dev/?utm_source=techwithemma" target="_blank" rel="noreferrer">
                  <ExternalLinkIcon className="size-4" />
                  Open Insforge
                </a>
              </Button>
              <Button onClick={() => window.location.reload()} variant="ghost">
                <RefreshCwIcon className="size-4" />
                Re-check setup
              </Button>
            </div>
          </section>

          <aside className="rounded-3xl border border-border bg-card p-8 shadow-xl sm:p-10">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">
                <KeyRoundIcon className="size-5" />
              </div>
              <div>
                <h2 className="font-semibold text-foreground">What to add</h2>
                <p className="text-sm text-muted-foreground">Update your local config files with these values.</p>
              </div>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  .env
                </p>
                <pre className="overflow-x-auto rounded-2xl border border-border bg-muted/40 p-4 text-sm leading-7 text-foreground">
                  <code>{envTemplate}</code>
                </pre>
              </div>

              <div className="rounded-2xl border border-border bg-background p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  Files to review
                </p>
                <div className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <p><span className="font-medium text-foreground">Env file:</span> <code>.env</code></p>
                  <p><span className="font-medium text-foreground">Schema:</span> <code>insforge/schema.sql</code></p>
                  <p><span className="font-medium text-foreground">Current base URL:</span> <code>{status.baseUrl || "Not configured"}</code></p>
                </div>
              </div>

              <div className="rounded-2xl border border-destructive/20 bg-destructive/5 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-destructive">
                  Blocking issues
                </p>
                <ul className="mt-3 space-y-2 text-sm leading-6 text-muted-foreground">
                  {status.issues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default InsforgeSetupWizard;
