"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AlertCircleIcon, InboxIcon, LoaderCircleIcon } from "lucide-react";
import type { ReactNode } from "react";

type ViewStateProps = {
  className?: string | undefined;
  title: string;
  description: string;
  icon?: ReactNode | undefined;
  tone?: "default" | "error" | undefined;
  actionLabel?: string | undefined;
  onAction?: (() => void) | undefined;
  secondaryActionLabel?: string | undefined;
  onSecondaryAction?: (() => void) | undefined;
};

export const ViewState = ({
  className,
  title,
  description,
  icon,
  tone = "default",
  actionLabel,
  onAction,
  secondaryActionLabel,
  onSecondaryAction,
}: ViewStateProps) => {
  const isError = tone === "error";

  return (
    <div
      className={cn(
        "flex min-h-[280px] w-full flex-col items-center justify-center rounded-2xl border px-6 py-10 text-center",
        isError
          ? "border-destructive/20 bg-destructive/5"
          : "border-border/60 bg-muted/20",
        className
      )}
    >
      <div
        className={cn(
          "mb-4 flex size-12 items-center justify-center rounded-full border",
          isError
            ? "border-destructive/20 bg-destructive/10 text-destructive"
            : "border-border/70 bg-background text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="max-w-md space-y-2">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm leading-6 text-muted-foreground">{description}</p>
      </div>
      {(actionLabel || secondaryActionLabel) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {actionLabel && onAction && (
            <Button onClick={onAction} size="sm">
              {actionLabel}
            </Button>
          )}
          {secondaryActionLabel && onSecondaryAction && (
            <Button
              onClick={onSecondaryAction}
              size="sm"
              variant={isError ? "outline" : "ghost"}
            >
              {secondaryActionLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export const LoadingState = ({
  className,
  title = "Loading",
  description = "Please wait while we prepare this view.",
}: Omit<ViewStateProps, "tone"> & { title?: string; description?: string }) => (
  <ViewState
    className={className}
    title={title}
    description={description}
    icon={<LoaderCircleIcon className="size-5 animate-spin" />}
  />
);

export const EmptyState = ({
  className,
  title = "Nothing here yet",
  description = "Content will appear here once it is available.",
  ...props
}: Omit<ViewStateProps, "tone"> & { title?: string; description?: string }) => (
  <ViewState
    className={className}
    title={title}
    description={description}
    icon={<InboxIcon className="size-5" />}
    {...props}
  />
);

export const ErrorState = ({
  className,
  title = "Something went wrong",
  description = "We couldn't load this view right now.",
  ...props
}: Omit<ViewStateProps, "tone"> & { title?: string; description?: string }) => (
  <ViewState
    className={className}
    title={title}
    description={description}
    tone="error"
    icon={<AlertCircleIcon className="size-5" />}
    {...props}
  />
);
