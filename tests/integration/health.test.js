import assert from "node:assert/strict"
import { spawn } from "node:child_process"
import { once } from "node:events"
import { createServer } from "node:net"
import { devNull } from "node:os"
import { createInterface } from "node:readline"
import test from "node:test"
import { startTestDatabase } from "./testDatabase.js"

const APP_SCRIPT = `
  const { createApp } = await import("./server/app.js")
  const server = createApp().listen(0, "127.0.0.1", () => {
    console.log("Test app listening on port " + server.address().port)
  })
`

function startServer(t, args, databaseUrl, listeningPattern) {
  const child = spawn(process.execPath, args, {
    env: {
      ...process.env,
      DOTENV_CONFIG_PATH: devNull,
      SUPABASE_DB_URL: databaseUrl,
      DB_SSL_MODE: "disable",
      DB_AUTO_MIGRATE: "true",
      JWT_SECRET: "integration-test-secret",
      ADMIN_PASSWORD: "",
      PORT: "0",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })
  const closed = once(child, "close")
  const stdout = createInterface({ input: child.stdout })
  let stderr = ""
  child.stderr.setEncoding("utf8").on("data", (chunk) => { stderr += chunk })

  const ready = new Promise((resolve, reject) => {
    stdout.on("line", (line) => {
      const match = line.match(listeningPattern)
      if (match) resolve(Number(match[1]))
    })
    closed.then(([code, signal]) => {
      reject(new Error(`Server exited before listening (${code}, ${signal}): ${stderr}`))
    }, reject)
  })

  async function stop(signal = "SIGTERM") {
    if (child.exitCode === null && child.signalCode === null) child.kill(signal)
    return closed
  }

  t.after(() => stop("SIGKILL"))
  return { ready, stop }
}

async function getJson(port, path) {
  const response = await fetch(`http://127.0.0.1:${port}${path}`)
  return { status: response.status, data: await response.json() }
}

test("readiness reports an available database", { timeout: 12_000 }, async (t) => {
  const database = await startTestDatabase()
  const server = startServer(t, ["--input-type=module", "--eval", APP_SCRIPT],
    process.env.SUPABASE_DB_URL, /Test app listening on port (\d+)/)
  try {
    assert.deepEqual(await getJson(await server.ready, "/api/health/ready"), {
      status: 200,
      data: { ok: true, database: "up" },
    })
  } finally {
    await server.stop("SIGKILL")
    await database.stop()
  }
})

test("liveness stays up when readiness reports an unavailable database", { timeout: 12_000 }, async (t) => {
  const socket = createServer().listen(0, "127.0.0.1")
  await once(socket, "listening")
  const databaseUrl = `postgres://postgres@127.0.0.1:${socket.address().port}/postgres`
  await new Promise((resolve, reject) => {
    socket.close((error) => error ? reject(error) : resolve())
  })

  const server = startServer(t, ["--input-type=module", "--eval", APP_SCRIPT],
    databaseUrl, /Test app listening on port (\d+)/)
  const port = await server.ready
  assert.deepEqual(await getJson(port, "/api/health/ready"), {
    status: 503,
    data: { ok: false, database: "down" },
  })
  assert.deepEqual(await getJson(port, "/api/health"), {
    status: 200,
    data: { ok: true },
  })
})

test("the server stops after SIGTERM", { timeout: 12_000 }, async (t) => {
  const database = await startTestDatabase()
  const server = startServer(t, ["server/index.js"], process.env.SUPABASE_DB_URL,
    /Auth server listening on http:\/\/0\.0\.0\.0:(\d+)/)
  try {
    await server.ready
    const [code, signal] = await server.stop()
    if (process.platform === "win32" && code === null) {
      assert.equal(signal, "SIGTERM")
      t.diagnostic("Windows terminated the child with SIGTERM without running the JavaScript handler.")
    } else {
      assert.equal(code, 0)
      assert.equal(signal, null)
    }
  } finally {
    await server.stop("SIGKILL")
    await database.stop()
  }
})
