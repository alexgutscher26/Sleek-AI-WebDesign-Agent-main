import { getAuthServer } from "@/lib/insforge-server";
import { NextRequest, NextResponse } from "next/server";
import { createValidationErrorResponse, parseSlugRouteParams, RequestValidationError } from "@/lib/api-validation";
import { getOwnedProjectBySlug } from "@/lib/project-access";
import { createErrorResponse, createSuccessResponse } from "@/lib/api-response";


export async function GET(req: NextRequest,
  { params }: { params: Promise<{ slugId: string }> }
) {
  try {
    const routeParams = await params;
    const { slugId } = parseSlugRouteParams(routeParams.slugId);
    const { user, insforge } = await getAuthServer()
    if (!user?.id) return createErrorResponse(401, "UNAUTHORIZED", "Unauthorized")

    const { data: project, error } = await getOwnedProjectBySlug(
      insforge,
      user.id,
      slugId,
      "id, title"
    )

    if (!project) return createErrorResponse(404, "PROJECT_NOT_FOUND", "Project not found")

    if (error) throw new Error("Project failed fetch");

    const { data: messages } = await insforge.database.from("messages")
      .select("*")
      .eq("projectId", project.id)
      .order("createdAt", { ascending: true })

    const { data: pages } = await insforge.database.from("pages")
      .select("*")
      .eq("projectId", project.id)
      .order("createdAt", { ascending: true })

    const mappedMessages = (messages || []).map((message) => ({
      id: message.id,
      role: message.role,
      parts: message.parts,
      createdAt: message.createdAt
    }))

    return createSuccessResponse({
      title: project.title,
      messages: mappedMessages,
      pages: pages
    })


  } catch (error) {
    if (error instanceof RequestValidationError) {
      return createValidationErrorResponse(error)
    }
    console.log(error);
    return createErrorResponse(500, "INTERNAL_SERVER_ERROR", "Internal server error")
  }
}
