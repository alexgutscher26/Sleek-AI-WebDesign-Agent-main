"use client";
import { useEffect, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({}));

  useEffect(() => {
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.warn("[Global Client Unhandled Rejection]", event.reason)
    }

    const handleGlobalError = (event: ErrorEvent) => {
      console.warn("[Global Client Error]", event.error || event.message)
    }

    window.addEventListener("unhandledrejection", handleUnhandledRejection)
    window.addEventListener("error", handleGlobalError)

    return () => {
      window.removeEventListener("unhandledrejection", handleUnhandledRejection)
      window.removeEventListener("error", handleGlobalError)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}
