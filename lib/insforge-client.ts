import { createClient } from '@insforge/sdk';
import { requireInsforgeConfig } from './insforge-config';

let browserClient: ReturnType<typeof createClient> | null = null

export function getInsforgeBrowserClient() {
  if (browserClient) {
    return browserClient
  }

  const config = requireInsforgeConfig("creating Insforge browser client")
  browserClient = createClient({
    baseUrl: config.baseUrl,
    anonKey: config.anonKey
  })

  return browserClient
}
