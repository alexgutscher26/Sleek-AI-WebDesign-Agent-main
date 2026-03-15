"use server"

import { getAuthServer } from "@/lib/insforge-server"
import { createChatCompletionWithRetries } from "@/lib/ai-retry"
import type { InsForgeClient } from "@insforge/sdk"
import { UIMessage } from "ai"
import { parseSlugRouteParams, RequestValidationError } from "@/lib/api-validation"
import { getOwnedProjectBySlug } from "@/lib/project-access"

type CompletionResponse = {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export const generateProjectTitle = async (message: string, insforgeClient?: InsForgeClient) => {
  try {
    const insforge = insforgeClient ?? (await getAuthServer()).insforge
    const createCompletion = <T,>(options: Record<string, unknown>) => (
      insforge.ai.chat.completions.create(
        options as Parameters<typeof insforge.ai.chat.completions.create>[0]
      ) as Promise<T>
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
