"use client";

import { Button } from "../ui/button";
import { ArrowLeft } from "lucide-react";

type ChatHeaderProps = {
  title: string;
  onBack: () => void;
};

export const ChatHeader = ({ title, onBack }: ChatHeaderProps) => {
  return (
    <div className="absolute left-0 top-0 z-10 w-full bg-background/95 pb-2 backdrop-blur">
      <div
        role="button"
        className="flex items-center gap-2 px-3 pt-2 cursor-pointer! md:px-4"
        onClick={onBack}
      >
        <Button variant="secondary" size="icon">
          <ArrowLeft />
        </Button>
        <h5 className="font-semibold tracking-tight truncate pr-4 text-sm md:text-base">
          {title}
        </h5>
      </div>
    </div>
  );
};
