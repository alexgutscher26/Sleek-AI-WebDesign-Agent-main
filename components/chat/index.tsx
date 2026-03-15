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
import { ArrowLeft } from "lucide-react";
import ChatPanel from "./chat-panel";
import Canvas from "./canvas";
import { PageType } from "@/types/project";
import { useQuery } from "@tanstack/react-query";
import { useCanvas } from "@/hooks/use-canvas";
import { ErrorState } from "../ui/view-state";

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
}

type StreamPageCreated = {
  id: string;
  name: string;
  rootStyles: string;
  htmlContent: string;
  error?: string;
}

type GenerationStreamData = {
  status?: "error" | "canceled" | string;
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
  const [hasStarted, setHasStarted] = useState(isProjectPage);
  const [projectTitle, setProjectTitle] = useState<string | null>(null)
  const [pages, setPages] = useState<PageType[]>([]);

  const {
    data: projectData,
    isLoading: isProjectLoading,
    isError: isProjectError,
    error: projectError,
    refetch: refetchProject,
  } = useQuery({
    queryKey: ["project", slugId],
    queryFn: async () => {
      const res = await fetch(`/api/project/${slugId}`);
      if (!res.ok) {
        const payload = await res.json().catch(() => null) as {
          error?: { code?: string; message?: string }
        } | null;

        const message = payload?.error?.code === "PROJECT_NOT_FOUND"
          ? "This project could not be found."
          : payload?.error?.code === "UNAUTHORIZED"
            ? "Please sign in to access this project."
            : payload?.error?.message || "Failed to fetch project.";

        throw new Error(message);
      }

      const payload = await res.json() as {
        success: true;
        data: { title: string; messages: UIMessage[]; pages: PageType[] }
      }
      return payload.data
    },
  enabled: isProjectPage, // Only fetch on project page
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
            isLoading: true
          }))
          setPages((prev) => {
            const existingIds = new Set(prev.map(p => p.id));
            const toAdd = newPages.filter((page) => !existingIds.has(page.id));
            return [...prev, ...toAdd]
          })
          break;
        }

        case "data-page-created": {
          const page = (data as { page: StreamPageCreated }).page
          const tempId = (data as { tempId?: string }).tempId
          setPages((prev) => {
            const idx = prev.findIndex(p => p.id === tempId ||
              p.id === page.id
            )
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = {
                ...page,
                isLoading: false
              };
              return updated;
            }
            return [...prev, {
              ...page,
              isLoading: false
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
              prev.map((page) =>
                page.isLoading
                  ? {
                    ...page,
                    isLoading: false,
                    error: "This page could not be generated. Try sending the request again.",
                  }
                  : page
              )
            )
          }

          if (generationData?.status === "canceled") {
            setPages((prev) => prev.filter((page) => !page.isLoading))
          }

          break;
        }
      }
    },
    onError: (error) => {
      console.log(error)
      setPages((prev) =>
        prev.map((page) =>
          page.isLoading
            ? {
              ...page,
              isLoading: false,
              error: "This page could not be generated because the request failed.",
            }
            : page
        )
      )
      toast.error("Failed to generate response")
    }
  })

  // Sync messages when data is initially loaded
  // We use a ref to track the last synced slugId to ensure we only sync once per project,
  const lastSyncedSlug = useRef<string | null>(null);

  useEffect(() => {
      if (projectData && slugId !== lastSyncedSlug.current) {
          queueMicrotask(() => {
            if (projectData.messages) setMessages(projectData.messages);
            if (projectData.pages) setPages(projectData.pages);
          })
          lastSyncedSlug.current = slugId;
      }
  }, [projectData, slugId, setMessages]);


  useEffect(() => {
    const checkReset = () => {
      if (window.location.pathname === "/" && (hasStarted || isProjectPage)) {
        setSlugId(generateSlugId());
        setMessages([])
        setHasStarted(false)
        setProjectTitle(null)
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



  const { selectedPageId } = useCanvas()

  const isLoading = status === "submitted" || status === "streaming"

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

    sendMessage(
      {
        text: message.text,
        files: message.files
      },
      {
        body: {
          ...options,
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
    }
    router.push("/");
  }

  if (!isProjectPage && !hasStarted) {
    return (
      <NewProjectChat
        input={input}
        setInput={setInput}
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


  const selectedPage = pages.find((p) => p.id === selectedPageId);


  return (
    <div className="flex h-screen w-full overflow-hidden">
      <div className="flex relative w-full max-w-md border-r
      border-border
      ">
        {/* {ProjectTitle} */}
        <div className="w-full absolute left-0 top-0 z-10 pb-2
        bg-background
        ">
          <div role="button"
            className="flex items-center gap-2 cursor-pointer!"
            onClick={handleBack}
          >
            <Button variant="secondary"
              size="icon"
            >
              <ArrowLeft />
            </Button>
          <h5 className="font-semibold tracking-tight
            truncate pr-4">
              {projectTitle || projectData?.title || "Untitled Project"}
            </h5>
          </div>
        </div>

        <ChatPanel
          className="h-full pt-8"
          messages={messages}
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          isProjectLoading={isProjectLoading}
          selectedPage={selectedPage}
          status={status}
          error={error}
          onStop={stop}
          onSubmit={onSubmit}
        />
      </div>

      <div className="flex-1">
        <Canvas
          pages={pages}
          setPages={setPages}
          slugId={slugId}
          isProjectLoading={isProjectLoading}
        />
      </div>
    </div>
  )
}

export default ChatInterface
