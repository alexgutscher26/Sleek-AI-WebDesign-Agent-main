/* eslint-disable react-hooks/set-state-in-effect */
import React, { useRef, useEffect, useState, useMemo } from 'react'
import { Rnd } from "react-rnd";
import { TOOL_MODE_ENUM, ToolModeType } from '@/constants/canvas';
import { getHTMLWrapper } from '@/lib/page-wrapper';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { ChevronLeftIcon, ChevronRightIcon, Code2, CopyIcon, PaintbrushIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { toast } from 'sonner';
import { Spinner } from '@/components/ui/spinner';
import { PageType } from '@/types/project';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/view-state';

type ColorToken = {
  label: string
  value: string
}

const getPreferredViewport = (page: Pick<PageType, "metadata">) => {
  const viewports = page.metadata?.viewports ?? []
  return viewports.find((viewport) => viewport.id === "desktop") ?? viewports[0]
}

type PropsType = {
  page: PageType
  layout: { x: number; y: number; width: number; height: number };
  scale?: number;
  toolMode: ToolModeType;
  selectedPageId: string | null;
  setSelectedPageId: (pageId: string | null) => void
  isDeleting: boolean;
  onDeletePage: (pageId: string) => void
  onLayoutCommit: (pageId: string, layout: { x: number; y: number; width: number; height: number }) => void
  onDuplicatePage: (pageId: string) => void
  onRenamePage: (pageId: string, name: string) => void
  onMovePageBackward: (pageId: string) => void
  onMovePageForward: (pageId: string) => void
  canMoveBackward: boolean
  canMoveForward: boolean
}

const PageFrame = ({
  page,
  layout,
  scale = 1,
  toolMode,
  selectedPageId,
  setSelectedPageId,
  isDeleting,
  onDeletePage,
  onLayoutCommit,
  onDuplicatePage,
  onRenamePage,
  onMovePageBackward,
  onMovePageForward,
  canMoveBackward,
  canMoveForward,
}: PropsType) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [showColorScheme, setShowColorScheme] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [renameValue, setRenameValue] = useState(page.name);

  const fullHtml = getHTMLWrapper(page.htmlContent,
    page.name, page.rootStyles, page.id
  )
  const isSelected = selectedPageId === page.id
  const primaryViewport = getPreferredViewport(page)
  const isMobileViewport = Boolean(primaryViewport && primaryViewport.width <= 430)

  useEffect(() => {
    setRenameValue(page.name)
  }, [page.name])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "FRAME_HEIGHT" && event.data.
        pageId === page.id) {
        if (layout.height !== event.data.height) {
          onLayoutCommit(page.id, {
            ...layout,
            height: event.data.height
          })
        }
      }
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage)
  }, [layout, onLayoutCommit, page.id])

  const colorTokens = useMemo<ColorToken[]>(() => {
    if (!page.rootStyles) return [];
    const tokens = [
      { key: '--background', label: 'Background' },
      { key: '--foreground', label: 'Foreground' },
      { key: '--primary', label: 'Primary' },
      { key: '--secondary', label: 'Secondary' },
      { key: '--accent', label: 'Accent' },
      { key: '--card', label: 'Card' },
      { key: '--muted', label: 'Muted' },
      { key: '--border', label: 'Border' },
    ];
    return tokens.map(({ key, label }) => {
      const match = page.rootStyles.match(new RegExp(`${key}:\\s*([^;]+)`));
      return { label, value: match?.[1]?.trim() ?? null };
    }).filter((token): token is ColorToken => Boolean(token.value));
  }, [page.rootStyles]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(fullHtml)
    toast.success("Design code copied to clipboard!");
  }

  const handleRenameSubmit = () => {
    const trimmedName = renameValue.trim()
    if (!trimmedName || trimmedName === page.name) {
      setShowRename(false)
      setRenameValue(page.name)
      return
    }

    onRenamePage(page.id, trimmedName)
    setShowRename(false)
  }

  return (
    <>
      <Rnd
        default={{
          x: layout.x,
          y: layout.y,
          width: layout.width,
          height: layout.height
        }}
        position={{ x: layout.x, y: layout.y }}
        size={{ width: layout.width, height: layout.height }}
        minWidth={320}
        minHeight={900}
        scale={scale}
        disableDragging={toolMode === TOOL_MODE_ENUM.HAND}
        enableResizing={(isSelected || isHovered) && toolMode !== TOOL_MODE_ENUM.HAND}
        onDragStop={(_, data) => {
          onLayoutCommit(page.id, {
            ...layout,
            x: data.x,
            y: data.y
          })
        }}
        onResizeStop={(_, __, ref, ___, position) => {
          onLayoutCommit(page.id, {
            x: position.x,
            y: position.y,
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height)
          })
        }}
        onClick={(e: React.MouseEvent) => {
          e.stopPropagation();
          if (page.isLoading) return
          if (toolMode === TOOL_MODE_ENUM.SELECT) {
            // HANDLE THE SELECTION
            setSelectedPageId(page.id)
          }
        }}
        resizeHandleComponent={
          (isSelected || isHovered) ? {
            topLeft: <Handle />,
            topRight: <Handle />,
            bottomLeft: <Handle />,
            bottomRight: <Handle />
          } : {}
        }

        className={cn(
          "relative z-30",
          (isSelected || isHovered) && toolMode !== TOOL_MODE_ENUM.HAND
          && "ring-4 ring-blue-500 ring-offset-1",
          toolMode === TOOL_MODE_ENUM.HAND ? `cursor-grab!
          active:cursor-grabbing!` : `cursor-move`
        )}

        //style={{ overflow: "visible"}}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >

        {(isSelected || isHovered) && toolMode !==
          TOOL_MODE_ENUM.HAND && (
            <div className="absolute -top-13 left-0 z-50
          flex items-center bg-card rounded-lg px-1 py-1 shadow-md
          "
              style={{
                transform: `scale(${1 / scale})`,
                transformOrigin: "bottom left"
              }}
            >
              <h5 className="text-xs pl-3 pr-6 font-medium
            truncate max-w-[150px]
            ">{page.name}</h5>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center px-2 gap-1">
                {/* color schema */}
                <Popover
                  open={showColorScheme}
                  onOpenChange={setShowColorScheme}
                >
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="p-1! hover:bg-accent
                     size-6! cursor-pointer
                    "
                    >
                      <PaintbrushIcon className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    className="w-52 p-3"
                  >
                    <p className="text-xs font-semibold
                  mb-2 text-muted-foreground uppercase">Color Scheme</p>
                    <div className="flex flex-col gap-2">
                      {colorTokens.map(({ label, value }) => (
                        <div
                          key={label}
                          className='flex items-center justify-between
                        gap-2'
                        >
                          <span className='text-xs text-muted-foreground
                        '>{label}</span>
                          <div className="flex items-center gap-1.5">
                            <div
                              className="size-4 rounded-sm border border-border"
                              style={{ backgroundColor: value }}
                            />
                            <span className="text-xs font-mono text-foreground">{value}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  size="icon"
                  variant="ghost"
                  className="p-1! hover:bg-accent
                     size-6! cursor-pointer
                    "
                  onClick={handleCopyCode}
                >
                  <Code2 className="size-3.5" />
                </Button>

                <Popover open={showRename} onOpenChange={setShowRename}>
                  <PopoverTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="p-1! hover:bg-accent
                     size-6! cursor-pointer
                    "
                    >
                      <PencilIcon className="size-3.5" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-64 p-3">
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase text-muted-foreground">
                        Rename Page
                      </p>
                      <input
                        value={renameValue}
                        onChange={(event) => setRenameValue(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.preventDefault()
                            handleRenameSubmit()
                          }
                        }}
                        className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none"
                      />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowRename(false)}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleRenameSubmit}>
                          Save
                        </Button>
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  size="icon"
                  variant="ghost"
                  className="p-1! hover:bg-accent
                     size-6! cursor-pointer
                    "
                  onClick={() => onDuplicatePage(page.id)}
                >
                  <CopyIcon className="size-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="p-1! hover:bg-accent
                     size-6! cursor-pointer
                    "
                  onClick={() => onMovePageBackward(page.id)}
                  disabled={!canMoveBackward}
                >
                  <ChevronLeftIcon className="size-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="p-1! hover:bg-accent
                     size-6! cursor-pointer
                    "
                  onClick={() => onMovePageForward(page.id)}
                  disabled={!canMoveForward}
                >
                  <ChevronRightIcon className="size-3.5" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  className="p-1! hover:bg-accent
                     size-6! cursor-pointer
                    "
                  onClick={() => onDeletePage(page.id)}
                >
                  {isDeleting ? <Spinner /> : <Trash2Icon className="size-3.5" />}
                </Button>

              </div>
            </div>
          )}
        <div className={cn(
          "w-full relative overflow-hidden bg-muted/90",
          isMobileViewport ? "rounded-[2.25rem] border-[10px] border-neutral-900 shadow-2xl" : "rounded-sm"
        )}>
          {isMobileViewport && (
            <>
              <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center pt-3">
                <div className="h-6 w-32 rounded-full bg-neutral-900" />
              </div>
              <div className="pointer-events-none absolute right-3 top-16 z-20 h-14 w-1 rounded-full bg-neutral-800/90" />
              <div className="pointer-events-none absolute left-[-2px] top-20 z-20 h-16 w-1 rounded-full bg-neutral-800/90" />
            </>
          )}

          {page.isLoading ? (
            <div className={cn(
              "w-full h-full flex flex-col gap-3 bg-black/50 dark:bg-white/50 animate-pulse",
              isMobileViewport ? "px-5 pt-14 pb-6 rounded-[1.7rem]" : "px-10 py-10 rounded-sm mx-px"
            )}
              style={{ width: layout.width, height: layout.height }}>
              <Skeleton className="w-full h-8 bg-black/50 dark:bg-white/50" />
              <Skeleton className="w-1/2 h-10 bg-black/50 dark:bg-white/50 curs" />
            </div>
          ) : page.error ? (
            <div
              className={cn(
                "flex items-center justify-center bg-background p-8",
                isMobileViewport && "rounded-[1.7rem]"
              )}
              style={{ width: layout.width, height: layout.height }}
            >
              <ErrorState
                title={`${page.name} failed to render`}
                description={page.error}
                className="min-h-[240px] max-w-lg"
              />
            </div>
          ) : !page.htmlContent.trim() ? (
            <div
              className={cn(
                "flex items-center justify-center bg-background p-8",
                isMobileViewport && "rounded-[1.7rem]"
              )}
              style={{ width: layout.width, height: layout.height }}
            >
              <EmptyState
                title={`${page.name} is empty`}
                description="This page does not have any generated content yet."
                className="min-h-[240px] max-w-lg"
              />
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              srcDoc={fullHtml}
              title={page.name}
              sandbox='allow-scripts'
              className={cn(isMobileViewport && "rounded-[1.7rem] bg-background")}
              style={{
                width: "100%",
                height: `${layout.height}px`,
                border: "none",
                display: "block",
                pointerEvents: "none"
              }}
            />

          )}
        </div>
      </Rnd>
    </>
  )
}

const Handle = () => (
  <div className="z-30 h-6 w-6 bg-white border-2
     border-blue-500 shadow-sm" />
);

export default PageFrame
