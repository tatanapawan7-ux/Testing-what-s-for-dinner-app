import { Component } from 'react'

// React error boundaries must be class components — the one sanctioned
// exception to this codebase's hooks-only convention. Catches any render
// crash below it and shows a friendly recovery card instead of a blank page.
export default class ErrorBoundary extends Component {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error("What's for Dinner crashed:", error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-sm rounded-3xl border border-line bg-surface p-8 text-center shadow-card">
          <h1 className="font-display text-2xl font-bold text-ink">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted">
            Sorry about that — an unexpected error broke the page. Reloading usually fixes it,
            and your places and history are safe.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 w-full rounded-xl bg-gradient-to-br from-terra to-terra-light px-4 py-3 font-semibold text-white shadow-[0_8px_20px_-6px_rgba(194,99,47,0.5)] transition-all duration-300 hover:-translate-y-0.5 active:scale-95"
          >
            Reload the app
          </button>
        </div>
      </div>
    )
  }
}
