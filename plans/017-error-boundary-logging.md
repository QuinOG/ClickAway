# Plan 017: App crashes caught by the error boundary are logged

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- src/components/AppErrorBoundary.jsx tests/appErrorBoundary.test.jsx`

## Status

- **Priority**: P3
- **Effort**: S
- **Risk**: LOW
- **Depends on**: none
- **Category**: dx
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

When a render error reaches `AppErrorBoundary`, the player sees "Could not
open ClickAway", but nothing is logged. Developers get no stack trace or
component stack. Adding `componentDidCatch` with `console.error` makes crashes
visible in the browser console and in Playwright traces. It also gives one
place to hook error tracking later (backlog §4, "Error tracking").

## Current state

`src/components/AppErrorBoundary.jsx` (whole file, 22 lines):

```jsx
import { Component } from "react"

export default class AppErrorBoundary extends Component {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
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
```

The existing test is `tests/appErrorBoundary.test.jsx`.

## Scope

**In scope**: `src/components/AppErrorBoundary.jsx`, `tests/appErrorBoundary.test.jsx`.
**Out of scope**: the fallback markup and copy, other components.

## Steps

### Step 1: Add the handler

```jsx
  componentDidCatch(error, info) {
    // Without this the crash leaves no trace; the fallback alone hides the cause.
    console.error("ClickAway crashed while rendering:", error, info?.componentStack ?? "")
  }
```

### Step 2: Extend the test

Add a case that renders a child that throws, spies on `console.error` with
`vi.spyOn(console, "error").mockImplementation(() => {})`, and asserts a call
whose first argument is `"ClickAway crashed while rendering:"` and whose second
is the thrown error.

**Verify** (from an uppercase `C:` path, see conventions): `npx vitest run --config vitest.config.js tests/appErrorBoundary.test.jsx` → all pass.

## Done criteria

- [ ] The test above passes, including the new case
- [ ] `npm run lint` exits 0
- [ ] Only the two in-scope files changed. Committed on `advisor/017-error-boundary-logging`

## STOP conditions

- `tests/appErrorBoundary.test.jsx` asserts that `console.error` is never called.

## Maintenance notes

When error tracking (for example Sentry) is added, report from `componentDidCatch`.
