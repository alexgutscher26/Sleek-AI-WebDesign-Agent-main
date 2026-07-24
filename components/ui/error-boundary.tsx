"use client"

import React, { Component, ReactNode } from "react"
import { ErrorState } from "./view-state"

type Props = {
  children: ReactNode
  sectionName?: string
  fallback?: ReactNode
}

type State = {
  hasError: boolean
  error: Error | null
}

export class SectionErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary:${this.props.sectionName || "Section"}]`, error, errorInfo)
  }

  resetError = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="bg-background/50 flex h-full w-full items-center justify-center p-6">
          <ErrorState
            className="max-w-md"
            title={`${this.props.sectionName || "Section"} encountered an error`}
            description={this.state.error?.message || "An unexpected error occurred in this view."}
            actionLabel="Try again"
            onAction={this.resetError}
          />
        </div>
      )
    }

    return this.props.children
  }
}
