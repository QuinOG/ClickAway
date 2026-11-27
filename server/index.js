import "dotenv/config"
import bcrypt from "bcryptjs"

const PORT = Number(process.env.PORT || 4000)
const JWT_SECRET = process.env.JWT_SECRET || ""
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin"
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || ""
const DB_AUTO_MIGRATE = process.env.DB_AUTO_MIGRATE !== "false"

if (!JWT_SECRET) {
  throw new Error("Missing JWT_SECRET. Set it in your environment before starting the server.")
}

const { createApp } = await import("./app.js")
const {
  createUser,
  findUserByUsername,
  updateUserPassword,
  updateUserRole,
  initializeSchema,
  verifySchema,
} = await import("./playerMysqlDatabase.js")

const app = createApp()

async function seedAdminAccount() {
  if (!ADMIN_PASSWORD) {
    console.log("Admin seed skipped: set ADMIN_PASSWORD in .env to create/update admin.")
    return
  }

  const existingAdmin = await findUserByUsername(ADMIN_USERNAME)
  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

  if (!existingAdmin) {
    await createUser({
      username: ADMIN_USERNAME,
      passwordHash,
      role: "admin",
    })
    console.log(`Admin account created for username "${ADMIN_USERNAME}".`)
    return
  }

  await updateUserPassword({
    id: existingAdmin.id,
    passwordHash,
  })
  if (existingAdmin.role !== "admin") {
    await updateUserRole({ id: existingAdmin.id, role: "admin" })
  }
  console.log(`Admin password refreshed for username "${existingAdmin.username}".`)
}

async function startServer() {
  if (DB_AUTO_MIGRATE) {
    await initializeSchema()
  } else {
    await verifySchema()
  }
  await seedAdminAccount()
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Auth server listening on http://0.0.0.0:${PORT}`)
  })
}

startServer().catch((error) => {
  console.error("Server failed to start:", error)
  process.exit(1)
})
