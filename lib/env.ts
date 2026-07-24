import { z } from "zod"

const envSchema = z.object({
  // Server-side environment variables
  DATABASE_URL: z.string().optional(),
  INSFORGE_AI_SECRET_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CRON_SECRET: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),

  // Client-side environment variables
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
})

export const env = envSchema.parse(process.env)
