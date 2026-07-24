/**
 * env-sync-check.ts
 *
 * Compares .env and .env.example to catch two classes of problems:
 *   1. Secret leak risk — keys present in .env but MISSING from .env.example
 *      (means the variable was never documented → likely a secret accidentally omitted)
 *   2. Missing config — keys in .env.example but absent from .env
 *      (dev/CI machine is misconfigured)
 *
 * Usage:
 *   bun run scripts/env-sync-check.ts
 *   (also called by `npm run validate`)
 */
import fs from "fs"
import path from "path"

const ROOT = process.cwd()

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Parse a .env file and return just the key names (ignores comments and blanks). */
function parseEnvKeys(filePath: string): Set<string> {
  if (!fs.existsSync(filePath)) return new Set()

  const keys = new Set<string>()
  const lines = fs.readFileSync(filePath, "utf-8").split("\n")

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith("#")) continue

    const eqIndex = line.indexOf("=")
    if (eqIndex === -1) continue

    const key = line.slice(0, eqIndex).trim()
    if (key) keys.add(key)
  }

  return keys
}

/** Return elements in A that are not in B. */
function difference<T>(a: Set<T>, b: Set<T>): T[] {
  return [...a].filter((item) => !b.has(item))
}

// ── Main ───────────────────────────────────────────────────────────────────────

function main() {
  const envPath = path.join(ROOT, ".env")
  const envExamplePath = path.join(ROOT, ".env.example")

  const envExists = fs.existsSync(envPath)
  const envExampleExists = fs.existsSync(envExamplePath)

  if (!envExampleExists) {
    console.error("❌  .env.example not found. Create it to document required variables.")
    process.exit(1)
  }

  const exampleKeys = parseEnvKeys(envExamplePath)

  // ── Check 1: Keys in .env that are absent from .env.example ─────────────────
  if (envExists) {
    const envKeys = parseEnvKeys(envPath)
    const leakRisk = difference(envKeys, exampleKeys)

    if (leakRisk.length > 0) {
      console.error("⚠️   SECRET LEAK RISK — Keys in .env not documented in .env.example:")
      for (const key of leakRisk) {
        console.error(`     • ${key}`)
      }
      console.error("\n    Add each key (with a placeholder value) to .env.example, then re-run.")
      console.error("    If the key is intentionally private, add a comment-only stub:")
      console.error("    # MY_SECRET=your-value-here\n")
      process.exit(1)
    }
  } else {
    console.warn("⚠️   .env not found. Skipping leak-risk check (expected in CI).")
  }

  // ── Check 2: Keys in .env.example that are absent from .env (local only) ────
  if (envExists) {
    const envKeys = parseEnvKeys(envPath)
    const missing = difference(exampleKeys, envKeys)

    if (missing.length > 0) {
      console.warn("⚠️   Missing keys in .env that are documented in .env.example:")
      for (const key of missing) {
        console.warn(`     • ${key}`)
      }
      console.warn("\n    Copy .env.example → .env and fill in the missing values.")
      // Missing keys are a warning, not a fatal error, so local dev can still run
    }
  }

  console.log("✅  .env.example sync check passed — no undocumented secrets detected.")
}

main()
