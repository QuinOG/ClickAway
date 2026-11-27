import test from "node:test"
import assert from "node:assert/strict"

import { resolveDatabaseSsl } from "../server/db/databaseSsl.js"

const PEM = "-----BEGIN CERTIFICATE-----\nunit-test-placeholder\n-----END CERTIFICATE-----"

function unexpectedRead() {
  assert.fail("readFile should not be called")
}

test("an unset mode keeps the unverified connection and warns", () => {
  const { ssl, warning } = resolveDatabaseSsl({}, unexpectedRead)

  assert.deepEqual(ssl, { rejectUnauthorized: false })
  assert.match(warning, /certificate is not verified/)
  assert.match(warning, /DB_SSL_MODE=verify/)
})

test("disable turns TLS off", () => {
  const { ssl, warning } = resolveDatabaseSsl({ DB_SSL_MODE: "disable" }, unexpectedRead)

  assert.equal(ssl, false)
  assert.equal(warning, null)
})

test("verify with inline PEM checks the certificate against it", () => {
  const { ssl, warning } = resolveDatabaseSsl(
    { DB_SSL_MODE: "verify", DB_SSL_CA: PEM },
    unexpectedRead
  )

  assert.deepEqual(ssl, { rejectUnauthorized: true, ca: PEM })
  assert.equal(warning, null)
})

test("verify turns escaped newlines in inline PEM into real newlines", () => {
  const { ssl } = resolveDatabaseSsl(
    { DB_SSL_MODE: "verify", DB_SSL_CA: PEM.replaceAll("\n", "\\n") },
    unexpectedRead
  )

  assert.equal(ssl.ca, PEM)
})

test("verify with a file path reads the CA from that file", () => {
  const paths = []
  const { ssl } = resolveDatabaseSsl(
    { DB_SSL_MODE: "verify", DB_SSL_CA: "certs/database-ca.crt" },
    (path) => {
      paths.push(path)
      return PEM
    }
  )

  assert.deepEqual(paths, ["certs/database-ca.crt"])
  assert.deepEqual(ssl, { rejectUnauthorized: true, ca: PEM })
})

test("verify without a usable CA throws", () => {
  assert.throws(
    () => resolveDatabaseSsl({ DB_SSL_MODE: "verify" }, unexpectedRead),
    /needs DB_SSL_CA/
  )
  assert.throws(
    () => resolveDatabaseSsl({ DB_SSL_MODE: "verify", DB_SSL_CA: "missing.crt" }, () => {
      throw new Error("ENOENT")
    }),
    /could not be read/
  )
  assert.throws(
    () => resolveDatabaseSsl({ DB_SSL_MODE: "verify", DB_SSL_CA: "empty.crt" }, () => ""),
    /does not contain/
  )
})

test("an unknown mode throws and names the allowed values", () => {
  assert.throws(
    () => resolveDatabaseSsl({ DB_SSL_MODE: "require" }, unexpectedRead),
    /verify, no-verify, disable/
  )
})
