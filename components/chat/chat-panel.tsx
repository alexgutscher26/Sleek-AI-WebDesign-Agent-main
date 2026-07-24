import type { ContentDepth } from "@/constants/content-depth"
import type { CreativityLevel } from "@/constants/creativity-level"
import type { GenerationMode } from "@/constants/generation-mode"
import type { GenerationPlatform } from "@/constants/generation-platform"
import type { LayoutComplexity } from "@/constants/layout-complexity"
import type { ModelProvider } from "@/constants/model-provider"
import type { StyleIntensity } from "@/constants/style-intensity"
import { PageType } from "@/types/project"
import { ChatStatus, UIMessage } from "ai"
import { AlertCircleIcon, CheckCircle2, Circle } from "lucide-react"
import { Attachment, AttachmentPreview, Attachments } from "../ai-elements/attachments"
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "../ai-elements/conversation"
import { Message, MessageContent, MessageResponse } from "../ai-elements/message"
import { PromptInputMessage } from "../ai-elements/prompt-input"
import { Loader } from "../ui/loader"
import { Spinner } from "../ui/spinner"
import { ErrorState, LoadingState } from "../ui/view-state"
import ChatInput from "./chat-input"

type PropsType = {
  className?: string
  contentDepth: ContentDepth
  creativityLevel: CreativityLevel
  generationPlatform: GenerationPlatform
  generationMode: GenerationMode
  layoutComplexity: LayoutComplexity
  modelProvider: ModelProvider
  styleIntensity: StyleIntensity
  input: string
  isLoading: boolean
  isProjectLoading?: boolean | undefined
  setContentDepth: (depth: ContentDepth) => void
  setCreativityLevel: (level: CreativityLevel) => void
  setGenerationPlatform: (platform: GenerationPlatform) => void
  setGenerationMode: (mode: GenerationMode) => void
  setLayoutComplexity: (complexity: LayoutComplexity) => void
  setModelProvider: (provider: ModelProvider) => void
  setStyleIntensity: (intensity: StyleIntensity) => void
  setInput: (input: string) => void
  messages: UIMessage[]
  error?: Error | undefined
  onStop: () => void
  onSubmit: (message: PromptInputMessage, options?: Record<string, unknown>) => void
  onClearSelectedPage: () => void
  status: ChatStatus
  selectedPage?: PageType | undefined
}

type GenerationCardData = {
  status: "analyzing" | "generating" | "regenerating" | "canceled" | "complete" | "error"
  pages: { id: string; name: string; done: boolean }[]
  currentPageId?: string
  regeneratePage?: { id: string; name: string; done: boolean } | undefined
}

