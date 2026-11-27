import { readFileSync } from "node:fs"

const PEM_HEADER = "-----BEGIN CERTIFICATE-----"
const ALLOWED_MODES = ["verify", "no-verify", "disable"]

const UNVERIFIED_WARNING =
  "Database TLS certificate is not verified. Set DB_SSL_MODE=verify and DB_SSL_CA (Supabase Dashboard → Database → SSL) to verify it."

function readCaFile(path) {
  return readFileSync(path, "utf8")
}

// DB_SSL_CA holds either the certificate text or a path to it, because some
// hosts only offer environment variables and others can mount a file.
function loadCa(value, readFile) {
  const setting = String(value || "").trim()
  if (!setting) {
    throw new Error(
      "DB_SSL_MODE=verify needs DB_SSL_CA. Set it to the CA certificate PEM text or to the path of a PEM file."
    )
  }

  // Single-line environment variable editors store newlines as a literal \n.
  if (setting.startsWith(PEM_HEADER)) return setting.replace(/\\n/g, "\n")

  let contents
  try {
    contents = String(readFile(setting))
  } catch (error) {
    throw new Error(
      "DB_SSL_CA is not PEM text and could not be read as a file. Set it to the CA certificate PEM text or to the path of a PEM file.",
      { cause: error }
    )
  }

  if (!contents.includes(PEM_HEADER)) {
    throw new Error(`The DB_SSL_CA file does not contain a ${PEM_HEADER} block.`)
  }
  return contents
}

export function resolveDatabaseSsl(env, readFile = readCaFile) {
  // Unset keeps the unverified connection so that existing deployments, which
  // have no CA configured yet, still start. Supabase signs with its own root CA.
  const mode = String(env.DB_SSL_MODE || "").trim() || "no-verify"

  if (mode === "verify") {
    return {
      ssl: { rejectUnauthorized: true, ca: loadCa(env.DB_SSL_CA, readFile) },
      warning: null,
    }
  }
  if (mode === "disable") return { ssl: false, warning: null }
  if (mode === "no-verify") {
    return { ssl: { rejectUnauthorized: false }, warning: UNVERIFIED_WARNING }
  }

  throw new Error(`Unknown DB_SSL_MODE "${mode}". Use one of: ${ALLOWED_MODES.join(", ")}.`)
}
