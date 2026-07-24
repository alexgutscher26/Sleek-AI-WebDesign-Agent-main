/**
 * dev.ts
 *
 * Port-aware dev server launcher.
 *
 * Before starting `next dev`, checks if the target port (default 3000, or
 * whatever PORT is set to in the environment) is already in use. If it is,
 * the script offers a clear error message instead of letting Next.js crash
 * with a cryptic EADDRINUSE.
 *
 * Usage (called by `npm run dev` via package.json):
 *   bun run scripts/dev.ts
 *
 * You can also specify a custom port:
 *   PORT=3001 bun run scripts/dev.ts
 */
import { spawn } from "child_process"
import { createServer } from "net"

const PORT = parseInt(process.env.PORT ?? "3000", 10)

// ── Port availability check ────────────────────────────────────────────────────

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer()

    server.once("error", (err: NodeJS.ErrnoException) => {
      if (err.code === "EADDRINUSE") {
        resolve(false)
      } else {
        // Unexpected error — let Next.js surface it naturally
        resolve(true)
      }
    })

    server.once("listening", () => {
      server.close(() => resolve(true))
    })

    server.listen(port, "127.0.0.1")
  })
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main() {
  const available = await isPortAvailable(PORT)

  if (!available) {
    console.error(`\n❌  Port ${PORT} is already in use.\n`)
    console.error("    Options:")
    console.error(`      • Kill the process using port ${PORT}:`)
    console.error(`          npx kill-port ${PORT}`)
    console.error(`          # or: netstat -ano | findstr :${PORT}  (Windows)`)
    console.error(`          # or: lsof -ti :${PORT} | xargs kill  (macOS/Linux)`)
    console.error(`\n      • Start on a different port:`)
    console.error(`          PORT=${PORT + 1} npm run dev\n`)
    process.exit(1)
  }

  console.log(`\n🚀  Port ${PORT} is free — starting Next.js dev server...\n`)

  // Hand off to Next.js — inherit stdio so HMR output, errors, and
  // keyboard shortcuts (like `o` to open browser) all work normally.
  const nextArgs = ["dev", ...(PORT !== 3000 ? ["--port", String(PORT)] : [])]
  const child = spawn("npx", ["next", ...nextArgs], {
    stdio: "inherit",
    shell: process.platform === "win32",
    env: { ...process.env, PORT: String(PORT) },
  })

  child.on("exit", (code) => {
    process.exit(code ?? 0)
  })

  // Forward signals so Ctrl+C cleanly stops Next.js
  for (const sig of ["SIGINT", "SIGTERM"] as const) {
    process.on(sig, () => child.kill(sig))
  }
}

main()
