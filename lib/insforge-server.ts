import { auth } from '@insforge/nextjs';
import { createClient } from '@insforge/sdk';
import { getInsforgeAnonKey, getInsforgeBaseUrl } from './insforge-config';

export async function getAuthServer() {
  const { user } = await auth()
  const baseUrl = getInsforgeBaseUrl();
  const anonKey = getInsforgeAnonKey();

  const insforge = createClient({
    baseUrl,
    anonKey
  });

  return { insforge, user }

}
