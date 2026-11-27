import { devNull } from "node:os"
import { PGlite } from "@electric-sql/pglite"
import { PGLiteSocketServer } from "@electric-sql/pglite-socket"

export async function startTestDatabase() {
  const db = await PGlite.create()
  const server = new PGLiteSocketServer({ db, host: "127.0.0.1", port: 0 })
  try {
    await server.start()
  } catch (error) {
    await db.close()
    throw error
  }

  // The pool reads its configuration on import. Keep it off the developer's .env.
  process.env.DOTENV_CONFIG_PATH = devNull
  process.env.SUPABASE_DB_URL = `postgres://postgres@${server.getServerConn()}/postgres`
  process.env.DB_SSL_MODE = "disable"

  return {
    async stop() {
      try {
        await server.stop()
      } finally {
        await db.close()
      }
    },
  }
}
