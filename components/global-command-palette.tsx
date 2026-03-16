"use client"

import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTheme } from "next-themes";
import { usePathname, useRouter } from "next/navigation";
import { CheckIcon, CommandIcon, ExternalLinkIcon, FolderOpenIcon, HomeIcon, MoonIcon, PaintbrushIcon, PanelLeftOpenIcon, SearchIcon, SunIcon } from "lucide-react";
import { toast } from "sonner";

import { useCanvas } from "@/hooks/use-canvas";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";

type ProjectListItem = {
  id: string;
  title: string;
  slugId: string;
  createdAt: string;
};

type ProjectDetail = {
  title: string;
  messages: Array<unknown>;
  pages: Array<{ id: string; name: string }>;
};

const isTextInput = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
};

const getProjectSlugFromPath = (pathname: string) => {
  const match = pathname.match(/^\/project\/([^/]+)/);
  return match?.[1] ?? null;
};

const copyToClipboard = async (value: string) => {
  await navigator.clipboard.writeText(value);
};

const GlobalCommandPalette = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { selectedPageId, setSelectedPageId } = useCanvas();
  const [open, setOpen] = useState(false);

  const currentProjectSlug = useMemo(
    () => getProjectSlugFromPath(pathname),
    [pathname]
  );

  const {
    data: projects,
  } = useQuery({
    queryKey: ["projects", "palette"],
    queryFn: async () => {
      const res = await fetch("/api/project");
      if (!res.ok) {
        return [];
      }

      const payload = await res.json() as {
        success: true;
        data: ProjectListItem[];
      };

      return payload.data;
    },
    staleTime: 1000 * 60 * 5,
  });

  const {
    data: currentProject,
  } = useQuery({
    queryKey: ["project", currentProjectSlug, "palette"],
    queryFn: async () => {
      const res = await fetch(`/api/project/${currentProjectSlug}`);
      if (!res.ok) {
        return null;
      }

      const payload = await res.json() as {
        success: true;
        data: ProjectDetail;
      };

      return payload.data;
    },
    // Only fetch the active project when the palette is open to avoid
    // noisy background 404s while a brand-new project is still being created.
    enabled: open && Boolean(currentProjectSlug),
    staleTime: 1000 * 60 * 3,
  });

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if ((event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey))) {
        event.preventDefault();
        setOpen((value) => !value);
        return;
      }

      if (event.key === "/" && !isTextInput(event.target)) {
        event.preventDefault();
        setOpen(true);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runAction = (action: () => void | Promise<void>) => {
    setOpen(false);
    void Promise.resolve(action());
  };

  const recentProjects = projects?.slice(0, 8) ?? [];
  const currentSelectedPage = currentProject?.pages.find(
    (page) => page.id === selectedPageId
  );

  return (
    <>
      <button
        type="button"
        className="hidden h-9 items-center gap-2 rounded-md border bg-background px-3 text-sm text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground md:inline-flex"
        onClick={() => setOpen(true)}
      >
        <SearchIcon className="size-4" />
        <span>Search actions</span>
        <kbd className="rounded border bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide">
          Ctrl K
        </kbd>
      </button>

      <button
        type="button"
        className="inline-flex size-9 items-center justify-center rounded-md border bg-background text-muted-foreground shadow-xs transition-colors hover:bg-accent hover:text-accent-foreground md:hidden"
        onClick={() => setOpen(true)}
        aria-label="Open command palette"
      >
        <CommandIcon className="size-4" />
      </button>

      <CommandDialog open={open} onOpenChange={setOpen} className="sm:max-w-2xl">
        <CommandInput placeholder="Search projects, pages, and actions..." />
        <CommandList>
          <CommandEmpty>No matching actions found.</CommandEmpty>

          <CommandGroup heading="Navigation">
            <CommandItem onSelect={() => runAction(() => router.push("/"))}>
              <HomeIcon className="size-4" />
              <span>Home</span>
              <CommandShortcut>G H</CommandShortcut>
            </CommandItem>

            <CommandItem
              onSelect={() =>
                runAction(() => {
                  setSelectedPageId(null);
                  router.push("/");
                })
              }
            >
              <PanelLeftOpenIcon className="size-4" />
              <span>New project</span>
              <CommandShortcut>G N</CommandShortcut>
            </CommandItem>
          </CommandGroup>

          {currentProjectSlug && currentProject && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Current Project">
                <CommandItem
                  onSelect={() =>
                    runAction(async () => {
                      const url = `${window.location.origin}/project/${currentProjectSlug}`;
                      await copyToClipboard(url);
                      toast.success("Project link copied");
                    })
                  }
                >
                  <ExternalLinkIcon className="size-4" />
                  <span>Copy project link</span>
                </CommandItem>

                <CommandItem
                  onSelect={() =>
                    runAction(() => {
                      setSelectedPageId(null);
                      toast.success("Cleared page selection");
                    })
                  }
                >
                  <FolderOpenIcon className="size-4" />
                  <span>Clear selected page</span>
                  {currentSelectedPage ? (
                    <CommandShortcut>{currentSelectedPage.name}</CommandShortcut>
                  ) : null}
                </CommandItem>

                {currentProject.pages.map((page) => (
                  <CommandItem
                    key={page.id}
                    onSelect={() =>
                      runAction(() => {
                        setSelectedPageId(page.id);
                        toast.success(`Focused ${page.name}`);
                      })
                    }
                  >
                    <FolderOpenIcon className="size-4" />
                    <span>Open {page.name}</span>
                    {selectedPageId === page.id ? (
                      <CheckIcon className="ml-auto size-4 text-primary" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          {recentProjects.length > 0 && (
            <>
              <CommandSeparator />
              <CommandGroup heading="Recent Projects">
                {recentProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    onSelect={() =>
                      runAction(() => {
                        setSelectedPageId(null);
                        router.push(`/project/${project.slugId}`);
                      })
                    }
                  >
                    <FolderOpenIcon className="size-4" />
                    <span>{project.title}</span>
                    {project.slugId === currentProjectSlug ? (
                      <CheckIcon className="ml-auto size-4 text-primary" />
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </>
          )}

          <CommandSeparator />
          <CommandGroup heading="Theme">
            <CommandItem onSelect={() => runAction(() => setTheme("light"))}>
              <SunIcon className="size-4" />
              <span>Light theme</span>
              {theme === "light" ? <CheckIcon className="ml-auto size-4 text-primary" /> : null}
            </CommandItem>
            <CommandItem onSelect={() => runAction(() => setTheme("dark"))}>
              <MoonIcon className="size-4" />
              <span>Dark theme</span>
              {theme === "dark" ? <CheckIcon className="ml-auto size-4 text-primary" /> : null}
            </CommandItem>
            <CommandItem onSelect={() => runAction(() => setTheme("system"))}>
              <PaintbrushIcon className="size-4" />
              <span>System theme</span>
              {theme === "system" ? <CheckIcon className="ml-auto size-4 text-primary" /> : null}
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
};

export default GlobalCommandPalette;
