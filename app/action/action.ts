"use server"

import { getAuthServer } from "@/lib/insforge-server"
import { createChatCompletionWithRetries } from "@/lib/ai-retry"
import { UIMessage } from "ai"
import { parseSlugRouteParams, RequestValidationError } from "@/lib/api-validation"
import { getOwnedProjectBySlug } from "@/lib/project-access"
import type { PageType } from "@/types/project"

type CompatClient = Awaited<ReturnType<typeof getAuthServer>>["insforge"]

type CompletionResponse = {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

type ProjectPageRecord = Pick<
  PageType,
  "id" | "name" | "rootStyles" | "htmlContent" | "projectId" | "createdAt" | "updatedAt"
>

export const generateProjectTitle = async (message: string, insforgeClient?: CompatClient) => {
  try {
    const insforge = insforgeClient ?? (await getAuthServer()).insforge
    const createCompletion = <T,>(options: Record<string, unknown>) => (
      insforge.ai.chat.completions.create(
        options as Parameters<typeof insforge.ai.chat.completions.create>[0]
      ) as unknown as Promise<T>
    )

    const result = await createChatCompletionWithRetries<CompletionResponse>(createCompletion, {
      model: "google/gemini-2.5-flash-lite",
      messages: [
        {
          role: "system",
          content: `
    You are an AI assistant that generates very short project names based on the user's prompt.
    - Keep it under 5 words.
    - Capitalize words appropriately.
    - Do not include special characters.
    - Return ONLY the name, nothing else.`,
        },
        {
          role: "user",
          content: message
        }
      ]
    }, {
      fallbackModels: ["google/gemini-2.5-pro"]
    })
    const text = result.choices[0].message.content;
    return text.trim() || "Untitled Project"
  } catch (error) {
    console.log(error, "Project title error")
    return "Untitled Project"
  }
}


export const convertModelMessages = async (messages: UIMessage[]) => {
  const modelMessages = messages.map((message: UIMessage) => {
    const contentParts: Array<
      | { type: "text"; text: string }
      | { type: "image"; image: string }
    > = [];

    for (const part of message.parts) {
      if (part.type === "text" && typeof part.text === "string"
        && part.text.trim()
      ) {
        contentParts.push({
          type: "text",
          text: part.text
        })
      } else if (part.type === "file") {
        if (part.mediaType?.startsWith('image/') && part.url) {
          contentParts.push({
            type: "image",
            image: part.url
          })
        }
      }
    }

    const content = contentParts.length === 1 && contentParts?.[0].type === "text" ? contentParts[0].text : contentParts;

    return {
      role: message.role,
      content
    }
  })

  return modelMessages
}

export const deletePageAction = async (slugId: string, pageId: string) => {
  try {
    const { user, insforge } = await getAuthServer();
    if (!user) return { error: "Unauthorized" };
    const { slugId: parsedSlugId } = parseSlugRouteParams(slugId)

    const { data: project } = await getOwnedProjectBySlug<{ id: string }>(
      insforge,
      user.id,
      parsedSlugId,
      "id"
    )
    if (!project) return { error: "Project not found" }

    await insforge.database.from("pages")
      .delete()
      .eq("projectId", project.id)
      .eq("id", pageId)

    return { success: true }
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return { error: "Invalid request" }
    }
    return { error: "Internal server error" }
  }
}

export const renamePageAction = async (slugId: string, pageId: string, name: string) => {
  try {
    const { user, insforge } = await getAuthServer();
    if (!user) return { error: "Unauthorized" };
    const { slugId: parsedSlugId } = parseSlugRouteParams(slugId)
    const trimmedName = name.trim()

    if (!trimmedName) {
      return { error: "Page name is required" }
    }

    const { data: project } = await getOwnedProjectBySlug<{ id: string }>(
      insforge,
      user.id,
      parsedSlugId,
      "id"
    )
    if (!project) return { error: "Project not found" }

    const { data: page, error } = await insforge.database.from<ProjectPageRecord>("pages")
      .update({ name: trimmedName })
      .eq("projectId", project.id)
      .eq("id", pageId)
      .select("id, name, rootStyles, htmlContent, createdAt, updatedAt, projectId")
      .single()

    if (error || !page) {
      return { error: "Failed to rename page" }
    }

    return { success: true, data: page }
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return { error: "Invalid request" }
    }
    return { error: "Internal server error" }
  }
}

export const duplicatePageAction = async (slugId: string, pageId: string) => {
  try {
    const { user, insforge } = await getAuthServer();
    if (!user) return { error: "Unauthorized" };
    const { slugId: parsedSlugId } = parseSlugRouteParams(slugId)

    const { data: project } = await getOwnedProjectBySlug<{ id: string }>(
      insforge,
      user.id,
      parsedSlugId,
      "id"
    )
    if (!project) return { error: "Project not found" }

    const { data: sourcePage, error: sourceError } = await insforge.database.from<ProjectPageRecord>("pages")
      .select("id, name, rootStyles, htmlContent")
      .eq("projectId", project.id)
      .eq("id", pageId)
      .single()

    if (sourceError || !sourcePage) {
      return { error: "Page not found" }
    }

    const { data: siblingPages } = await insforge.database.from<Array<Pick<PageType, "name">>>("pages")
      .select("name")
      .eq("projectId", project.id)

    const existingNames = new Set((siblingPages ?? []).map((page) => String(page.name)))
    let nextName = `${sourcePage.name} Copy`
    let copyIndex = 2
    while (existingNames.has(nextName)) {
      nextName = `${sourcePage.name} Copy ${copyIndex}`
      copyIndex += 1
    }

    const { data: duplicatedPage, error: duplicateError } = await insforge.database.from<ProjectPageRecord>("pages")
      .insert([{
        projectId: project.id,
        name: nextName,
        rootStyles: sourcePage.rootStyles,
        htmlContent: sourcePage.htmlContent
      }])
      .select("id, name, rootStyles, htmlContent, createdAt, updatedAt, projectId")
      .single()

    if (duplicateError || !duplicatedPage) {
      return { error: "Failed to duplicate page" }
    }

    return { success: true, data: duplicatedPage }
  } catch (error) {
    if (error instanceof RequestValidationError) {
      return { error: "Invalid request" }
    }
    return { error: "Internal server error" }
  }
}
