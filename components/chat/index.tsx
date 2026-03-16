"use client"
import { useChat } from "@ai-sdk/react"
import { generateSlugId } from "@/lib/utils";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import { DefaultChatTransport, UIMessage } from "ai";
import { toast } from "sonner";
import { PromptInputMessage } from "../ai-elements/prompt-input";
import NewProjectChat from "./new-project-chat";
import { Button } from "../ui/button";
import { ArrowLeft, LayoutPanelLeft, MonitorSmartphone } from "lucide-react";
import ChatPanel from "./chat-panel";
import Canvas from "./canvas";
import { PageType } from "@/types/project";
import { useQuery } from "@tanstack/react-query";
import { useCanvas } from "@/hooks/use-canvas";
import { ErrorState } from "../ui/view-state";
import { DEFAULT_CONTENT_DEPTH, type ContentDepth } from "@/constants/content-depth";
import { DEFAULT_CREATIVITY_LEVEL, type CreativityLevel } from "@/constants/creativity-level";
import { DEFAULT_GENERATION_PLATFORM, type GenerationPlatform } from "@/constants/generation-platform";
import { DEFAULT_GENERATION_MODE, type GenerationMode } from "@/constants/generation-mode";
import { DEFAULT_LAYOUT_COMPLEXITY, type LayoutComplexity } from "@/constants/layout-complexity";
import { DEFAULT_MODEL_PROVIDER, type ModelProvider } from "@/constants/model-provider";
import { DEFAULT_STYLE_INTENSITY, type StyleIntensity } from "@/constants/style-intensity";
import { TOOL_MODE_ENUM, type ToolModeType } from "@/constants/canvas";

type PropsType = {
  isProjectPage?: boolean;
  slugId?: string;
}

type StreamDataPart = {
  type: string;
  data?: unknown;
}

type StreamPage = {
  id: string;
  name: string;
  rootStyles: string;
  metadata?: PageType["metadata"];
}

type StreamPageCreated = {
  id: string;
  name: string;
  rootStyles: string;
  htmlContent: string;
  metadata?: PageType["metadata"];
  error?: string;
  isTemporary?: boolean;
}

type GenerationStreamData = {
  status?: "error" | "canceled" | string;
}

export type CanvasPageLayout = {
  x: number;
  y: number;
  width: number;
  height: number;
}

type EditorSnapshot = {
  input: string;
  selectedPageId: string | null;
  toolMode: ToolModeType;
  pageLayouts: Record<string, CanvasPageLayout>;
}

export type EditorHistoryControls = {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const PROMPT_HISTORY_MERGE_WINDOW_MS = 900
const MAX_HISTORY_ENTRIES = 100

const getDefaultPageLayout = (page: PageType | Pick<PageType, "metadata"> | undefined, index: number): CanvasPageLayout => {
  const viewport = page?.metadata?.viewports?.[0]

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

const normalizePageLayouts = (
  pages: PageType[],
  layouts: Record<string, CanvasPageLayout>
) => pages.reduce<Record<string, CanvasPageLayout>>((acc, page, index) => {
  const existingLayout = layouts[page.id]
  const viewport = page.metadata?.viewports?.[0]
  const shouldUpgradeLegacyDesktopLayout = Boolean(
    viewport &&
    existingLayout &&
    existingLayout.width === 1550 &&
    existingLayout.height === 900
  )

  acc[page.id] = shouldUpgradeLegacyDesktopLayout
    ? getDefaultPageLayout(page, index)
    : existingLayout ?? getDefaultPageLayout(page, index)
  return acc
}, {})

const snapshotsEqual = (a: EditorSnapshot, b: EditorSnapshot) => (
  a.input === b.input &&
  a.selectedPageId === b.selectedPageId &&
  a.toolMode === b.toolMode &&
  JSON.stringify(a.pageLayouts) === JSON.stringify(b.pageLayouts)
)

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

const focusChatInput = () => {
  const input = document.querySelector<HTMLTextAreaElement>('[data-chat-input="true"]')
  if (!input) {
    return false
  }

  input.focus()
  const length = input.value.length
  input.setSelectionRange(length, length)
  return true
}

const fileToDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result ?? ""));
  reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
  reader.readAsDataURL(blob);
})

