import { getSql } from "@/lib/neon-db"

type QueryResponse<T> = {
  data: T
  error: { code?: string; message?: string } | null
}

type OrderOptions = {
  ascending?: boolean
}

type Filter =
  | { type: "eq"; column: string; value: unknown }
  | { type: "in"; column: string; values: unknown[] }

const VOID_RPCS = new Set([
  "finish_generation_request",
  "commit_message_pair",
  "touch_project",
  "sync_project_metadata",
  "rebalance_page_positions",
  "update_page_positions"
])

const RPC_PARAM_ORDER: Record<string, string[]> = {
  get_or_create_project: ["p_user_id", "p_slug_id", "p_title"],
  begin_generation_request: [
    "p_user_id",
    "p_project_id",
    "p_selected_page_id",
    "p_idempotency_key",
    "p_request_hash",
    "p_request_kind",
    "p_ip_hash"
  ],
  finish_generation_request: ["p_user_id", "p_request_id", "p_status", "p_response", "p_error"],
  commit_message_pair: ["p_user_id", "p_project_id", "p_user_parts", "p_assistant_parts"],
  touch_project: ["p_user_id", "p_project_id"],
  sync_project_metadata: ["p_user_id", "p_project_id", "p_metadata"],
  rebalance_page_positions: ["p_user_id", "p_project_id"],
  update_page_positions: ["p_user_id", "p_project_id", "p_page_ids"],
  commit_generation_result: ["p_user_id", "p_project_id", "p_user_parts", "p_assistant_parts", "p_pages"],
  commit_regeneration_result: [
    "p_user_id",
    "p_project_id",
    "p_page_id",
    "p_html_content",
    "p_root_styles",
    "p_user_parts",
    "p_assistant_parts"
  ]
}

function quoteIdentifier(identifier: string) {
  return `"${identifier.replace(/"/g, "\"\"")}"`
}

function normalizeColumnList(columns: string) {
  if (columns.trim() === "*") {
    return "*"
  }

  return columns
    .split(",")
    .map((column) => column.trim())
    .filter(Boolean)
    .map((column) => {
      if (column === "*") {
        return column
      }

      if (column.includes("(") || column.includes(")") || /\s+as\s+/i.test(column) || column.includes("\"")) {
        return column
      }

      return quoteIdentifier(column)
    })
    .join(", ")
}

function mapDbError(error: unknown) {
  if (error && typeof error === "object") {
    const typedError = error as { code?: string; message?: string }
    return {
      code: typedError.code,
      message: typedError.message ?? "Database error"
    }
  }

  return {
    message: "Database error"
  }
}

type SqlParameterList = Parameters<ReturnType<typeof getSql>["unsafe"]>[1]

class QueryBuilder<TData> implements PromiseLike<QueryResponse<TData>> {
  private action: "select" | "insert" | "update" | "delete" = "select"
  private selectClause = "*"
  private filters: Filter[] = []
  private orderClause: { column: string; options?: OrderOptions } | null = null
  private limitCount: number | null = null
  private expectSingle = false
  private insertRows: Record<string, unknown>[] = []
  private updateValues: Record<string, unknown> | null = null

  constructor(private table: string) {}

  select(columns = "*") {
    this.selectClause = columns
    return this
  }

  insert(rows: Record<string, unknown>[]) {
    this.action = "insert"
    this.insertRows = rows
    return this
  }

  update(values: Record<string, unknown>) {
    this.action = "update"
    this.updateValues = values
    return this
  }

  delete() {
    this.action = "delete"
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push({ type: "eq", column, value })
    return this
  }

  in(column: string, values: unknown[]) {
    this.filters.push({ type: "in", column, values })
    return this
  }

  order(column: string, options?: OrderOptions) {
    this.orderClause = { column, options }
    return this
  }

  limit(value: number) {
    this.limitCount = value
    return this
  }

  single() {
    this.expectSingle = true
    return this
  }

