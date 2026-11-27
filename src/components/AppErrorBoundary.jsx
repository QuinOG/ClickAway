import { Component } from "react"

export default class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error, info) {
    // Without this the crash leaves no trace; the fallback alone hides the cause.
    console.error("ClickAway crashed while rendering:", error, info?.componentStack ?? "")
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="pageCenter">
        <section className="routeFallback" role="alert">
          <h1>Could not open ClickAway</h1>
          <p>Reload the page to try again. Saved account progress is kept.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        </section>
      </main>
    )
  }
}
