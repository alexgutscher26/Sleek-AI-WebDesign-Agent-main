import React, { useEffect, useState } from "react"
import { TransformComponent, TransformWrapper } from "react-zoom-pan-pinch"
import {
  deletePageAction,
  duplicatePageAction,
  renamePageAction,
  reorderPagesAction,
} from "@/app/action/action"
import type { SaveStatus } from "@/components/ui/autosave-indicator"
import { EmptyState, LoadingState } from "@/components/ui/view-state"
import { TOOL_MODE_ENUM, ToolModeType } from "@/constants/canvas"
import { cn } from "@/lib/utils"
import { PageType } from "@/types/project"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import type { CanvasPageLayout, EditorHistoryControls } from "../index"
import CanvasControls from "./canvas-controls"
import PageFrame from "./page-frame"

type PropsType = {
  pages: PageType[]
  setPages: React.Dispatch<React.SetStateAction<PageType[]>>
  isProjectLoading?: boolean
  slugId: string
  pageLayouts: Record<string, CanvasPageLayout>
  selectedPageId: string | null
  setSelectedPageId: (pageId: string | null) => void
  toolMode: ToolModeType
  setToolMode: (toolMode: ToolModeType) => void
  onPageLayoutCommit: (pageId: string, layout: CanvasPageLayout) => void
  history: EditorHistoryControls
  onPagesChange: React.Dispatch<React.SetStateAction<PageType[]>>
  onSelectPage: (pageId: string | null) => void
  onSaveStatusChange?: (status: SaveStatus, lastSaved?: Date) => void
}

const getDefaultPageLayout = (
  page: PageType | Pick<PageType, "metadata"> | undefined,
  index: number
): CanvasPageLayout => {
  const viewports = page?.metadata?.viewports ?? []
  const viewport = viewports.find((entry) => entry.id === "desktop") ?? viewports[0]

  if (viewport) {
    return {
      x: 100 + index * Math.max(viewport.width + 120, 520),
      y: 100,
      width: viewport.width,
      height: viewport.height,
    }
  }

  return {
    x: 100 + index * 1600,
    y: 100,
    width: 1550,
    height: 900,
  }
}

