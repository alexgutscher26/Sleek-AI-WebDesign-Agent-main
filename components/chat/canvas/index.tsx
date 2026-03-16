import React, { useEffect, useState } from 'react'
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { TOOL_MODE_ENUM, ToolModeType } from '@/constants/canvas'
import { cn } from '@/lib/utils';
import CanvasControls from './canvas-controls';
import PageFrame from './page-frame';
import { useCanvas } from '@/hooks/use-canvas';
import { PageType } from '@/types/project';
import { deletePageAction } from '@/app/action/action';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';
import { EmptyState, LoadingState } from '@/components/ui/view-state';

type PropsType = {
  pages: PageType[]
  setPages: React.Dispatch<React.SetStateAction<PageType[]>>;
  isProjectLoading?: boolean
  slugId: string
}

const Canvas = ({ isProjectLoading, pages, setPages, slugId }: PropsType) => {
  const queryClient = useQueryClient()
  const [toolMode, setToolMode] = useState<ToolModeType>(
    TOOL_MODE_ENUM.SELECT
  )
  const [zoomPercent, setZoomPercent] = useState<number>(26)
  const [currentScale, setCurrentScale] = useState<number>(0.26)
  const [deletingPageId, setDeletingPageId] = useState<string | null>(null);
  const { selectedPageId, setSelectedPageId } = useCanvas()

  const handleDelete = async (pageId: string) => {
    setDeletingPageId(pageId);
    const { error } = await deletePageAction(slugId, pageId);
    if (error) {
      setDeletingPageId(null)
      toast.error(error)
      return
    }

    setPages((prev) => prev.filter((page) => page.id !== pageId))
    queryClient.invalidateQueries({
      queryKey: ["project", slugId]
    })
    setDeletingPageId(null)
    toast.success("Page deleted successfully")
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
          disabled: toolMode !== TOOL_MODE_ENUM.HAND
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
                backgroundImage: "radial-gradient(circle, color-mix(in oklch, var(--primary) 30%, transparent) 1px, transparent 1px)",
                backgroundSize: "20px 20px"
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
                  const x = 100 + i * 1600;
                  const y = 100;
                  const isDeleting = deletingPageId === page.id;

                  return (
                    <PageFrame
                      key={page.id}
                      page={page}
                      scale={currentScale}
                      toolMode={toolMode}
                      initialPosition={{
                        x,
                        y
                      }}
                      selectedPageId={selectedPageId}
                      setSelectedPageId={setSelectedPageId}
                      isDeleting={isDeleting}
                      onDeletePage={handleDelete}
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
