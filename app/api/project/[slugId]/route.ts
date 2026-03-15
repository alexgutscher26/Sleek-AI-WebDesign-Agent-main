import { getAuthServer } from "@/lib/insforge-server";
import { NextRequest, NextResponse } from "next/server";
import { createValidationErrorResponse, parseSlugRouteParams, RequestValidationError } from "@/lib/api-validation";
import { getOwnedProjectBySlug } from "@/lib/project-access";


export async function GET(req: NextRequest,
  { params }: { params: Promise<{ slugId: string }> }
) {
  try {
    const routeParams = await params;
    const { slugId } = parseSlugRouteParams(routeParams.slugId);
    const { user, insforge } = await getAuthServer()
    if (!user?.id) return NextResponse.json({
      error: "Unauthorized"
    }, { status: 401 })

    const { data: project, error } = await getOwnedProjectBySlug(
      insforge,
      user.id,
      slugId,
      "id, title"
    )

    if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 })

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

    return NextResponse.json({
      title: project.title,
      messages: mappedMessages,
      pages: pages
    })


  } catch (error) {
    if (error instanceof RequestValidationError) {
      return createValidationErrorResponse(error)
    }
    console.log(error);
    return NextResponse.json({
      error: "Internal Server error",
    }, { status: 500 })
  }
}
