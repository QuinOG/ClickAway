# Plan 006: The database connection can verify the server's TLS certificate

> **Executor instructions**: Read `plans/000-conventions.md` first. Follow this
> plan step by step and run every verification. On a STOP condition, stop and
> report.
>
> **Drift check (run first)**: `git diff --stat 1a307d9..HEAD -- server/db/pgPool.js .env.example README.md`

## Status

- **Priority**: P1
- **Effort**: S
- **Risk**: MED (a wrong setting stops the server from connecting)
- **Depends on**: none
- **Category**: security
- **Planned at**: commit `1a307d9`, 2026-11-27

## Why this matters

`server/db/pgPool.js:60-63` creates the pool with `ssl: { rejectUnauthorized: false }`.
The connection is encrypted but the server certificate is never checked, so
anyone on the network path can impersonate the database and read password
hashes and player data. Supabase signs its database certificates with its own
root CA, which is not in Node's default trust store. So simply flipping the
flag would break production. This plan adds an explicit configuration with
three modes and keeps today's behavior as a logged fallback until the operator
adds the CA.

## Current state

`server/db/pgPool.js:42-63`:

```js
const connectionString = String(process.env.SUPABASE_DB_URL || "").trim()
if (!connectionString) {
  throw new Error(
    "Missing SUPABASE_DB_URL. Copy the Postgres connection string from the Supabase Dashboard into .env."
  )
}
// ... URL parse and protocol check ...
const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})
```

`.env.example` lists the server variables. Read it before editing and match its comment style.

## Design

New env var `DB_SSL_MODE` with values:

- `verify`: `ssl: { rejectUnauthorized: true, ca }`. `ca` comes from
  `DB_SSL_CA`, either the PEM text itself (it starts with
  `-----BEGIN CERTIFICATE-----`; also accept `\n`-escaped newlines) or a path to
  a PEM file. If `verify` is set without a usable CA, throw at startup with a
  clear message.
- `disable`: `ssl: false`. Used for a local Postgres and for plan 011's
  in-process test database.
- `no-verify` (default when unset): today's behavior. Log one warning at startup:
  `Database TLS certificate is not verified. Set DB_SSL_MODE=verify and DB_SSL_CA (Supabase Dashboard → Database → SSL) to verify it.`

Put the parsing in a small exported pure function, `resolveDatabaseSsl(env, readFile)`,
in a new file `server/db/databaseSsl.js` so it can be unit-tested without a database.

## Scope

**In scope**: `server/db/pgPool.js`, `server/db/databaseSsl.js` (create),
`tests/databaseSsl.test.js` (create), `.env.example`, `README.md` (the env var
table or setup section only).

**Out of scope**: `SUPABASE_DB_URL` handling, Railway config, any query code.

## Steps

### Step 1: Create `server/db/databaseSsl.js` with `resolveDatabaseSsl`

It returns `{ ssl, warning }`.

**Verify**: `node -e "import('./server/db/databaseSsl.js').then(m=>console.log(typeof m.resolveDatabaseSsl))"` prints `function`.

### Step 2: Write `tests/databaseSsl.test.js`

Cases:
- Unset gives no-verify plus a warning.
- `disable` gives `ssl === false`.
- `verify` with inline PEM gives `rejectUnauthorized: true` and the CA string.
- `verify` with `\n`-escaped PEM gives real newlines.
- `verify` with a file path calls `readFile` and uses its contents.
- `verify` with no CA throws.
- An unknown mode throws, naming the allowed values.

**Verify**: `node --test tests/databaseSsl.test.js` → all pass.

### Step 3: Use it in `pgPool.js`, and log the warning once with `console.warn`

**Verify**: `npm run test:unit` → `ℹ fail 0`.

### Step 4: Document `DB_SSL_MODE` and `DB_SSL_CA` in `.env.example` and README. Use placeholder values only.

**Verify**: `grep -n "DB_SSL_MODE" .env.example README.md` shows both.

## Done criteria

- [ ] `grep -n "rejectUnauthorized: false" server/db/pgPool.js` returns nothing. The default now lives in `databaseSsl.js`.
- [ ] `node --test tests/databaseSsl.test.js` passes (7 cases)
- [ ] `npm run lint` and `npm test` exit 0
- [ ] Only in-scope files changed. Committed on `advisor/006-verify-database-tls`

## STOP conditions

- `pgPool.js` builds its config somewhere other than lines 42-63.
- Any test or script needs a real database to pass after your change.

## Maintenance notes

**Operator action after merge:** download the Supabase CA certificate, set
`DB_SSL_CA` (the PEM text) and `DB_SSL_MODE=verify` on Railway, and confirm the
startup log shows no TLS warning. Plan 011 uses `DB_SSL_MODE=disable` for its
test database. Once production runs in `verify`, a later change can make
`verify` the default.
