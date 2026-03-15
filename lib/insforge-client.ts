import { createClient } from '@insforge/sdk';

let browserClient: ReturnType<typeof createClient> | null = null

export function getInsforgeBrowserClient(config: {
  baseUrl: string
  anonKey: string
}) {
  if (browserClient) {
    return browserClient
  }

  browserClient = createClient({
    baseUrl: config.baseUrl,
    anonKey: config.anonKey
  })

  return browserClient
}
