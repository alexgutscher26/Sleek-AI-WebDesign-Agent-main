"use client"

import Link from "next/link"
import { generateSlugId } from "@/lib/utils"
import { useQuery } from "@tanstack/react-query"
import { ArrowRight, Clock, FolderOpen, FolderPlus, Layout, Plus, Sparkles } from "lucide-react"

type ProjectListItem = {
  id: string
  title: string
  slugId: string
  createdAt?: string
  updatedAt?: string
}

function formatRelativeTime(dateString?: string) {
  if (!dateString) return "Recently"
  const date = new Date(dateString)
  if (isNaN(date.getTime())) return "Recently"
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" })
}

export function UserProjectsSection() {
  const {
    data: projects,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["user-projects-landing"],
    queryFn: async () => {
      const res = await fetch("/api/project")
      if (!res.ok) {
        throw new Error("Failed to fetch projects")
      }
      const payload = (await res.json()) as {
        success: boolean
        data: ProjectListItem[]
      }
      return payload.data || []
    },
    staleTime: 1000 * 30, // 30 seconds
  })

  return (
    <section id="projects" className="relative z-10 mx-auto max-w-6xl px-6 pt-4 pb-16">
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 text-xs font-semibold tracking-widest text-orange-400 uppercase">
            <FolderOpen className="h-3.5 w-3.5" />
            Your Workspace
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            Recent Projects
            {projects && projects.length > 0 && (
              <span className="ml-3 rounded-full border border-orange-500/30 bg-orange-500/20 px-2.5 py-0.5 align-middle text-xs font-medium text-orange-400">
                {projects.length}
              </span>
            )}
          </h2>
          <p className="mt-1 text-sm text-white/50">
            Pick up where you left off or create a brand new UI project.
          </p>
        </div>

        <Link
          href={`/project/${generateSlugId()}`}
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-orange-500/25 transition-all hover:bg-orange-400 hover:shadow-orange-500/40 sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          <span>New Project</span>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex h-36 animate-pulse flex-col gap-4 rounded-2xl border border-white/8 bg-white/2 p-5"
            >
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-white/10" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-3/4 rounded bg-white/10" />
                  <div className="h-3 w-1/2 rounded bg-white/5" />
                </div>
              </div>
              <div className="mt-auto h-3 w-1/3 rounded bg-white/5" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-2xl border border-red-500/20 bg-red-500/5 p-6 text-center text-sm text-white/60">
          Unable to load your projects right now.
        </div>
      ) : !projects || projects.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-white/12 bg-white/2 p-10 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-orange-500/20 bg-orange-500/10 text-orange-400">
            <FolderPlus className="h-6 w-6" />
          </div>
          <div>
            <h3 className="mb-1 text-base font-semibold text-white">No projects created yet</h3>
            <p className="mx-auto max-w-sm text-xs text-white/40">
              Type a prompt above or click below to start your first AI UI generation.
            </p>
          </div>
          <Link
            href={`/project/${generateSlugId()}`}
            className="mt-1 inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/8 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-white/12"
          >
            <Sparkles className="h-3.5 w-3.5 text-orange-400" />
            Start First Project
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Link
              key={project.id}
              href={`/project/${project.slugId}`}
              className="group relative flex flex-col justify-between rounded-2xl border border-white/8 bg-gradient-to-b from-white/4 to-white/1 p-5 shadow-lg shadow-black/20 transition-all duration-300 hover:-translate-y-1 hover:border-orange-500/40 hover:bg-white/5"
            >
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-orange-500/20 bg-orange-500/10 text-orange-400 transition-colors group-hover:bg-orange-500/20">
                  <Layout className="h-5 w-5" />
                </div>
                <div className="text-white/30 transition-all group-hover:translate-x-0.5 group-hover:text-orange-400">
                  <ArrowRight className="h-4 w-4" />
                </div>
              </div>

              <div>
                <h3 className="mb-1 line-clamp-1 text-base font-semibold text-white/90 transition-colors group-hover:text-white">
                  {project.title || "Untitled Project"}
                </h3>
                <div className="flex items-center gap-1.5 text-xs text-white/40">
                  <Clock className="h-3 w-3 text-white/30" />
                  <span>Updated {formatRelativeTime(project.updatedAt || project.createdAt)}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-white/6 pt-3 text-[11px] text-white/30">
                <span className="max-w-[150px] truncate font-mono text-white/25">
                  /{project.slugId}
                </span>
                <span className="font-medium text-orange-400/80 group-hover:underline">Open</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  )
}
