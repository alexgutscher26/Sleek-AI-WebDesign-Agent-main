import { auth } from "@clerk/nextjs/server";
import { createCompatAiClient } from "@/lib/ai-client";
import { createCompatDatabaseClient } from "@/lib/compat-backend";

export async function getAuthServer() {
  const session = await auth()
  const user = session.userId ? { id: session.userId } : null
  const insforge = {
    ai: createCompatAiClient(),
    database: createCompatDatabaseClient()
  }

  return { insforge, user }
}
