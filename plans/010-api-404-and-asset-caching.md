# Plan 010: Unknown API routes return JSON 404, and hashed assets are cached long-term

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/app.js server/index.js`
> The static and SPA block lives in `server/app.js` or `server/index.js`
> after plan 011. Find it with `grep -n "distPath" server/*.js`.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW
- **Depends on**: 011
- **Category**: bug / perf
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

In production the server ends with:

```js
const distPath = join(__dirname, "../dist")

if (existsSync(distPath)) {
  app.use(express.static(distPath))
  app.get("/{*splat}", (_request, response) => {
    response.sendFile(join(distPath, "index.html"))
  })
}
```

So `GET /api/does-not-exist` returns `index.html` with status 200. A client typo
or a removed endpoint looks like success with an HTML body, and Axios then
fails in confusing ways. Vite's hashed files under `dist/assets/` never change,
yet they are served with default caching, so returning players download them again.

## Design

- Before the SPA catch-all, add
  `app.use("/api", (_request, response) => response.status(404).json({ error: "Not found." }))`.
  It must be registered **after** all API routes and **before** the static block.
- Serve `dist/assets` with `express.static(join(distPath, "assets"), { immutable: true, maxAge: "1y" })`
  mounted at `/assets`, before the general `express.static(distPath)`.
  `index.html` must not be cached long-term. Set `Cache-Control: no-cache` in
  the catch-all `sendFile` call (`{ headers: { "Cache-Control": "no-cache" } }`).

## Scope

**In scope**: the file that holds the static and SPA block, and an integration test case.
**Out of scope**: everything else.

## Steps

1. Add the API 404 handler. Test: `GET /api/nope` returns 404 JSON `{ error: "Not found." }`, and `POST /api/nope` also returns 404. **Verify**: `npm run test:integration` passes.
2. Asset caching. Test: create a temp `dist/assets/x-abc.js`, or point at a
   built `dist/` after `npm run build`. Check `Cache-Control` contains
   `immutable`, and `/` returns `no-cache`. If `distPath` is resolved at module
   load, the test may need `npm run build` first. Do that in the test setup
   only when `dist/` is missing, or skip with a clear message. **Verify**: passes.
3. **Verify**: `npm run lint` and `npm test` exit 0.

## Done criteria

- [ ] Unknown `/api/*` routes return JSON 404 (test)
- [ ] Assets are served `immutable`, and `index.html` with `no-cache` (test or documented skip)
- [ ] Committed on `advisor/010-api-404-and-asset-caching`

## STOP conditions

- An existing client call relies on an `/api` path that is served by the SPA fallback.

## Maintenance notes

New API routes must be registered before the 404 handler.
