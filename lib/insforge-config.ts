const DEFAULT_BASE_URL = "https://f54fg3uq.us-east.insforge.app";

export type InsforgeSetupStatus = {
  configured: boolean;
  baseUrl: string;
  anonKeyConfigured: boolean;
  issues: string[];
};

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

export function getInsforgeBaseUrl() {
  const raw = process.env.INSFORGE_BASE_URL || DEFAULT_BASE_URL;
  return trimTrailingSlash(raw);
}

export function getInsforgeAnonKey() {
  return process.env.INSFORGE_ANON_KEY || "";
}

export function getInsforgeSetupStatus(): InsforgeSetupStatus {
  const rawBaseUrl = process.env.INSFORGE_BASE_URL?.trim() || "";
  const anonKey = process.env.INSFORGE_ANON_KEY?.trim() || "";
  const issues: string[] = [];

  if (!rawBaseUrl) {
    issues.push("Add INSFORGE_BASE_URL to your .env file.");
  }

  if (!anonKey) {
    issues.push("Add INSFORGE_ANON_KEY to your .env file.");
  }

  return {
    configured: issues.length === 0,
    baseUrl: trimTrailingSlash(rawBaseUrl || DEFAULT_BASE_URL),
    anonKeyConfigured: anonKey.length > 0,
    issues,
  };
}