const ChatPanel = ({
  className,
  contentDepth,
  creativityLevel,
  generationPlatform,
  generationMode,
  layoutComplexity,
  modelProvider,
  styleIntensity,
  input,
  isLoading,
  setInput,
  setContentDepth,
  setCreativityLevel,
  setGenerationPlatform,
  setGenerationMode,
  setLayoutComplexity,
  setModelProvider,
  setStyleIntensity,
  messages,
  onStop,
  onSubmit,
  onClearSelectedPage,
  status,
  error,
  isProjectLoading,
  selectedPage,
}: PropsType) => {
  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <Conversation className={className}>
        <ConversationContent>
          {isProjectLoading ? (
            <LoadingState
              className="min-h-[320px]"
              title="Loading conversation"
              description="Pulling in your messages and generated pages."
            />
          ) : messages.length === 0 ? (
            <ConversationEmptyState
              title="No messages yet"
              description="Describe the site you want to build to start generating pages."
            />
          ) : (
            messages?.map((message) => {
              const attachmentsFromMessage = message.parts.filter((part) => part.type === "file")
              return (
                <Message from={message.role} key={message.id}>
                  <MessageContent className="text-[14.5px]">
                    {attachmentsFromMessage.length > 0 && (
                      <Attachments variant="grid">
                        {attachmentsFromMessage.map((part, i) => {
                          const id = `${message.id}-file-${i}`
                          const attachmentData = { ...part, id }
                          return (
                            <Attachment
                              data={attachmentData}
                              key={id}
                              className="border-primary/10 size-20"
                            >
                              <AttachmentPreview />
                            </Attachment>
                          )
                        })}
                      </Attachments>
                    )}

                    {message.parts.map((part, i) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <div key={`${message.id}-text-${i}`} className="flex items-start gap-2">
                              <MessageResponse>{part.text}</MessageResponse>
                            </div>
                          )
                        case "data-generation": {
                          const data = (part as { data: GenerationCardData }).data
                          return (
                            <GenerationCard
                              key={`${message.id}-gen-${i}`}
                              status={data.status}
                              pages={data.pages}
                              currentPageId={data.currentPageId}
                              regeneratePage={data.regeneratePage}
                            />
                          )
                        }

                        default:
                          return null
                      }
                    })}
                  </MessageContent>
                </Message>
              )
            })
          )}

          {isLoading ? (
            <div className="px-2">
              <Loader />
            </div>
          ) : null}

          {status === "error" && error && (
            <ErrorState
              className="min-h-[unset] px-4 py-5"
              title="Chat error"
              description={error.message || "Something went wrong while generating a response."}
            />
          )}
        </ConversationContent>
      </Conversation>

      <div className="bg-background border-t p-3 md:p-4">
        <ChatInput
          input={input}
          contentDepth={contentDepth}
          creativityLevel={creativityLevel}
          generationPlatform={generationPlatform}
          generationMode={generationMode}
          layoutComplexity={layoutComplexity}
          modelProvider={modelProvider}
          styleIntensity={styleIntensity}
          isLoading={isLoading}
          status={status}
          selectedPage={selectedPage}
          setContentDepth={setContentDepth}
          setCreativityLevel={setCreativityLevel}
          setGenerationPlatform={setGenerationPlatform}
          setGenerationMode={setGenerationMode}
          setLayoutComplexity={setLayoutComplexity}
          setModelProvider={setModelProvider}
          setStyleIntensity={setStyleIntensity}
          setInput={setInput}
          onClearSelectedPage={onClearSelectedPage}
          onStop={onStop}
          onSubmit={onSubmit}
        />
      </div>
    </div>
  )
}

const GenerationCard = ({
  status,
  pages,
  currentPageId,
  regeneratePage,
}: {
  status: "analyzing" | "generating" | "regenerating" | "canceled" | "complete" | "error"
  pages: { id: string; name: string; done: boolean }[]
  regeneratePage?: { id: string; name: string; done: boolean } | undefined
  currentPageId?: string | undefined
}) => {
  const isComplete = status === "complete"
  const isAnalyzing = status === "analyzing"
  const isCanceled = status === "canceled"
  const isError = status === "error"
  const isRegenerating = status === "regenerating"
  return (
    <div
      className={`animate-in fade-in slide-in-from-bottom-2 mx-2 my-2 flex flex-col gap-3 rounded-xl border p-4 shadow-sm ${
        isError ? "border-destructive/30 bg-destructive/5" : "border-border bg-card"
      }`}
    >
      <div className="flex items-center gap-2 text-sm font-medium">
        {isComplete ? (
          <CheckCircle2 className="size-4 shrink-0 text-green-500" />
        ) : isCanceled ? (
          <AlertCircleIcon className="text-destructive size-4 shrink-0" />
        ) : isError ? (
          <AlertCircleIcon className="text-destructive size-4 shrink-0" />
        ) : (
          <Spinner className="size-4 shrink-0" />
        )}
        <span className={isError ? "text-destructive" : ""}>
          {isAnalyzing
            ? "Analyzing request..."
            : isCanceled
              ? "Generation canceled"
              : isError
                ? "Generation failed"
                : isRegenerating
                  ? `Regenerating ${regeneratePage?.name}...`
                  : isComplete
                    ? regeneratePage
                      ? `Regenerated ${regeneratePage.name}`
                      : `Generated ${pages?.length} pages`
                    : `Generating ${pages?.length} pages...`}
        </span>
      </div>

      {pages?.length > 0 && (
        <div className="flex flex-col gap-2">
          {pages.map((page) => {
            const isGenerating = currentPageId === page.id
            return (
              <div key={page.id} className="flex items-center gap-3 text-sm">
                <div className="flex size-4 shrink-0 items-center justify-center">
                  {page.done ? (
                    <CheckCircle2 className="size-4 text-green-500" />
                  ) : isGenerating ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Circle className="text-muted-foreground/30 size-4" />
                  )}
                </div>
                <span
                  className={
                    page.done
                      ? "text-muted-foreground line-through"
                      : isGenerating
                        ? "text-foreground font-medium"
                        : "text-muted-foreground"
                  }
                >
                  {page.name}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ChatPanel
