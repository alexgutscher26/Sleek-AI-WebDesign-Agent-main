"use client"

import { Button } from "@/components/ui/button"
import { downloadFile, generateFullAppPrompt } from "@/lib/export-full-app"
import { PageType } from "@/types/project"
import { Download } from "lucide-react"
import { toast } from "sonner"

interface ExportAppButtonProps {
  projectTitle: string
  pages: PageType[]
}

export const ExportAppButton = ({ projectTitle, pages }: ExportAppButtonProps) => {
  const handleExport = () => {
    try {
      if (pages.length === 0) {
        toast.error("No pages generated yet to export.")
        return
      }
      const promptContent = generateFullAppPrompt(projectTitle, pages)
      downloadFile("full-app-prompt.md", promptContent)
      toast.success("Successfully downloaded instructions for full app generation.")
    } catch (error) {
      console.error(error)
      toast.error("Failed to generate export file.")
    }
  }

  return (
    <Button variant="outline" size="sm" className="flex items-center gap-2" onClick={handleExport}>
      <Download className="h-4 w-4" />
      <span>Generate Full App</span>
    </Button>
  )
}
