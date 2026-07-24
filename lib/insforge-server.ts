import { createCompatAiClient } from "@/lib/ai-client"
import { createCompatDatabaseClient } from "@/lib/compat-backend"
import { auth } from "@clerk/nextjs/server"

export async function getAuthServer() {
  const session = await auth()
  const user = { id: session.userId ?? "guest_user" }
  const insforge = {
    ai: createCompatAiClient(),
    database: createCompatDatabaseClient(),
  }

  return { insforge, user }
}
