"use client"

import { useEffect, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import { AlertCircle, Check, Cloud, Loader2 } from "lucide-react"
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip"

export type SaveStatus = "saved" | "saving" | "error"

interface AutosaveIndicatorProps {
  status?: SaveStatus | undefined
  lastSaved?: Date | number | string | null | undefined
  className?: string | undefined
}

function formatRelativeTime(date: Date): string {
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 10) {
    return "just now"
  }
  if (diffInSeconds < 60) {
    return `${diffInSeconds}s ago`
  }
  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`
  }
  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours}h ago`
  }
  return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
}

export function AutosaveIndicator({
  status = "saved",
  lastSaved,
  className,
}: AutosaveIndicatorProps) {
  const savedDate = lastSaved ? new Date(lastSaved) : null
  const validDate = savedDate && !isNaN(savedDate.getTime()) ? savedDate : null

  // Tick increments every 10 s so `relativeText` is recomputed without
  // calling setState directly inside an effect body.
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!validDate) return
    const interval = setInterval(() => setTick((n) => n + 1), 10000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastSaved])

  // Derive relative text as a memo — `tick` is referenced to force
  // recomputation when the interval fires.
  const relativeText = useMemo(() => {
    if (!validDate) return ""
    void tick
    return formatRelativeTime(validDate)
  }, [validDate, tick])

  const formattedFullTime = validDate
    ? validDate.toLocaleString([], {
        dateStyle: "medium",
        timeStyle: "medium",
      })
    : null

  if (status === "saving") {
    return (
      <div
        className={cn(
          "text-muted-foreground inline-flex items-center gap-1.5 text-xs transition-all duration-200 select-none",
          className
        )}
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-500" />
        <span className="text-foreground/80 font-medium">Saving...</span>
      </div>
    )
  }

  if (status === "error") {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "text-destructive inline-flex cursor-help items-center gap-1.5 text-xs transition-all duration-200 select-none",
              className
            )}
          >
            <AlertCircle className="h-3.5 w-3.5" />
            <span className="font-medium">Save failed</span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          Some changes could not be saved to cloud.
        </TooltipContent>
      </Tooltip>
    )
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "text-muted-foreground/80 hover:text-muted-foreground inline-flex cursor-help items-center gap-1.5 text-xs transition-all duration-200 select-none",
            className
          )}
        >
          <div className="relative flex items-center justify-center">
            <Cloud className="h-3.5 w-3.5 text-emerald-500/90" />
            <Check className="absolute h-2 w-2 stroke-[3] text-emerald-500" />
          </div>
          <span className="text-[11px] font-medium sm:text-xs">
            {relativeText ? `Saved ${relativeText}` : "Saved"}
          </span>
        </div>
      </TooltipTrigger>
      {formattedFullTime && (
        <TooltipContent side="bottom" className="text-xs">
          Last saved: {formattedFullTime}
        </TooltipContent>
      )}
    </Tooltip>
  )
}
