import { auth } from '@insforge/nextjs';
import { createClient } from '@insforge/sdk';
import { requireInsforgeConfig } from './insforge-config';

export async function getAuthServer() {
  const { user } = await auth()
  const config = requireInsforgeConfig("creating Insforge server client")

  const insforge = createClient({
    baseUrl: config.baseUrl,
    anonKey: config.anonKey
  });

  return { insforge, user }

}
