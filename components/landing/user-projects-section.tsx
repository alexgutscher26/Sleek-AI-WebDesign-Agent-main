"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { FolderOpen, Plus, ArrowRight, Clock, Sparkles, Layout, FolderPlus } from "lucide-react";

type ProjectListItem = {
  id: string;
  title: string;
  slugId: string;
  createdAt?: string;
  updatedAt?: string;
};

function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Recently";
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return "Recently";
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function UserProjectsSection() {
  const { data: projects, isLoading, isError } = useQuery({
    queryKey: ["user-projects-landing"],
    queryFn: async () => {
      const res = await fetch("/api/project");
      if (!res.ok) {
        throw new Error("Failed to fetch projects");
      }
      const payload = (await res.json()) as {
        success: boolean;
        data: ProjectListItem[];
      };
      return payload.data || [];
    },
    staleTime: 1000 * 30, // 30 seconds
  });

  return (
    <section id="projects" className="relative z-10 max-w-6xl mx-auto px-6 pt-4 pb-16">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-orange-400 mb-1">
            <FolderOpen className="w-3.5 h-3.5" />
            Your Workspace
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white">
            Recent Projects
            {projects && projects.length > 0 && (
              <span className="ml-3 text-xs px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30 font-medium align-middle">
                {projects.length}
              </span>
            )}
          </h2>
          <p className="text-sm text-white/50 mt-1">
            Pick up where you left off or create a brand new UI project.
          </p>
        </div>

        <Link
          href="/project"
          className="inline-flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-all shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 shrink-0 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="rounded-2xl border border-white/8 bg-white/2 p-5 animate-pulse flex flex-col gap-4 h-36"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-white/10 rounded w-3/4" />
                  <div className="h-3 bg-white/5 rounded w-1/2" />
                </div>
              </div>
              <div className="mt-auto h-3 bg-white/5 rounded w-1/3" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-white/60">
          Unable to load your projects right now.
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/12 bg-white/2 p-10 text-center flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
            <FolderPlus className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white mb-1">No projects created yet</h3>
            <p className="text-xs text-white/40 max-w-sm mx-auto">
              Type a prompt above or click below to start your first AI UI generation.
            </p>
          </div>
          <Link
            href="/project"
            className="inline-flex items-center gap-2 text-xs bg-white/8 hover:bg-white/12 text-white border border-white/10 px-4 py-2 rounded-xl transition-colors font-medium mt-1"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            Start First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.slugId}`}
              className="group relative rounded-2xl border border-white/8 bg-gradient-to-b from-white/4 to-white/1 p-5 flex flex-col justify-between hover:border-orange-500/40 hover:bg-white/5 transition-all duration-300 hover:-translate-y-1 shadow-lg shadow-black/20"
            >
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 group-hover:bg-orange-500/20 transition-colors shrink-0">
                  <Layout className="w-5 h-5" />
                </div>
                <div className="text-white/30 group-hover:text-orange-400 group-hover:translate-x-0.5 transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>

              <div>
                <h3 className="text-base font-semibold text-white/90 group-hover:text-white line-clamp-1 transition-colors mb-1">
                  {project.title || "Untitled Project"}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Clock className="w-3 h-3 text-white/30" />
                  <span>Updated {formatRelativeTime(project.updatedAt || project.createdAt)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-white/6 flex items-center justify-between text-[11px] text-white/30">
                <span className="font-mono text-white/25 truncate max-w-[150px]">/{project.slugId}</span>
                <span className="text-orange-400/80 font-medium group-hover:underline">Open</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
