/**
 * validate.ts
 *
 * Runs all quality checks in the correct order and reports a summary.
 * Equivalent to: env-sync → type-check → lint → depcheck → build
 *
 * Usage:
 *   npm run validate           # all checks
 *   npm run validate -- --skip-build  # skip the slow build step
 *
 * Exit code: 0 if all checks pass, 1 if any check fails.
 */
import { type ExecSyncOptionsWithStringEncoding, execSync } from "child_process"

const SKIP_BUILD = process.argv.includes("--skip-build")

// ── Step definitions ───────────────────────────────────────────────────────────

interface Step {
  name: string
  cmd: string
  failFast?: boolean // if true, abort remaining steps on failure
}

const STEPS: Step[] = [
  {
    name: "Env sync check (secret leak guard)",
    cmd: "bun run scripts/env-sync-check.ts",
    failFast: true,
  },
  {
    name: "Prettier format check",
    cmd: "npm run format:check",
  },
  {
    name: "TypeScript type check",
    cmd: "npx tsc --noEmit",
  },
  {
    name: "ESLint",
    cmd: "npm run lint",
  },
  {
    name: "Unused dependency check (depcheck)",
    cmd: "npm run depcheck",
    failFast: false,
  },
  ...(SKIP_BUILD
    ? []
    : [
        {
          name: "Production build",
          cmd: "npm run build",
        },
      ]),
]

// ── Runner ─────────────────────────────────────────────────────────────────────

interface Result {
  name: string
  passed: boolean
  output?: string
}

const EXEC_OPTS: ExecSyncOptionsWithStringEncoding = {
  encoding: "utf-8",
  stdio: "pipe",
}

function run(step: Step): Result {
  const label = `  ▶ ${step.name}`
  process.stdout.write(`${label}...`)

  try {
    execSync(step.cmd, EXEC_OPTS)
    process.stdout.write(" ✅\n")
    return { name: step.name, passed: true }
  } catch (err: unknown) {
    process.stdout.write(" ❌\n")

    let output = ""
    if (err && typeof err === "object") {
      const e = err as { stdout?: string; stderr?: string; message?: string }
      output = [e.stdout, e.stderr, e.message].filter(Boolean).join("\n").trim()
    }

    return { name: step.name, passed: false, output }
  }
}

function main() {
  console.log("\n🔍  Running validation suite...\n")

  const results: Result[] = []

  for (const step of STEPS) {
    const result = run(step)
    results.push(result)

    if (!result.passed && step.failFast) {
      console.error(`\n🛑  Aborting: "${step.name}" failed (fail-fast enabled).\n`)
      if (result.output) {
        console.error(
          "Output:\n" +
            result.output
              .split("\n")
              .map((l) => "  " + l)
              .join("\n")
        )
      }
      break
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────

  const passed = results.filter((r) => r.passed)
  const failed = results.filter((r) => !r.passed)
  const skipped = STEPS.length - results.length // steps not reached due to fail-fast

  console.log("\n─────────────────────────────────────────────")
  console.log(
    `  Validation summary: ${passed.length} passed  |  ${failed.length} failed  |  ${skipped} skipped`
  )
  console.log("─────────────────────────────────────────────\n")

  if (failed.length > 0) {
    for (const f of failed) {
      console.error(`❌  ${f.name}`)
      if (f.output) {
        console.error(
          f.output
            .split("\n")
            .slice(0, 20)
            .map((l) => "     " + l)
            .join("\n")
        )
        if (f.output.split("\n").length > 20) console.error("     ... (truncated)")
      }
    }
    console.error("\n  Fix the above issues, then run `npm run validate` again.\n")
    process.exit(1)
  }

  console.log("  ✅  All checks passed — ready to commit or deploy.\n")
}

main()
