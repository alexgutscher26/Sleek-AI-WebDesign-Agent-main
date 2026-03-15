export async function getOwnedProjectBySlug(
  insforge: any,
  userId: string,
  slugId: string,
  select = "id, title, slugId"
) {
  return insforge.database
    .from("projects")
    .select(select)
    .eq("slugId", slugId)
    .eq("userId", userId)
    .single()
}