const serializeFilesForTransport = async (files: PromptInputMessage["files"]) => {
  return Promise.all(
    files.map(async (file) => {
      if (file.url.startsWith("data:")) {
        return file
      }

      const response = await fetch(file.url)
      const blob = await response.blob()

      return {
        ...file,
        size: blob.size,
        url: await fileToDataUrl(blob)
      }
    })
  )
}

const ChatInterface = ({
  isProjectPage = false,
  slugId: propSlugId
}: PropsType) => {
  const pathname = usePathname();
  const router = useRouter()

  const [slugId, setSlugId] = useState(() => propSlugId
    || generateSlugId())


  const [input, setInput] = useState("")
  const [contentDepth, setContentDepth] = useState<ContentDepth>(DEFAULT_CONTENT_DEPTH)
  const [creativityLevel, setCreativityLevel] = useState<CreativityLevel>(DEFAULT_CREATIVITY_LEVEL)
  const [generationPlatform, setGenerationPlatform] = useState<GenerationPlatform>(DEFAULT_GENERATION_PLATFORM)
  const [generationMode, setGenerationMode] = useState<GenerationMode>(DEFAULT_GENERATION_MODE)
  const [layoutComplexity, setLayoutComplexity] = useState<LayoutComplexity>(DEFAULT_LAYOUT_COMPLEXITY)
  const [modelProvider, setModelProvider] = useState<ModelProvider>(DEFAULT_MODEL_PROVIDER)
  const [styleIntensity, setStyleIntensity] = useState<StyleIntensity>(DEFAULT_STYLE_INTENSITY)
  const [hasStarted, setHasStarted] = useState(isProjectPage);
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [pages, setPages] = useState<PageType[]>([]);
  const [toolMode, setToolMode] = useState<ToolModeType>(TOOL_MODE_ENUM.SELECT)
  const [pageLayouts, setPageLayouts] = useState<Record<string, CanvasPageLayout>>({})
  const [activeCompactPane, setActiveCompactPane] = useState<"chat" | "canvas">("chat");
  const [pastSnapshots, setPastSnapshots] = useState<EditorSnapshot[]>([])
  const [futureSnapshots, setFutureSnapshots] = useState<EditorSnapshot[]>([])

  const {
    data: projectData,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["project", slugId],
    queryFn: async () => {
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const res = await fetch(`/api/project/${slugId}`);
        if (res.ok) {
          const payload = await res.json() as {
            success: true;
            data: { title: string; messages: UIMessage[]; pages: PageType[] }
          }
          return payload.data
        }

        const payload = await res.json().catch(() => null) as {
          error?: { code?: string; message?: string }
        } | null;

        const isRetriableNotFound = payload?.error?.code === "PROJECT_NOT_FOUND" && attempt < 3;
        if (isRetriableNotFound) {
          await sleep(250 * attempt);
          continue
        }

        const message = payload?.error?.code === "PROJECT_NOT_FOUND"
          ? "This project could not be found."
          : payload?.error?.code === "UNAUTHORIZED"
            ? "Please sign in to access this project."
            : payload?.error?.message || "Failed to fetch project.";

        throw new Error(message);
      }

      throw new Error("Failed to fetch project.")
    },
    // Brand new local projects already have state in memory; fetching immediately
    // can race the initial POST before the project row exists and produce avoidable 404s.
    enabled: isProjectPage && Boolean(propSlugId),
    refetchOnWindowFocus: false, // Prevent breaking stream when switching tabs
    staleTime: 1000 * 60 * 5, // 5 minutes cache
  })

  const { messages, sendMessage, setMessages, status, error,
    stop
  } = useChat({
    messages: [],
    transport: new DefaultChatTransport({
      api: "/api/project",
      prepareSendMessagesRequest: ({ messages, body }) => {
        return {
          body: {
            ...body,
            messages
          }
        }
      }
    }),
    onData(dataPart) {
      const part = dataPart as StreamDataPart;
      const data = part.data

      switch (part.type) {
        case "data-project-title": {
          const title = (data as { title?: string } | undefined)?.title
          if (title) setProjectTitle(title)
          break
        }
        case "data-pages-skeleton": {
          const pagesData = ((data as { pages?: StreamPage[] } | undefined)?.pages || [])
          const newPages = pagesData.map((page) => ({
            id: page.id,
            name: page.name,
            rootStyles: page.rootStyles,
            htmlContent: "",
            isLoading: true,
            isTemporary: true
          }))
          setPages((prev) => {
            const existingIds = new Set(prev.map(p => p.id));
            const toAdd = newPages.filter((page) => !existingIds.has(page.id));
            return [...prev, ...toAdd]
          })
          break;
        }

        case "data-page-created": {
          const payload = data as { page: StreamPageCreated; tempId?: string; persisted?: boolean }
          const page = payload.page
          const tempId = payload.tempId
          const persisted = payload.persisted === true
          setPages((prev) => {
            const idx = prev.findIndex(p => p.id === tempId ||
              p.id === page.id
            )
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = {
                ...page,
                isLoading: false,
                isTemporary: !persisted
              };
              return updated;
            }
            return [...prev, {
              ...page,
              isLoading: false,
              isTemporary: !persisted
            }]
          })
          break;
        }

        case "data-page-loading": {
          const pageId = (data as { pageId?: string } | undefined)?.pageId;
          if (!pageId) {
            break;
          }
          setPages(prev => {
            const idx = prev.findIndex(p => p.id === pageId);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = {
                ...updated[idx],
                isLoading: true
              };
              return updated;
            }
            return prev
          });
          break;
        }
        case "data-generation": {
          const generationData = data as GenerationStreamData | undefined;
          if (generationData?.status === "error") {
            setPages((prev) =>
              prev.flatMap((page) => {
                if (page.isTemporary) {
                  return []
                }

                if (!page.isLoading) {
                  return [page]
                }

                return [{
                  ...page,
                  isLoading: false,
                }]
              })
            )
          }

          if (generationData?.status === "canceled") {
            setPages((prev) =>
              prev.flatMap((page) => {
                if (page.isTemporary) {
                  return []
                }

                if (!page.isLoading) {
                  return [page]
                }

                return [{
                  ...page,
                  isLoading: false
                }]
              })
            )
          }

          break;
        }
      }
    },
    onError: (error) => {
      console.log(error)
      setPages((prev) =>
        prev.flatMap((page) => {
          if (page.isTemporary) {
            return []
          }

          if (!page.isLoading) {
            return [page]
          }

          return [{
            ...page,
            isLoading: false,
          }]
        })
      )
      toast.error(error.message || "Failed to generate response")
    }
  })

  // Sync messages when data is initially loaded
  // We use a ref to track the last synced slugId to ensure we only sync once per project,
  const lastSyncedSlug = useRef<string | null>(null);

  useEffect(() => {
      if (projectData && slugId !== lastSyncedSlug.current) {
          queueMicrotask(() => {
            if (projectData.messages) setMessages(projectData.messages);
            if (projectData.pages) {
              setPages(projectData.pages);
              setPageLayouts(normalizePageLayouts(projectData.pages, {}))
            }
          })
          lastSyncedSlug.current = slugId;
          setPastSnapshots([])
          setFutureSnapshots([])
          historyMetaRef.current = { lastKind: null, lastAt: 0 }
      }
  }, [projectData, slugId, setMessages]);


  useEffect(() => {
    const checkReset = () => {
      if (window.location.pathname === "/" && (hasStarted || isProjectPage)) {
        setSlugId(generateSlugId());
        setMessages([])
        setHasStarted(false)
        setProjectTitle(null)
        setPageLayouts({})
        setToolMode(TOOL_MODE_ENUM.SELECT)
        setPastSnapshots([])
        setFutureSnapshots([])
      }
    }

    window.addEventListener("popstate", checkReset)

    if (pathname === "/" && hasStarted) {
      checkReset()
    }

    return () => window.removeEventListener("popstate",
      checkReset
    )
  }, [pathname, hasStarted, isProjectPage, setMessages])

  const { selectedPageId, setSelectedPageId } = useCanvas()
  const historyMetaRef = useRef<{ lastKind: string | null; lastAt: number }>({
    lastKind: null,
    lastAt: 0,
  })
  const currentSnapshotRef = useRef<EditorSnapshot>({
    input: "",
    selectedPageId: null,
    toolMode: TOOL_MODE_ENUM.SELECT,
    pageLayouts: {},
  })

  const isLoading = status === "submitted" || status === "streaming"
  const captureSnapshot = (
    overrides: Partial<EditorSnapshot> = {}
  ): EditorSnapshot => ({
    input,
    selectedPageId,
    toolMode,
    pageLayouts: normalizePageLayouts(pages, pageLayouts),
    ...overrides,
  })

  useEffect(() => {
    currentSnapshotRef.current = captureSnapshot()
  }, [input, pageLayouts, pages, selectedPageId, toolMode])

  useEffect(() => {
    setPageLayouts((prev) => normalizePageLayouts(pages, prev))
  }, [pages])

  const applySnapshot = (snapshot: EditorSnapshot) => {
    setInput(snapshot.input)
    void setSelectedPageId(snapshot.selectedPageId)
    setToolMode(snapshot.toolMode)
    setPageLayouts(snapshot.pageLayouts)
  }

  const commitSnapshot = (
    nextSnapshot: EditorSnapshot,
    kind: string,
    mergeWindowMs = 0
  ) => {
    const currentSnapshot = currentSnapshotRef.current
    if (snapshotsEqual(currentSnapshot, nextSnapshot)) {
      return
    }

    const now = Date.now()
    const shouldMerge = mergeWindowMs > 0
      && historyMetaRef.current.lastKind === kind
      && now - historyMetaRef.current.lastAt < mergeWindowMs

    if (!shouldMerge) {
      setPastSnapshots((prev) => [...prev, currentSnapshot].slice(-MAX_HISTORY_ENTRIES))
    }

    setFutureSnapshots([])
    historyMetaRef.current = { lastKind: kind, lastAt: now }
    applySnapshot(nextSnapshot)
  }

  const undoHistory = () => {
    setPastSnapshots((prev) => {
      const previousSnapshot = prev.at(-1)
      if (!previousSnapshot) {
        return prev
      }

      const currentSnapshot = currentSnapshotRef.current
      setFutureSnapshots((future) => [currentSnapshot, ...future].slice(0, MAX_HISTORY_ENTRIES))
      historyMetaRef.current = { lastKind: null, lastAt: 0 }
      applySnapshot(previousSnapshot)
      return prev.slice(0, -1)
    })
  }

  const redoHistory = () => {
    setFutureSnapshots((prev) => {
      const nextSnapshot = prev[0]
      if (!nextSnapshot) {
        return prev
      }

      const currentSnapshot = currentSnapshotRef.current
      setPastSnapshots((past) => [...past, currentSnapshot].slice(-MAX_HISTORY_ENTRIES))
      historyMetaRef.current = { lastKind: null, lastAt: 0 }
      applySnapshot(nextSnapshot)
      return prev.slice(1)
    })
  }

  const historyControls: EditorHistoryControls = {
    canUndo: pastSnapshots.length > 0,
    canRedo: futureSnapshots.length > 0,
    undo: undoHistory,
    redo: redoHistory,
  }

  const handleInputChange = (nextInput: string) => {
    commitSnapshot(
      captureSnapshot({ input: nextInput }),
      "prompt",
      PROMPT_HISTORY_MERGE_WINDOW_MS
    )
  }

  const updateSelectedPage = (nextPageId: string | null, historyKind = "page-selection") => {
    commitSnapshot(captureSnapshot({ selectedPageId: nextPageId }), historyKind)
  }

  const updateToolMode = (nextToolMode: ToolModeType) => {
    commitSnapshot(captureSnapshot({ toolMode: nextToolMode }), "canvas-tool")
  }

  const handlePageLayoutCommit = (pageId: string, nextLayout: CanvasPageLayout) => {
    const nextPageLayouts = {
      ...normalizePageLayouts(pages, pageLayouts),
      [pageId]: nextLayout,
    }

    commitSnapshot(
      captureSnapshot({ pageLayouts: nextPageLayouts }),
      `canvas-layout:${pageId}`
    )
  }

  const onSubmit = async (
    message: PromptInputMessage,
    options: Record<string, unknown> = {}
  ) => {

    if (!message.text.trim()) {
      toast.error("Please enter a message")
      return
    }

    if (!isProjectPage && !hasStarted) {
      window.history.pushState(null, "", `/project/${slugId}`);
      setHasStarted(true)
    }

    const serializedFiles = await serializeFilesForTransport(message.files)

    sendMessage(
      {
        text: message.text,
        files: serializedFiles
      },
      {
        body: {
          ...options,
          idempotencyKey: crypto.randomUUID().replace(/-/g, "_"),
          contentDepth,
          creativityLevel,
          generationPlatform,
          generationMode,
          layoutComplexity,
          modelProvider,
          styleIntensity,
          slugId
        }
      }
    )

    setInput("")
  }

  const handleBack = () => {
    if (!isProjectPage) {
      setSlugId(generateSlugId());
      setHasStarted(false);
      setMessages([]);
      setProjectTitle(null)
      setPageLayouts({})
      setToolMode(TOOL_MODE_ENUM.SELECT)
      setPastSnapshots([])
      setFutureSnapshots([])
    }
    router.push("/");
  }

  const selectedPage = pages.find((p) => p.id === selectedPageId);
  const pageCount = pages.length

  useEffect(() => {
    if (pageCount > 0) {
      setActiveCompactPane("canvas")
    }
  }, [pageCount])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) {
        return
      }

      if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        if (event.key.toLowerCase() === "c" && !isEditableTarget(event.target)) {
          if (focusChatInput()) {
            event.preventDefault()
          }
          return
        }

        if ((event.key === "[" || event.key === "]") && pages.length > 0 && !isEditableTarget(event.target)) {
          event.preventDefault()

          const currentIndex = pages.findIndex((page) => page.id === selectedPageId)
          const fallbackIndex = event.key === "]" ? 0 : pages.length - 1
          const nextIndex = currentIndex === -1
            ? fallbackIndex
            : (currentIndex + (event.key === "]" ? 1 : -1) + pages.length) % pages.length

          updateSelectedPage(pages[nextIndex]?.id ?? null, "page-navigation")
          return
        }
      }

      if ((event.metaKey || event.ctrlKey) && !event.altKey) {
        const key = event.key.toLowerCase()
        if (key === "z" && !event.shiftKey) {
          event.preventDefault()
          undoHistory()
          return
        }

        if (key === "y" || (key === "z" && event.shiftKey)) {
          event.preventDefault()
          redoHistory()
          return
        }
      }

      if (event.key === "Escape") {
        const activeElement = document.activeElement
        if (activeElement instanceof HTMLElement && activeElement.dataset.chatInput === "true") {
          activeElement.blur()
          event.preventDefault()
          return
        }

        if (selectedPageId) {
          updateSelectedPage(null, "page-selection-clear")
          event.preventDefault()
          return
        }

        if (isLoading) {
          stop()
          event.preventDefault()
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown)
    return () => document.removeEventListener("keydown", handleKeyDown)
  }, [isLoading, pages, selectedPageId, stop])

  if (!isProjectPage && !hasStarted) {
    return (
      <NewProjectChat
        input={input}
        setInput={handleInputChange}
        contentDepth={contentDepth}
        creativityLevel={creativityLevel}
        generationPlatform={generationPlatform}
        generationMode={generationMode}
        layoutComplexity={layoutComplexity}
        modelProvider={modelProvider}
        styleIntensity={styleIntensity}
        setContentDepth={setContentDepth}
        setCreativityLevel={setCreativityLevel}
        setGenerationPlatform={setGenerationPlatform}
        setGenerationMode={setGenerationMode}
        setLayoutComplexity={setLayoutComplexity}
        setModelProvider={setModelProvider}
        setStyleIntensity={setStyleIntensity}
        isLoading={isLoading}
        status={status}
        onStop={stop}
        onSubmit={onSubmit}
      />
    )
  }

  if (isProjectPage && isProjectError) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <ErrorState
          className="max-w-xl"
          title="Project unavailable"
          description={projectError.message}
          actionLabel="Retry"
          onAction={() => refetchProject()}
          secondaryActionLabel="Back to home"
          onSecondaryAction={() => router.push("/")}
        />
      </div>
    )
  }


  return (
    <div className="flex h-[100dvh] w-full flex-col overflow-hidden lg:flex-row">
      <div className="border-b border-border bg-background/95 px-3 py-2 backdrop-blur md:px-4 lg:hidden">
        <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 p-1">
          <Button
            variant={activeCompactPane === "chat" ? "default" : "ghost"}
            size="sm"
            className="flex-1 rounded-full"
            onClick={() => setActiveCompactPane("chat")}
          >
            <LayoutPanelLeft className="size-4" />
            Chat
          </Button>
          <Button
            variant={activeCompactPane === "canvas" ? "default" : "ghost"}
            size="sm"
            className="flex-1 rounded-full"
            onClick={() => setActiveCompactPane("canvas")}
          >
            <MonitorSmartphone className="size-4" />
            Canvas {pageCount > 0 ? `(${pageCount})` : ""}
          </Button>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)] md:grid-rows-[minmax(320px,42svh)_minmax(0,1fr)] lg:flex lg:min-w-0">
      <div
        className={`relative min-h-0 border-border bg-background
        md:border-b lg:flex lg:h-full lg:w-full lg:max-w-md lg:border-b-0 lg:border-r
        ${activeCompactPane === "canvas" ? "hidden md:flex" : "flex"}`}
      >
        {/* {ProjectTitle} */}
        <div className="absolute left-0 top-0 z-10 w-full bg-background/95 pb-2
        backdrop-blur
        ">
          <div role="button"
            className="flex items-center gap-2 px-3 pt-2 cursor-pointer! md:px-4"
            onClick={handleBack}
          >
            <Button variant="secondary"
              size="icon"
            >
              <ArrowLeft />
            </Button>
          <h5 className="font-semibold tracking-tight
            truncate pr-4 text-sm md:text-base">
              {projectTitle || projectData?.title || "Untitled Project"}
            </h5>
          </div>
        </div>

        <ChatPanel
          className="h-full pt-12 md:pt-13"
          messages={messages}
          input={input}
          setInput={handleInputChange}
          contentDepth={contentDepth}
          creativityLevel={creativityLevel}
          generationPlatform={generationPlatform}
          generationMode={generationMode}
          layoutComplexity={layoutComplexity}
          modelProvider={modelProvider}
          styleIntensity={styleIntensity}
          setContentDepth={setContentDepth}
          setCreativityLevel={setCreativityLevel}
          setGenerationPlatform={setGenerationPlatform}
          setGenerationMode={setGenerationMode}
          setLayoutComplexity={setLayoutComplexity}
          setModelProvider={setModelProvider}
          setStyleIntensity={setStyleIntensity}
          isLoading={isLoading}
          isProjectLoading={isProjectLoading}
          selectedPage={selectedPage}
          status={status}
          error={error}
          onClearSelectedPage={() => updateSelectedPage(null, "page-selection-clear")}
          onStop={stop}
          onSubmit={onSubmit}
        />
      </div>

      <div
        className={`min-h-0 min-w-0 bg-background lg:flex-1
        ${activeCompactPane === "chat" ? "hidden md:block" : "block"}`}
      >
        <Canvas
          pages={pages}
          setPages={setPages}
          slugId={slugId}
          isProjectLoading={isProjectLoading}
          pageLayouts={pageLayouts}
          selectedPageId={selectedPageId}
          setSelectedPageId={(pageId) => updateSelectedPage(pageId)}
          toolMode={toolMode}
          setToolMode={updateToolMode}
          onPageLayoutCommit={handlePageLayoutCommit}
          history={historyControls}
          onPagesChange={setPages}
          onSelectPage={(pageId) => updateSelectedPage(pageId)}
        />
      </div>
      </div>
    </div>
  )
}

export default ChatInterface
