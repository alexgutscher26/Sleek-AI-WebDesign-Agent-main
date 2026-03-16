import { ChatStatus } from "ai";
import React, { useState } from "react";
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputBody,
  PromptInputFooter,
  PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
} from "../ai-elements/prompt-input";
import { SignInButton, SignUpButton, useAuth } from "@clerk/nextjs";
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "../ui/item";
import { ArrowUpIcon, LockIcon, Square, XIcon } from "lucide-react";
import { Button } from "../ui/button";
import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from "../ai-elements/attachments";
import { PageType } from "@/types/project";
import { Badge } from "../ui/badge";
import { ALLOWED_FILE_ACCEPT, MAX_FILE_SIZE_BYTES } from "@/lib/request-limits";
import { toast } from "sonner";
import { CONTENT_DEPTHS, DEFAULT_CONTENT_DEPTH, type ContentDepth } from "@/constants/content-depth";
import { CREATIVITY_LEVELS, DEFAULT_CREATIVITY_LEVEL, type CreativityLevel } from "@/constants/creativity-level";
import { DEFAULT_GENERATION_PLATFORM, GENERATION_PLATFORMS, type GenerationPlatform } from "@/constants/generation-platform";
import { DEFAULT_GENERATION_MODE, GENERATION_MODES, type GenerationMode } from "@/constants/generation-mode";
import { DEFAULT_LAYOUT_COMPLEXITY, LAYOUT_COMPLEXITIES, type LayoutComplexity } from "@/constants/layout-complexity";
import { DEFAULT_MODEL_PROVIDER, MODEL_PROVIDERS, type ModelProvider } from "@/constants/model-provider";
import { DEFAULT_STYLE_INTENSITY, STYLE_INTENSITIES, type StyleIntensity } from "@/constants/style-intensity";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";

type ChatInputProps = {
  contentDepth: ContentDepth;
  creativityLevel: CreativityLevel;
  generationPlatform: GenerationPlatform;
  generationMode: GenerationMode;
  layoutComplexity: LayoutComplexity;
  modelProvider: ModelProvider;
  styleIntensity: StyleIntensity;
  input: string;
  isLoading: boolean;
  status: ChatStatus;
  controlsPosition?: "inside" | "below";
  selectedPage?: PageType;
  setContentDepth: (depth: ContentDepth) => void;
  setCreativityLevel: (level: CreativityLevel) => void;
  setGenerationPlatform: (platform: GenerationPlatform) => void;
  setGenerationMode: (mode: GenerationMode) => void;
  setLayoutComplexity: (complexity: LayoutComplexity) => void;
  setModelProvider: (provider: ModelProvider) => void;
  setStyleIntensity: (intensity: StyleIntensity) => void;
  setInput: (input: string) => void;
  onClearSelectedPage: () => void;
  onStop: () => void;
  onSubmit: (message: PromptInputMessage, options?: Record<string, unknown>) => void;
};

