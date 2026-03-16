import { ChatStatus } from 'ai';
import React, { useState } from 'react'
import { PromptInput, PromptInputActionAddAttachments, PromptInputActionMenu, PromptInputActionMenuContent, PromptInputActionMenuTrigger, PromptInputBody, PromptInputFooter, PromptInputMessage, PromptInputSubmit, PromptInputTextarea, PromptInputTools, usePromptInputAttachments } from '../ai-elements/prompt-input';
import { SignInButton, SignUpButton, useAuth } from '@insforge/nextjs';
import { Item, ItemActions, ItemContent, ItemDescription, ItemMedia, ItemTitle } from '../ui/item';
import { ArrowUpIcon, LockIcon, Square, XIcon } from 'lucide-react';
import { Button } from '../ui/button';
import { Attachment, AttachmentPreview, AttachmentRemove, Attachments } from '../ai-elements/attachments';
import { PageType } from '@/types/project';
import { useCanvas } from '@/hooks/use-canvas';
import { Badge } from '../ui/badge';
import { ALLOWED_FILE_ACCEPT, MAX_FILE_SIZE_BYTES } from '@/lib/request-limits';
import { toast } from 'sonner';
import { DEFAULT_GENERATION_MODE, GENERATION_MODES, type GenerationMode } from '@/constants/generation-mode';
import { DEFAULT_STYLE_INTENSITY, STYLE_INTENSITIES, type StyleIntensity } from '@/constants/style-intensity';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type ChatInputProps = {
  generationMode: GenerationMode;
  styleIntensity: StyleIntensity;
  input: string;
  isLoading: boolean;
  status: ChatStatus;
  selectedPage?: PageType;
  setGenerationMode: (mode: GenerationMode) => void;
  setStyleIntensity: (intensity: StyleIntensity) => void;
  setInput: (input: string) => void;
  onStop: () => void;
  onSubmit: (message: PromptInputMessage, options?: Record<string, unknown>) => void;
}

const ChatInput = ({
  generationMode,
  styleIntensity,
  input,
  isLoading,
  status,
  selectedPage,
  setGenerationMode,
  setStyleIntensity,
  setInput,
  onStop,
  onSubmit,
}: ChatInputProps) => {
  const { isSignedIn } = useAuth()
  const [showAuthBanner, setShowAuthBanner] = useState(false)

  const { setSelectedPageId } = useCanvas()
  const selectedMode = GENERATION_MODES.find((mode) => mode.value === generationMode)
  const selectedIntensity = STYLE_INTENSITIES.find((intensity) => intensity.value === styleIntensity)

  const handleSubmit = (message: PromptInputMessage) => {
    if (!isSignedIn) {
      setShowAuthBanner(true)
      return
    }

    setShowAuthBanner(false);
    onSubmit(message, {
      generationMode,
      styleIntensity,
      selectedPageId: selectedPage?.id
    });
    setSelectedPageId(null)
  }


  return (
    <div className='w-full flex flex-col gap-2'>

      {showAuthBanner && (
        <Item
          variant="outline"
          size="sm"
          className="py-2
      bg-amber-50 dark:bg-amber-950/40
      border-amber-200 dark:border-amber-800/30
      animate-in fade-in slide-in-from-bottom-2 duration-200"
        >
          <ItemMedia variant="icon" className='bg-transparent'>
            <LockIcon className='size-4' />
          </ItemMedia>
          <ItemContent>
            <ItemTitle className='text-sm'>
              Sign in to continue
            </ItemTitle>
            <ItemDescription>
              Create a free account to start designing with Sleek.
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <SignInButton>
              <Button variant="outline" size="sm">Login</Button>
            </SignInButton>
            <SignUpButton>
              <Button size="sm">Sign up</Button>
            </SignUpButton>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShowAuthBanner(false)}
            >
              <XIcon className="size-3.5" />
            </Button>
          </ItemActions>
        </Item>
      )}



      <PromptInput
        accept={ALLOWED_FILE_ACCEPT}
        globalDrop
        className="rounded-xl! shadow-md bg-background
         border
        "
        maxFileSize={MAX_FILE_SIZE_BYTES}
        onSubmit={handleSubmit}
        onError={(err) => toast.error(err.message)}
      >
        {selectedPage && (
          <div className='px-2 pt-2 w-full'>
            <Badge variant="secondary" className="text-xs">
              {selectedPage.name} Page
              <button onClick={() => setSelectedPageId(null)}>
                <XIcon className="size-3.5" />
              </button>
            </Badge>
          </div>
        )}
        <div className='flex flex-wrap items-start justify-between gap-3 px-2 pt-2'>
          <div className='px-1'>
            <p className='text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground'>
              Generation Controls
            </p>
          </div>
          <div className='flex flex-wrap items-center justify-end gap-2'>
            <Select
              value={generationMode}
              onValueChange={(value) => setGenerationMode(value as GenerationMode)}
            >
              <SelectTrigger className='h-8 min-w-34 max-w-40 rounded-full border-border/70 bg-muted/30 text-xs'>
                <SelectValue placeholder={DEFAULT_GENERATION_MODE}>
                  {selectedMode?.label ?? DEFAULT_GENERATION_MODE}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {GENERATION_MODES.map((mode) => (
                  <SelectItem key={mode.value} value={mode.value}>
                    <div className='flex flex-col'>
                      <span>{mode.label}</span>
                      <span className='text-[11px] text-muted-foreground'>
                        {mode.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={styleIntensity}
              onValueChange={(value) => setStyleIntensity(value as StyleIntensity)}
            >
              <SelectTrigger className='h-8 min-w-34 max-w-40 rounded-full border-border/70 bg-muted/30 text-xs'>
                <SelectValue placeholder={DEFAULT_STYLE_INTENSITY}>
                  {selectedIntensity?.label ?? DEFAULT_STYLE_INTENSITY}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align="end">
                {STYLE_INTENSITIES.map((intensity) => (
                  <SelectItem key={intensity.value} value={intensity.value}>
                    <div className='flex flex-col'>
                      <span>{intensity.label}</span>
                      <span className='text-[11px] text-muted-foreground'>
                        {intensity.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <PromptInputAttachmentsDisplay />
        <PromptInputBody>
          <PromptInputTextarea
            data-chat-input="true"
            onChange={(e) => setInput(e.target.value)}
            value={input}
            placeholder='Describe your design vision...'
            className='pt-5'
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
              className='absolute right-2 rounded-full bottom-1.5'
            >
              <ArrowUpIcon size={25} />
            </PromptInputSubmit>
          )}
        </PromptInputFooter>
      </PromptInput>
    </div>
  )
}

const PromptInputAttachmentsDisplay = () => {
  const attachments = usePromptInputAttachments();
  if (attachments.files.length === 0) {
    return null
  }

  return (
    <Attachments
      variant="grid"
      className="w-full h-auto min-h-20 px-4 pt-4 justify-start flex-nowrap
       overflow-x-auto ml-0
      "
    >
      {attachments.files.map((attachment) => (
        <Attachment
          data={attachment}
          key={attachment.id}
          className="size-15 shrink-0"
          onRemove={() => attachments.remove(
            attachment.id
          )}
        >
          <AttachmentPreview />
          <AttachmentRemove />
        </Attachment>
      ))}
    </Attachments>
  )
}

const StopButton = ({ onStop }: { onStop: () => void }) => {
  return (
    <Button
      size="icon"
      className="!bg-muted rounded-full dark:!bg-black
      border cursor-pointer"
      onClick={onStop}
    >
      <Square fill='black' size={14} className="text-black
       dark:text-white" />
    </Button>
  )
}

export default ChatInput
