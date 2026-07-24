"use client"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Sparkles } from "lucide-react"

export function Logo({
  className,
  iconClassName,
  showName = true,
}: {
  className?: string
  iconClassName?: string
  showName?: boolean
}) {
  return (
    <Link href="/" className="group flex h-full cursor-pointer items-center gap-3">
      <div
        className={cn(
          `border-border/60 bg-background/80 group-hover:border-primary/35 relative flex items-center justify-center rounded-2xl border p-2.5 shadow-[0_12px_40px_-22px_rgba(0,0,0,0.85)] transition-all duration-300 group-hover:-translate-y-0.5`,
          className
        )}
      >
        <div className="from-primary/16 to-chart-2/12 absolute inset-1 rounded-xl bg-linear-to-br via-transparent" />
        <Sparkles
          className={cn("text-foreground fill-primary/15 relative h-5 w-5", iconClassName)}
        />
      </div>

      {showName && (
        <div className="flex flex-col">
          <span className="text-foreground group-hover:text-primary text-xl font-semibold tracking-[-0.04em] transition-colors">
            Sleek<span className="text-primary">.</span>
          </span>
        </div>
      )}
    </Link>
  )
}
