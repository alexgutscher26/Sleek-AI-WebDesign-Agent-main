"use client"

import { PageType } from "@/types/project"
import { ArrowLeft } from "lucide-react"
import { AutosaveIndicator, SaveStatus } from "../ui/autosave-indicator"
import { Button } from "../ui/button"
import { ExportAppButton } from "./export-app-button"

type ChatHeaderProps = {
  pages?: PageType[]
  title: string
  onBack: () => void
  saveStatus?: SaveStatus
  lastSaved?: Date | number | string | null
}

export const ChatHeader = ({ title, onBack, saveStatus, lastSaved, pages }: ChatHeaderProps) => {
  return (
    <div className="border-border/50 bg-background/95 absolute top-0 left-0 z-10 w-full border-b pb-2 backdrop-blur">
      <div className="flex items-center justify-between px-3 pt-2 md:px-4">
        <div
          role="button"
          className="flex min-w-0 flex-1 cursor-pointer! items-center gap-2"
          onClick={onBack}
        >
          <Button variant="secondary" size="icon" className="shrink-0">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h5 className="truncate text-sm font-semibold tracking-tight md:text-base">{title}</h5>
        </div>
        <div className="flex items-center gap-2">
          {pages && pages.length > 0 && <ExportAppButton projectTitle={title} pages={pages} />}
          {saveStatus && (
            <div className="ml-2 shrink-0 border-l pl-2">
              <AutosaveIndicator status={saveStatus} lastSaved={lastSaved} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
