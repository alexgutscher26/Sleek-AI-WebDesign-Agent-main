import fs from "fs"
import path from "path"
import postgres from "postgres"

function parseSqlStatements(rawSql: string): string[] {
  const cleanSql = rawSql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")

  const statements: string[] = []
  let current = ""
  let inDollarQuote = false
  let dollarTag = ""

  let i = 0
  while (i < cleanSql.length) {
    const char = cleanSql[i]

    if (!inDollarQuote) {
      if (char === "$" && (i === 0 || cleanSql[i - 1] !== "\\")) {
        const match = cleanSql.slice(i).match(/^\$[a-zA-Z0-9_]*\$/)
        if (match) {
          inDollarQuote = true
          dollarTag = match[0]
          current += dollarTag
          i += dollarTag.length
          continue
        }
      }

      if (char === ";") {
        current += ";"
        if (current.trim()) {
          statements.push(current.trim())
        }
        current = ""
        i++
        continue
      }
    } else {
      if (char === "$") {
        if (cleanSql.slice(i).startsWith(dollarTag)) {
          inDollarQuote = false
          current += dollarTag
          i += dollarTag.length
          dollarTag = ""
          continue
        }
      }
    }

    current += char
    i++
  }

  if (current.trim()) {
    statements.push(current.trim())
  }

  return statements
}

async function main() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("❌ Error: DATABASE_URL environment variable is not set.")
    process.exit(1)
  }

  const schemaPath = path.join(process.cwd(), "insforge", "schema.sql")
  if (!fs.existsSync(schemaPath)) {
    console.error(`❌ Error: Schema file not found at ${schemaPath}`)
    process.exit(1)
  }

  console.log(`🚀 Connecting to database and pushing schema from insforge/schema.sql...`)
  const sql = postgres(databaseUrl, { max: 1 })

  let currentStmt = ""
  let currentIdx = 0
  try {
    const schemaSql = fs.readFileSync(schemaPath, "utf-8")
    const statements = parseSqlStatements(schemaSql)

    for (let i = 0; i < statements.length; i++) {
      currentIdx = i
      currentStmt = statements[i] ?? ""
      if (currentStmt) {
        await sql.unsafe(currentStmt)
      }
    }
    console.log(`✅ Database schema successfully pushed (${statements.length} statements executed)!`)
  } catch (error) {
    console.error(`❌ Error executing statement #${currentIdx + 1}:`)
    console.error(currentStmt.slice(0, 300) + (currentStmt.length > 300 ? "..." : ""))
    console.error(error)
    process.exit(1)
  } finally {
    await sql.end()
  }
}

main()
