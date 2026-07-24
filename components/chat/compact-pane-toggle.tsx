"use client";

import { Button } from "../ui/button";
import { LayoutPanelLeft, MonitorSmartphone } from "lucide-react";

type CompactPaneToggleProps = {
  activePane: "chat" | "canvas";
  onPaneChange: (pane: "chat" | "canvas") => void;
  pageCount: number;
};

export const CompactPaneToggle = ({
  activePane,
  onPaneChange,
  pageCount,
}: CompactPaneToggleProps) => {
  return (
    <div className="border-b border-border bg-background/95 px-3 py-2 backdrop-blur md:px-4 lg:hidden">
      <div className="flex items-center gap-2 rounded-full border border-border/70 bg-muted/30 p-1">
        <Button
          variant={activePane === "chat" ? "default" : "ghost"}
          size="sm"
          className="flex-1 rounded-full"
          onClick={() => onPaneChange("chat")}
        >
          <LayoutPanelLeft className="size-4" />
          Chat
        </Button>
        <Button
          variant={activePane === "canvas" ? "default" : "ghost"}
          size="sm"
          className="flex-1 rounded-full"
          onClick={() => onPaneChange("canvas")}
        >
          <MonitorSmartphone className="size-4" />
          Canvas {pageCount > 0 ? `(${pageCount})` : ""}
        </Button>
      </div>
    </div>
  );
};
