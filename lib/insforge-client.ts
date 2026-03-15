import { createClient } from '@insforge/sdk';
import { getInsforgeAnonKey, getInsforgeBaseUrl } from './insforge-config';

export const insforge = createClient({
  baseUrl: getInsforgeBaseUrl(),
  anonKey: getInsforgeAnonKey()
});
