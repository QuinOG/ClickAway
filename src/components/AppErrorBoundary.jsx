import { Component } from "react"

export default class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  render() {
    if (!this.state.failed) return this.props.children
    return (
      <main className="pageCenter" role="alert">
        <section className="routeFallback">
          <h1>Could not open ClickAway</h1>
          <p>Reload the page to try again. Saved account progress is kept.</p>
          <button type="button" onClick={() => window.location.reload()}>Reload page</button>
        </section>
      </main>
    )
  }
}
