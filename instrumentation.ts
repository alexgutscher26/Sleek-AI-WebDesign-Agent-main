export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.on("unhandledRejection", (reason) => {
      console.warn("[Global Server Unhandled Rejection]", reason)
    })

    process.on("uncaughtException", (error) => {
      console.error("[Global Server Uncaught Exception]", error)
    })
  }
}
