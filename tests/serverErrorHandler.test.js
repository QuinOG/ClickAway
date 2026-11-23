import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import express from "express"

import { handleExpressError } from "../server/routeErrors.js"

async function withServer(setupRoutes, run) {
  const app = express()
  app.use(express.json({ limit: "64kb" }))
  setupRoutes(app)
  app.use(handleExpressError)

  const server = await new Promise((resolve) => {
    const instance = app.listen(0, "127.0.0.1", () => resolve(instance))
  })
  const { port } = server.address()
  const baseUrl = `http://127.0.0.1:${port}`

  try {
    return await run(baseUrl)
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

test("handleExpressError returns JSON 500 for unguarded async rejections", async () => {
  const originalConsoleError = console.error
  console.error = () => {}
  try {
    await withServer(
      (app) => {
        app.get("/boom", async () => {
          throw new Error("db connection lost")
        })
      },
      async (baseUrl) => {
        const res = await fetch(`${baseUrl}/boom`)
        assert.equal(res.status, 500)
        assert.match(res.headers.get("content-type") || "", /application\/json/i)
        const body = await res.json()
        assert.deepEqual(body, { error: "Unexpected server error." })
      }
    )
  } finally {
    console.error = originalConsoleError
  }
})

test("handleExpressError returns generic JSON 400 for malformed JSON bodies", async () => {
  await withServer(
    (app) => {
      app.post("/echo", (req, res) => res.json(req.body))
    },
    async (baseUrl) => {
      const res = await fetch(`${baseUrl}/echo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: "{bad",
      })
      assert.equal(res.status, 400)
      assert.match(res.headers.get("content-type") || "", /application\/json/i)
      const body = await res.json()
      assert.deepEqual(body, { error: "Invalid JSON body." })
    }
  )
})

test("handleExpressError returns generic JSON 413 for oversized JSON bodies", async () => {
  await withServer(
    (app) => {
      app.post("/echo", (req, res) => res.json(req.body))
    },
    async (baseUrl) => {
      const oversized = JSON.stringify({ data: "x".repeat(70 * 1024) })
      const res = await fetch(`${baseUrl}/echo`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: oversized,
      })
      assert.equal(res.status, 413)
      assert.match(res.headers.get("content-type") || "", /application\/json/i)
      const body = await res.json()
      assert.deepEqual(body, { error: "Request body too large." })
    }
  )
})

test("handleExpressError preserves status and message for PlayerStateError and RoundAlreadySubmittedError", async () => {
  await withServer(
    (app) => {
      app.get("/player-error", async () => {
        const error = new Error("Not enough coins.")
        error.name = "PlayerStateError"
        error.status = 400
        throw error
      })
      app.get("/duplicate-round", async () => {
        const error = new Error("This round has already been submitted.")
        error.name = "RoundAlreadySubmittedError"
        error.status = 409
        throw error
      })
    },
    async (baseUrl) => {
      const playerRes = await fetch(`${baseUrl}/player-error`)
      assert.equal(playerRes.status, 400)
      assert.match(playerRes.headers.get("content-type") || "", /application\/json/i)
      assert.deepEqual(await playerRes.json(), { error: "Not enough coins." })

      const dupRes = await fetch(`${baseUrl}/duplicate-round`)
      assert.equal(dupRes.status, 409)
      assert.match(dupRes.headers.get("content-type") || "", /application\/json/i)
      assert.deepEqual(await dupRes.json(), { error: "This round has already been submitted." })
    }
  )
})

test("handleExpressError delegates to next when headers are already sent", () => {
  const err = new Error("late failure")
  let forwarded = null
  let statusCalled = false
  const response = {
    headersSent: true,
    status() {
      statusCalled = true
      return this
    },
  }
  handleExpressError(err, {}, response, (nextErr) => {
    forwarded = nextErr
  })
  assert.equal(forwarded, err)
  assert.equal(statusCalled, false)
})

test("server/index.js registers handleExpressError as the last app.use after static catch-all", () => {
  const source = readFileSync("server/index.js", "utf8")
  const staticBlockIndex = source.indexOf("app.use(express.static(distPath))")
  const errorUseIndex = source.lastIndexOf("app.use(handleExpressError)")
  const lastAppUseIndex = source.lastIndexOf("app.use(")
  assert.ok(staticBlockIndex > -1, "expected express.static(distPath) block")
  assert.ok(errorUseIndex > staticBlockIndex, "expected app.use(handleExpressError) after static block")
  assert.equal(errorUseIndex, lastAppUseIndex, "expected app.use(handleExpressError) to be the last app.use")
})