  private buildWhere(values: unknown[]) {
    if (this.filters.length === 0) {
      return ""
    }

    const clauses = this.filters.map((filter) => {
      if (filter.type === "eq") {
        values.push(filter.value)
        return `${quoteIdentifier(filter.column)} = $${values.length}`
      }

      const placeholders = filter.values.map((value) => {
        values.push(value)
        return `$${values.length}`
      })

      return `${quoteIdentifier(filter.column)} in (${placeholders.join(", ")})`
    })

    return ` where ${clauses.join(" and ")}`
  }

  private async execute(): Promise<QueryResponse<TData>> {
    const sql = getSql()
    const values: unknown[] = []

    try {
      let query = ""

      if (this.action === "select") {
        query = `select ${normalizeColumnList(this.selectClause)} from ${quoteIdentifier(this.table)}`
        query += this.buildWhere(values)
        if (this.orderClause) {
          query += ` order by ${quoteIdentifier(this.orderClause.column)} ${this.orderClause.options?.ascending === false ? "desc" : "asc"}`
        }
        if (this.limitCount !== null) {
          query += ` limit ${this.limitCount}`
        }
      } else if (this.action === "insert") {
        const columns = Object.keys(this.insertRows[0] ?? {})
        const valueGroups = this.insertRows.map((row) => {
          const placeholders = columns.map((column) => {
            values.push(row[column] ?? null)
            return `$${values.length}`
          })
          return `(${placeholders.join(", ")})`
        })

        query = `insert into ${quoteIdentifier(this.table)} (${columns.map(quoteIdentifier).join(", ")}) values ${valueGroups.join(", ")}`
        if (this.selectClause !== "*") {
          query += ` returning ${normalizeColumnList(this.selectClause)}`
        }
      } else if (this.action === "update") {
        const entries = Object.entries(this.updateValues ?? {})
        const setClauses = entries.map(([column, value]) => {
          values.push(value)
          return `${quoteIdentifier(column)} = $${values.length}`
        })

        query = `update ${quoteIdentifier(this.table)} set ${setClauses.join(", ")}`
        query += this.buildWhere(values)
        if (this.selectClause !== "*") {
          query += ` returning ${normalizeColumnList(this.selectClause)}`
        }
      } else {
        query = `delete from ${quoteIdentifier(this.table)}`
        query += this.buildWhere(values)
      }

      const rows = await sql.unsafe(query, values as SqlParameterList)
      const normalizedRows = Array.isArray(rows) ? rows : []

      if (this.expectSingle) {
        const row = normalizedRows[0] ?? null
        return {
          data: row as TData,
          error: row ? null : { code: "PGRST116", message: "No rows returned" }
        }
      }

      return {
        data: normalizedRows as TData,
        error: null
      }
    } catch (error) {
      return {
        data: (this.expectSingle ? null : []) as TData,
        error: mapDbError(error)
      }
    }
  }

  then<TResult1 = QueryResponse<TData>, TResult2 = never>(
    onfulfilled?: ((value: QueryResponse<TData>) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ) {
    return this.execute().then(onfulfilled ?? undefined, onrejected ?? undefined)
  }
}

export function createCompatDatabaseClient() {
  return {
    from<TData = Record<string, unknown>>(table: string) {
      return new QueryBuilder<TData>(table)
    },
    async rpc<TData = unknown>(name: string, params: Record<string, unknown>) {
      const sql = getSql()
      const orderedKeys = RPC_PARAM_ORDER[name] ?? Object.keys(params)
      const orderedParams = orderedKeys.map((key) => (key in params ? params[key] : null))
      const placeholders = orderedParams.map((_, index) => `$${index + 1}`).join(", ")
      const query = VOID_RPCS.has(name)
        ? `select public.${name}(${placeholders}) as result`
        : `select * from public.${name}(${placeholders})`

      try {
        const rows = await sql.unsafe(query, orderedParams as SqlParameterList)
        return {
          data: VOID_RPCS.has(name) ? null : (rows as TData),
          error: null
        }
      } catch (error) {
        return {
          data: null,
          error: mapDbError(error)
        }
      }
    }
  }
}
