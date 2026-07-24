import React from "react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { TOOL_MODE_ENUM, ToolModeType } from "@/constants/canvas"
import { cn } from "@/lib/utils"
import { HandIcon, MinusIcon, MousePointer, PlusIcon, Redo2Icon, Undo2Icon } from "lucide-react"

type PropsType = {
  zoomIn: () => void
  zoomOut: () => void
  zoomPercent: number
  toolMode: ToolModeType
  setToolMode: (toolMode: ToolModeType) => void
  canUndo: boolean
  canRedo: boolean
  onUndo: () => void
  onRedo: () => void
}
const CanvasControls = ({
  zoomIn,
  zoomOut,
  zoomPercent,
  toolMode,
  setToolMode,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: PropsType) => {
  return (
    <div className="bg-card/95 text-foreground absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 shadow-md backdrop-blur sm:bottom-6 sm:gap-2 sm:px-4">
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          className="hover:bg-secondary cursor-pointer rounded-full text-inherit!"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Undo"
        >
          <Undo2Icon />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className="hover:bg-secondary cursor-pointer rounded-full text-inherit!"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Redo"
        >
          <Redo2Icon />
        </Button>
      </div>

      <Separator orientation="vertical" className="hidden h-5 sm:block!" />

      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          className={cn(
            `hover:bg-secondary cursor-pointer rounded-full text-inherit!`,
            toolMode === TOOL_MODE_ENUM.SELECT && "bg-secondary"
          )}
          onClick={() => setToolMode(TOOL_MODE_ENUM.SELECT)}
        >
          <MousePointer />
        </Button>
        <Button
          size="icon-sm"
          variant="ghost"
          className={cn(
            `hover:bg-secondary cursor-pointer rounded-full text-inherit!`,
            toolMode === TOOL_MODE_ENUM.HAND && "bg-secondary"
          )}
          onClick={() => setToolMode(TOOL_MODE_ENUM.HAND)}
        >
          <HandIcon />
        </Button>
      </div>

      <Separator orientation="vertical" className="hidden h-5 sm:block!" />
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          className={cn(`hover:bg-secondary cursor-pointer rounded-full text-inherit!`)}
          onClick={() => zoomOut()}
        >
          <MinusIcon />
        </Button>
        <div className="min-w-10 text-center text-xs sm:text-sm">{zoomPercent}%</div>
        <Button
          size="icon-sm"
          variant="ghost"
          className={cn(`hover:bg-secondary cursor-pointer rounded-full text-inherit!`)}
          onClick={() => zoomIn()}
        >
          <PlusIcon />
        </Button>
      </div>
    </div>
  )
}

export default CanvasControls