const Canvas = ({
  isProjectLoading,
  pages,
  setPages,
  slugId,
  pageLayouts,
  selectedPageId,
  setSelectedPageId,
  toolMode,
  setToolMode,
  onPageLayoutCommit,
  history,
  onPagesChange,
  onSelectPage,
  onSaveStatusChange,
}: PropsType) => {
  const queryClient = useQueryClient()
  const [zoomPercent, setZoomPercent] = useState<number>(26)
  const [currentScale, setCurrentScale] = useState<number>(0.26)
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null)

  const persistPageOrder = async (orderedPages: PageType[]) => {
    onSaveStatusChange?.("saving")
    const result = await reorderPagesAction(
      slugId,
      orderedPages.map((page) => page.id)
    )
    if (result.error) {
      onSaveStatusChange?.("error")
      toast.error(result.error || "Failed to save page order")
      queryClient.invalidateQueries({
        queryKey: ["project", slugId],
      })
    } else {
      onSaveStatusChange?.("saved", new Date())
    }
  }

  const handleDelete = async (pageId: string) => {
    setDeletingPageId(pageId)
    onSaveStatusChange?.("saving")
    const { error } = await deletePageAction(slugId, pageId)
    if (error) {
      setDeletingPageId(null)
      onSaveStatusChange?.("error")
      toast.error(error)
      return
    }

    setPages((prev) => prev.filter((page) => page.id !== pageId))
    queryClient.invalidateQueries({
      queryKey: ["project", slugId],
    })
    setDeletingPageId(null)
    onSaveStatusChange?.("saved", new Date())
    toast.success("Page deleted successfully")
  }

  const handleDuplicate = async (pageId: string) => {
    onSaveStatusChange?.("saving")
    const result = await duplicatePageAction(slugId, pageId)
    if (result.error || !result.data) {
      onSaveStatusChange?.("error")
      toast.error(result.error || "Failed to duplicate page")
      return
    }

    const sourceIndex = pages.findIndex((page) => page.id === pageId)
    const sourcePage = pages.find((page) => page.id === pageId)
    const sourceLayout =
      pageLayouts[pageId] ?? getDefaultPageLayout(sourcePage, Math.max(sourceIndex, 0))
    const duplicatedPage = {
      ...result.data,
      isLoading: false,
    }

    onPagesChange((prev) => {
      const nextPages = [...prev]
      const insertAt = sourceIndex === -1 ? nextPages.length : sourceIndex + 1
      nextPages.splice(insertAt, 0, duplicatedPage)
      return nextPages
    })
    onPageLayoutCommit(duplicatedPage.id, {
      ...sourceLayout,
      x: sourceLayout.x + 80,
      y: sourceLayout.y + 80,
    })
    onSelectPage(duplicatedPage.id)
    queryClient.invalidateQueries({
      queryKey: ["project", slugId],
    })
    onSaveStatusChange?.("saved", new Date())
    toast.success("Page duplicated")
  }

  const handleRename = async (pageId: string, name: string) => {
    onSaveStatusChange?.("saving")
    const result = await renamePageAction(slugId, pageId, name)
    if (result.error || !result.data) {
      onSaveStatusChange?.("error")
      toast.error(result.error || "Failed to rename page")
      return
    }

    onPagesChange((prev) =>
      prev.map((page) => (page.id === pageId ? { ...page, name: result.data.name } : page))
    )
    queryClient.invalidateQueries({
      queryKey: ["project", slugId],
    })
    onSaveStatusChange?.("saved", new Date())
    toast.success("Page renamed")
  }

  return (
    <div className="relative h-full w-full overflow-hidden">
      <TransformWrapper
        initialScale={0.26}
        initialPositionX={40}
        initialPositionY={5}
        minScale={0.1}
        maxScale={3}
        wheel={{ step: 0.1 }}
        pinch={{ step: 0.1 }}
        doubleClick={{ disabled: true }}
        centerZoomedOut={false}
        centerOnInit={false}
        smooth={true}
        limitToBounds={false}
        panning={{
          disabled: toolMode !== TOOL_MODE_ENUM.HAND,
        }}
        onTransformed={(ref) => {
          setZoomPercent(Math.round(ref.state.scale * 100))
          setCurrentScale(ref.state.scale)
        }}
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <CanvasKeyboardShortcuts
              setToolMode={setToolMode}
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              resetTransform={resetTransform}
            />
            <div
              className={cn(
                `absolute inset-0 h-full w-full bg-[#eee] p-3 dark:bg-[#101010]`,
                toolMode === TOOL_MODE_ENUM.HAND
                  ? "cursor-grab active:cursor-grabbing"
                  : "cursor-default"
              )}
              style={{
                backgroundImage:
                  "radial-gradient(circle, color-mix(in oklch, var(--primary) 30%, transparent) 1px, transparent 1px)",
                backgroundSize: "20px 20px",
              }}
              onClick={() => setSelectedPageId(null)}
            >
              {isProjectLoading && (
                <div className="absolute inset-0 z-10 p-6">
                  <LoadingState
                    className="h-full min-h-full"
                    title="Preparing workspace"
                    description="Loading your generated pages and canvas tools."
                  />
                </div>
              )}

              <TransformComponent
                wrapperStyle={{
                  width: "100%",
                  height: "100%",
                  overflow: "unset",
                }}
                contentStyle={{
                  width: "100%",
                  height: "100%",
                }}
              >
                {!isProjectLoading && pages.length === 0 && (
                  <div className="flex h-full w-full items-center justify-center px-8 py-12">
                    <EmptyState
                      title="No pages yet"
                      description="Generate a design from the chat panel to populate this canvas."
                      className="max-w-xl"
                    />
                  </div>
                )}

                {pages.map((page, i) => {
                  const isDeleting = deletingPageId === page.id
                  const pageIndex = pages.findIndex((entry) => entry.id === page.id)

                  return (
                    <PageFrame
                      key={page.id}
                      page={page}
                      layout={pageLayouts[page.id] ?? getDefaultPageLayout(page, i)}
                      scale={currentScale}
                      toolMode={toolMode}
                      selectedPageId={selectedPageId}
                      setSelectedPageId={setSelectedPageId}
                      isDeleting={isDeleting}
                      onDeletePage={handleDelete}
                      onLayoutCommit={onPageLayoutCommit}
                      onDuplicatePage={handleDuplicate}
                      onRenamePage={handleRename}
                      onMovePageBackward={(pageId) => {
                        if (pageIndex <= 0) return
                        onPagesChange((prev) => {
                          const nextPages = [...prev]
                          const fromIndex = nextPages.findIndex((entry) => entry.id === pageId)
                          if (fromIndex <= 0) return prev
                          const [moved] = nextPages.splice(fromIndex, 1)
                          if (moved) {
                            nextPages.splice(fromIndex - 1, 0, moved)
                          }
                          void persistPageOrder(nextPages)
                          return nextPages
                        })
                      }}
                      onMovePageForward={(pageId) => {
                        if (pageIndex === -1 || pageIndex >= pages.length - 1) return
                        onPagesChange((prev) => {
                          const nextPages = [...prev]
                          const fromIndex = nextPages.findIndex((entry) => entry.id === pageId)
                          if (fromIndex === -1 || fromIndex >= nextPages.length - 1) return prev
                          const [moved] = nextPages.splice(fromIndex, 1)
                          if (moved) {
                            nextPages.splice(fromIndex + 1, 0, moved)
                          }
                          void persistPageOrder(nextPages)
                          return nextPages
                        })
                      }}
                      canMoveBackward={pageIndex > 0}
                      canMoveForward={pageIndex !== -1 && pageIndex < pages.length - 1}
                    />
                  )
                })}
              </TransformComponent>
            </div>

            <CanvasControls
              zoomIn={zoomIn}
              zoomOut={zoomOut}
              zoomPercent={zoomPercent}
              toolMode={toolMode}
              setToolMode={setToolMode}
              canUndo={history.canUndo}
              canRedo={history.canRedo}
              onUndo={history.undo}
              onRedo={history.redo}
            />
          </>
        )}
      </TransformWrapper>
    </div>
  )
}

const isEditableTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable ||
    target.closest('[role="dialog"]') !== null
  )
}

const CanvasKeyboardShortcuts = ({
  setToolMode,
  zoomIn,
  zoomOut,
  resetTransform,
}: {
  setToolMode: (toolMode: ToolModeType) => void
  zoomIn: () => void
  zoomOut: () => void
  resetTransform: () => void
}) => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) {
        return
      }

      if (isEditableTarget(event.target)) {
        return
      }

      const key = event.key.toLowerCase()

      if (key === "v") {
        event.preventDefault()
        setToolMode(TOOL_MODE_ENUM.SELECT)
        return
      }

      if (key === "h") {
        event.preventDefault()
        setToolMode(TOOL_MODE_ENUM.HAND)
        return
      }

      if (key === "+" || key === "=") {
        event.preventDefault()
        zoomIn()
        return
      }

      if (key === "-") {
        event.preventDefault()
        zoomOut()
        return
      }

      if (key === "0") {
        event.preventDefault()
        resetTransform()
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [resetTransform, setToolMode, zoomIn, zoomOut])

  return null
}

export default Canvas
