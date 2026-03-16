import React from 'react'
import { TOOL_MODE_ENUM, ToolModeType } from '@/constants/canvas';
import { Button } from '@/components/ui/button';
import { HandIcon, MinusIcon, MousePointer, PlusIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

type PropsType = {
  zoomIn: () => void;
  zoomOut: () => void;
  zoomPercent: number;
  toolMode: ToolModeType;
  setToolMode: (toolMode: ToolModeType) => void;
};
const CanvasControls = ({
  zoomIn,
  zoomOut,
  zoomPercent,
  toolMode,
  setToolMode,
}: PropsType) => {

  return (
    <div
      className="absolute bottom-4 left-1/2 z-20 flex -translate-x-1/2
      items-center gap-1.5 rounded-full border bg-card/95 px-3 py-1.5
      text-foreground shadow-md backdrop-blur sm:bottom-6 sm:gap-2 sm:px-4
      "
    >

      <div className='flex items-center gap-1'>
        <Button
          size="icon-sm"
          variant="ghost"
          className={cn(
            `rounded-full cursor-pointer text-inherit!
             hover:bg-secondary
            `,
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
            `rounded-full cursor-pointer text-inherit!
             hover:bg-secondary
            `,
            toolMode === TOOL_MODE_ENUM.HAND && "bg-secondary"

          )}
          onClick={() => setToolMode(TOOL_MODE_ENUM.HAND)}
        >
          <HandIcon />
        </Button>
      </div>

      <Separator orientation="vertical" className="h-5 hidden sm:block!" />
      <div className="flex items-center gap-1">
        <Button
          size="icon-sm"
          variant="ghost"
          className={cn(
            `rounded-full cursor-pointer text-inherit!
             hover:bg-secondary
            `,
          )}
          onClick={() => zoomOut()}
        >
          <MinusIcon />
        </Button>
        <div className="min-w-10 text-center text-xs sm:text-sm">{zoomPercent}%</div>
        <Button
          size="icon-sm"
          variant="ghost"
          className={cn(
            `rounded-full cursor-pointer text-inherit!
             hover:bg-secondary
            `,
          )}
          onClick={() => zoomIn()}
        >
          <PlusIcon />
        </Button>
      </div>

    </div>
  )
}

export default CanvasControls
