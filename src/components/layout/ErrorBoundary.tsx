'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4">
          <div className="max-w-md mx-auto text-center flex flex-col gap-4">
            <h1 className="text-2xl">This screen stopped working</h1>
            <p className="text-ink-2 m-0">
              Your bids are saved. Reload the page to get back into the auction.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary self-center"
            >
              Reload
            </button>
            {this.state.error && (
              <details className="text-left mt-2">
                <summary className="text-sm text-ink-3 cursor-pointer">
                  Technical detail
                </summary>
                <pre className="mt-2 text-xs text-ink-2 bg-cloud p-3 rounded overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
