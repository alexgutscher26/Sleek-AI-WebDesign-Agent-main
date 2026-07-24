import { getAuthServer } from "@/lib/insforge-server"

type RouteInsforge = Awaited<ReturnType<typeof getAuthServer>>["insforge"]

export async function getOwnedProjectBySlug<TData extends Record<string, unknown>>(
  insforge: RouteInsforge,
  userId: string,
  slugId: string,
  select = "id, title, slugId"
) {
  return insforge.database
    .from("projects")
    .select(select)
    .eq("slugId", slugId)
    .eq("userId", userId)
    .single() as unknown as Promise<{
    data: TData | null
    error?: { code?: string; message?: string } | null
  }>
}
