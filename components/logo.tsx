"use client";
import { Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

export function Logo({
  className,
  iconClassName,
  showName = true
}: {
  className?: string,
  iconClassName?: string,
  showName?: boolean
}) {
  return (
    <Link href="/" className="flex items-center gap-3 group cursor-pointer h-full">
      <div className={cn(`relative flex items-center justify-center rounded-2xl border border-border/60
            bg-background/80 p-2.5 shadow-[0_12px_40px_-22px_rgba(0,0,0,0.85)] transition-all duration-300
            group-hover:-translate-y-0.5 group-hover:border-primary/35`, className)}>
        <div className="absolute inset-1 rounded-xl bg-linear-to-br from-primary/16 via-transparent to-chart-2/12" />
        <Sparkles className={cn("relative h-5 w-5 text-foreground fill-primary/15", iconClassName)} />
      </div>

      {showName && (
        <div className="flex flex-col">
          <span className="text-xl font-semibold tracking-[-0.04em] text-foreground transition-colors group-hover:text-primary">
            Sleek<span className="text-primary">.</span>
          </span>
        </div>
      )}
    </Link>
  );
}
