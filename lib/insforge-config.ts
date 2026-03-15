const DEFAULT_BASE_URL = "https://f54fg3uq.us-east.insforge.app";

export function getInsforgeBaseUrl() {
  const raw = process.env.INSFORGE_BASE_URL || DEFAULT_BASE_URL;
  return raw.replace(/\/+$/, "");
}

export function getInsforgeAnonKey() {
  return process.env.INSFORGE_ANON_KEY || "";
}
