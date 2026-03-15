type InsforgeConfig = {
  baseUrl: string
  anonKey: string
}

export type InsforgeSetupStatus = {
  configured: boolean
  baseUrl: string
  anonKeyConfigured: boolean
  issues: string[]
}

const CONFIG_ERROR_PREFIX = "[insforge-config]"
const PLACEHOLDER_BASE_URL = "https://your-app.region.insforge.app"
const PLACEHOLDER_ANON_KEY = "your-anon-key"

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "")
}

function readInsforgeEnv(): InsforgeConfig {
  return {
    baseUrl: trimTrailingSlash(process.env.INSFORGE_BASE_URL?.trim() ?? ""),
    anonKey: process.env.INSFORGE_ANON_KEY?.trim() ?? ""
  }
}

function isLocalHttpUrl(url: URL) {
  return url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname)
}

function validateInsforgeConfig(config: InsforgeConfig) {
  const issues: string[] = []

  if (!config.baseUrl) {
    issues.push("Add INSFORGE_BASE_URL to your .env file.")
  } else if (config.baseUrl === PLACEHOLDER_BASE_URL) {
    issues.push("Replace the placeholder INSFORGE_BASE_URL with your real backend URL.")
  } else {
    try {
      const parsedUrl = new URL(config.baseUrl)
      if (parsedUrl.protocol !== "https:" && !isLocalHttpUrl(parsedUrl)) {
        issues.push("INSFORGE_BASE_URL must use HTTPS unless you are targeting localhost.")
      }
    } catch {
      issues.push("INSFORGE_BASE_URL must be a valid absolute URL.")
    }
  }

  if (!config.anonKey) {
    issues.push("Add INSFORGE_ANON_KEY to your .env file.")
  } else if (config.anonKey === PLACEHOLDER_ANON_KEY) {
    issues.push("Replace the placeholder INSFORGE_ANON_KEY with your real anon key.")
  }

  return issues
}

function formatConfigIssues(context: string, issues: string[]) {
  return `${CONFIG_ERROR_PREFIX} ${context}: ${issues.join(" ")}`
}

export function getInsforgeSetupStatus(): InsforgeSetupStatus {
  const config = readInsforgeEnv()
  const issues = validateInsforgeConfig(config)

  return {
    configured: issues.length === 0,
    baseUrl: config.baseUrl,
    anonKeyConfigured: config.anonKey.length > 0 && config.anonKey !== PLACEHOLDER_ANON_KEY,
    issues
  }
}

export function logInsforgeConfigAtBoot(context = "application boot") {
  const status = getInsforgeSetupStatus()
  if (status.configured) {
    return status
  }

  const globalKey = "__sleek_insforge_config_logged__"
  const globalState = globalThis as typeof globalThis & { [globalKey]?: boolean }
  if (!globalState[globalKey]) {
    console.error(formatConfigIssues(context, status.issues))
    globalState[globalKey] = true
  }

  return status
}

export function requireInsforgeConfig(context: string): InsforgeConfig {
  const config = readInsforgeEnv()
  const issues = validateInsforgeConfig(config)

  if (issues.length > 0) {
    const message = formatConfigIssues(context, issues)
    console.error(message)
    throw new Error(message)
  }

  return config
}

export function getInsforgeBaseUrl() {
  return requireInsforgeConfig("reading Insforge base URL").baseUrl
}

export function getInsforgeAnonKey() {
  return requireInsforgeConfig("reading Insforge anon key").anonKey
}