const ChatInput = ({
  contentDepth,
  creativityLevel,
  generationPlatform,
  generationMode,
  layoutComplexity,
  modelProvider,
  styleIntensity,
  input,
  isLoading,
  status,
  controlsPosition = "inside",
  selectedPage,
  setContentDepth,
  setCreativityLevel,
  setGenerationPlatform,
  setGenerationMode,
  setLayoutComplexity,
  setModelProvider,
  setStyleIntensity,
  setInput,
  onClearSelectedPage,
  onStop,
  onSubmit,
}: ChatInputProps) => {
  const { isSignedIn } = useAuth();
  const [showAuthBanner, setShowAuthBanner] = useState(false);

  const handleSubmit = (message: PromptInputMessage) => {
    if (!isSignedIn) {
      setShowAuthBanner(true);
      return;
    }

    setShowAuthBanner(false);
    onSubmit(message, {
      contentDepth,
      creativityLevel,
      generationPlatform,
      generationMode,
      layoutComplexity,
      modelProvider,
      styleIntensity,
      selectedPageId: selectedPage?.id,
    });
    onClearSelectedPage();
  };

  return (
    <div className="w-full flex flex-col gap-2">
      {showAuthBanner && (
        <Item
          variant="outline"
          size="sm"
          className="border-amber-200 bg-amber-50 py-2 animate-in fade-in slide-in-from-bottom-2 duration-200 dark:border-amber-800/30 dark:bg-amber-950/40"
        >
          <ItemMedia variant="icon" className="bg-transparent">
            <LockIcon className="size-4" />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className="text-sm">Sign in to continue</ItemTitle>
            <ItemDescription>
              Create a free account to start designing with Sleek.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <SignInButton>
              <Button variant="outline" size="sm">
                Login
              </Button>
            </SignInButton>
            <SignUpButton>
              <Button size="sm">Sign up</Button>
            </SignUpButton>
            <Button size="icon" variant="ghost" onClick={() => setShowAuthBanner(false)}>
              <XIcon className="size-3.5" />
            </Button>
          </ItemActions>
        </Item>
      )}

      <PromptInput
        accept={ALLOWED_FILE_ACCEPT}
        globalDrop
        className="rounded-xl! border bg-background shadow-md"
        maxFileSize={MAX_FILE_SIZE_BYTES}
        onSubmit={handleSubmit}
        onError={(err) => toast.error(err.message)}
      >
        {selectedPage && (
          <div className="w-full px-2 pt-2">
            <Badge variant="secondary" className="text-xs">
              {selectedPage.name} Page
              <button onClick={onClearSelectedPage}>
                <XIcon className="size-3.5" />
              </button>
            </Badge>
          </div>
        )}

        {controlsPosition === "inside" ? (
          <GenerationControls
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
          />
        ) : null}

        <PromptInputAttachmentsDisplay />
        <PromptInputBody>
          <PromptInputTextarea
            data-chat-input="true"
            onChange={(e) => setInput(e.target.value)}
            value={input}
            placeholder="Describe your design vision..."
            className="pt-5"
          />
        </PromptInputBody>
        <PromptInputFooter>
          <PromptInputTools>
            <PromptInputActionMenu>
              <PromptInputActionMenuTrigger />
              <PromptInputActionMenuContent>
                <PromptInputActionAddAttachments />
              </PromptInputActionMenuContent>
            </PromptInputActionMenu>
          </PromptInputTools>

          {isLoading ? (
            <StopButton onStop={onStop} />
          ) : (
            <PromptInputSubmit
              status={status}
              disabled={!input.trim() || isLoading}
              className="absolute right-2 bottom-1.5 rounded-full"
            >
              <ArrowUpIcon size={25} />
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>

      {controlsPosition === "below" ? (
        <GenerationControls
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
          className="rounded-[1.5rem] border border-border/60 bg-background/60 p-3 shadow-[0_20px_60px_-42px_rgba(0,0,0,0.85)] backdrop-blur"
        />
      ) : null}
    </div>
  );
};

type GenerationControlsProps = {
  contentDepth: ContentDepth;
  creativityLevel: CreativityLevel;
  generationPlatform: GenerationPlatform;
  generationMode: GenerationMode;
  layoutComplexity: LayoutComplexity;
  modelProvider: ModelProvider;
  styleIntensity: StyleIntensity;
  setContentDepth: (depth: ContentDepth) => void;
  setCreativityLevel: (level: CreativityLevel) => void;
  setGenerationPlatform: (platform: GenerationPlatform) => void;
  setGenerationMode: (mode: GenerationMode) => void;
  setLayoutComplexity: (complexity: LayoutComplexity) => void;
  setModelProvider: (provider: ModelProvider) => void;
  setStyleIntensity: (intensity: StyleIntensity) => void;
  className?: string;
};

const GenerationControls = ({
  contentDepth,
  creativityLevel,
  generationPlatform,
  generationMode,
  layoutComplexity,
  modelProvider,
  styleIntensity,
  setContentDepth,
  setCreativityLevel,
  setGenerationPlatform,
  setGenerationMode,
  setLayoutComplexity,
  setModelProvider,
  setStyleIntensity,
  className,
}: GenerationControlsProps) => {
  const selectedContentDepth = CONTENT_DEPTHS.find((level) => level.value === contentDepth);
  const selectedCreativity = CREATIVITY_LEVELS.find((level) => level.value === creativityLevel);
  const selectedPlatform = GENERATION_PLATFORMS.find((platform) => platform.value === generationPlatform);
  const selectedMode = GENERATION_MODES.find((mode) => mode.value === generationMode);
  const selectedLayoutComplexity = LAYOUT_COMPLEXITIES.find((level) => level.value === layoutComplexity);
  const selectedProvider = MODEL_PROVIDERS.find((provider) => provider.value === modelProvider);
  const selectedIntensity = STYLE_INTENSITIES.find((intensity) => intensity.value === styleIntensity);

  return (
    <div className={`flex flex-wrap items-start justify-between gap-3 px-2 pt-2 ${className ?? ""}`}>
      <div className="px-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Generation Controls
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Select value={contentDepth} onValueChange={(value) => setContentDepth(value as ContentDepth)}>
          <SelectTrigger className="h-8 min-w-34 max-w-40 rounded-full border-border/70 bg-muted/30 text-xs">
            <SelectValue placeholder={DEFAULT_CONTENT_DEPTH}>
              {selectedContentDepth?.label ?? DEFAULT_CONTENT_DEPTH}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {CONTENT_DEPTHS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div className="flex flex-col">
                  <span>{level.label}</span>
                  <span className="text-[11px] text-muted-foreground">{level.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={modelProvider} onValueChange={(value) => setModelProvider(value as ModelProvider)}>
          <SelectTrigger className="h-8 min-w-36 max-w-44 rounded-full border-border/70 bg-muted/30 text-xs">
            <SelectValue placeholder={DEFAULT_MODEL_PROVIDER}>
              {selectedProvider?.label ?? DEFAULT_MODEL_PROVIDER}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {MODEL_PROVIDERS.map((provider) => (
              <SelectItem key={provider.value} value={provider.value}>
                <div className="flex flex-col">
                  <span>{provider.label}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {provider.latencyHint} · {provider.costHint}
                  </span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={creativityLevel} onValueChange={(value) => setCreativityLevel(value as CreativityLevel)}>
          <SelectTrigger className="h-8 min-w-34 max-w-40 rounded-full border-border/70 bg-muted/30 text-xs">
            <SelectValue placeholder={DEFAULT_CREATIVITY_LEVEL}>
              {selectedCreativity?.label ?? DEFAULT_CREATIVITY_LEVEL}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {CREATIVITY_LEVELS.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div className="flex flex-col">
                  <span>{level.label}</span>
                  <span className="text-[11px] text-muted-foreground">{level.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={generationMode} onValueChange={(value) => setGenerationMode(value as GenerationMode)}>
          <SelectTrigger className="h-8 min-w-34 max-w-40 rounded-full border-border/70 bg-muted/30 text-xs">
            <SelectValue placeholder={DEFAULT_GENERATION_MODE}>
              {selectedMode?.label ?? DEFAULT_GENERATION_MODE}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {GENERATION_MODES.map((mode) => (
              <SelectItem key={mode.value} value={mode.value}>
                <div className="flex flex-col">
                  <span>{mode.label}</span>
                  <span className="text-[11px] text-muted-foreground">{mode.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={generationPlatform}
          onValueChange={(value) => setGenerationPlatform(value as GenerationPlatform)}
          disabled={generationMode !== "mobile-app"}
        >
          <SelectTrigger className="h-8 min-w-36 max-w-44 rounded-full border-border/70 bg-muted/30 text-xs disabled:opacity-50">
            <SelectValue placeholder={DEFAULT_GENERATION_PLATFORM}>
              {selectedPlatform?.label ?? DEFAULT_GENERATION_PLATFORM}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {GENERATION_PLATFORMS.map((platform) => (
              <SelectItem key={platform.value} value={platform.value}>
                <div className="flex flex-col">
                  <span>{platform.label}</span>
                  <span className="text-[11px] text-muted-foreground">{platform.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={layoutComplexity} onValueChange={(value) => setLayoutComplexity(value as LayoutComplexity)}>
          <SelectTrigger className="h-8 min-w-34 max-w-40 rounded-full border-border/70 bg-muted/30 text-xs">
            <SelectValue placeholder={DEFAULT_LAYOUT_COMPLEXITY}>
              {selectedLayoutComplexity?.label ?? DEFAULT_LAYOUT_COMPLEXITY}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {LAYOUT_COMPLEXITIES.map((level) => (
              <SelectItem key={level.value} value={level.value}>
                <div className="flex flex-col">
                  <span>{level.label}</span>
                  <span className="text-[11px] text-muted-foreground">{level.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={styleIntensity} onValueChange={(value) => setStyleIntensity(value as StyleIntensity)}>
          <SelectTrigger className="h-8 min-w-34 max-w-40 rounded-full border-border/70 bg-muted/30 text-xs">
            <SelectValue placeholder={DEFAULT_STYLE_INTENSITY}>
              {selectedIntensity?.label ?? DEFAULT_STYLE_INTENSITY}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {STYLE_INTENSITIES.map((intensity) => (
              <SelectItem key={intensity.value} value={intensity.value}>
                <div className="flex flex-col">
                  <span>{intensity.label}</span>
                  <span className="text-[11px] text-muted-foreground">{intensity.description}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null;
  }

  return (
    <Attachments
      variant="grid"
      className="ml-0 flex h-auto min-h-20 w-full flex-nowrap justify-start overflow-x-auto px-4 pt-4"
    >
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          className="size-15 shrink-0"
          onRemove={() => attachments.remove(attachment.id)}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  );
};

const StopButton = ({ onStop }: { onStop: () => void }) => {
  return (
    <Button
      size="icon"
      className="cursor-pointer rounded-full border !bg-muted dark:!bg-black"
      onClick={onStop}
    >
      <Square fill="black" size={14} className="text-black dark:text-white" />
    </Button>
  );
};

export default ChatInput;
