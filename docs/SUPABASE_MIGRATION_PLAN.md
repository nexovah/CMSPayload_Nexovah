# SQLite → Supabase (Postgres) Migration Plan

Status: **PAUSED — not started.** Saved 2026-10-30 for later. Do not resume
without re-reading this whole doc first.

## Why

Current backend (`cms.nexovah.com`) runs Payload CMS on a single SQLite file
on Hostinger (`db-nexovah/nexovah-payload.db`). Problems:
- Single point of failure — file lock/path issues have caused full-site
  blank-page outages more than once.
- No real concurrent-write safety (SQLite single-writer lock).
- No managed backups — only manual `cp` snapshots before each schema change.
- Every schema change needs manual `ALTER TABLE` over SSH (Payload's
  push-mode schema sync only runs in `next dev`, never in production).

Target: Supabase-hosted Postgres via `@payloadcms/db-postgres`, a properly
supported Payload adapter (not a hack).

## Prior attempt — already tried once, failed. Read before repeating.

A full attempt was made and reverted. Full blow-by-blow is in this project's
session transcript (search `270801c9-1d36-43d2-92e6-9331994aa4e3.jsonl` for
"supabase" around lines 17208–17910). Summary:

1. Swapped `payload.config.ts` to `postgresAdapter`, pushed schema to a
   Supabase project, wrote a migration script that read every collection via
   Payload's Local API (the correct approach — not raw SQL) and re-created
   each doc against Postgres.
2. Connection-pooler confusion first (transaction pooler on 6543 broke
   Payload's uniqueness-check sequence — needed session/direct instead).
3. **Core blocker**: writes through Payload's Postgres adapter against that
   Supabase connection were not durably persisting even when the API
   reported success. Symptoms: `findByID` returned truthy on a verified-empty
   table; row counts doubled then silently zeroed between runs; a genuine
   `EHOSTUNREACH` and an intermittent `"server does not support SSL
   connections"` error surfaced on the *same* connection string that had
   worked moments earlier. This points at an unstable network path from the
   environment the migration ran in (local sandbox) to Supabase — never
   conclusively diagnosed.
4. Side effect caught mid-attempt: a live lead-intake process was writing to
   the source SQLite file *while* it was being read for migration, causing
   13 real leads to balloon to 104 duplicated rows in the live file. Caught
   and deduplicated back to the correct 13 — no data lost, but it's a real
   risk to guard against next time (freeze a snapshot copy before any read).
5. Only 14 of 149 `media` records had their physical files still present
   locally — media binary migration will be partial no matter what; metadata
   (filenames/URLs/alt text) can still migrate so ID references from
   blogs/pages/services stay intact, but files need separate re-upload.
6. Fully reverted: `payload.config.ts` back to `sqliteAdapter`, nothing
   Postgres-related was ever committed/pushed, Hostinger/live was never
   touched. Local SQLite file was cleaned and verified (back to 13 real
   leads, all other collections intact).

**Conclusion carried forward**: the technique (migrate via Payload's own
Local/DB API, never raw SQL dump/convert) is correct in principle — a
generic SQLite→Postgres converter (pgloader etc.) will reliably break on
Payload's schema (array/block child tables, polymorphic `_rels` tables,
SQLite's loose typing vs Postgres strict types, ID sequencing). But last
time the actual failure was connection-layer reliability between the run
environment and Supabase, not the migration logic itself. That must be
proven stable *first*, from the environment that will actually run it
(ideally the Hostinger server itself via SSH, not a local sandbox), before
attempting real data migration again.

## Planned approach (when resumed)

### Step 0 — connection stability test (run first, every time, no exceptions)
From the Hostinger server (SSH), not a local machine: open the direct
Postgres connection to a **fresh** Supabase project and run ~50–100 rapid
write/read/delete cycles against a disposable test table, verifying every
write is actually durable on the next read. Only proceed past this step if
it comes back 100% clean.

### Step 1 — Supabase project
Create a **new, clean** Supabase project (do not reuse any project from the
earlier attempt — it may still hold corrupted partial-migration rows).
Get the **direct connection string** (not the REST API URL, not a pooler):
```
postgresql://postgres:[PASSWORD]@db.[project-ref].supabase.co:5432/postgres
```
Session pooler (5432) is the fallback if direct isn't reachable from
Hostinger; transaction pooler (6543) is explicitly ruled out — it broke
Payload's insert/uniqueness-check sequence last time.

### Step 2 — schema
Do **not** hand-write `CREATE TABLE` SQL. Point `@payloadcms/db-postgres` at
the empty Supabase DB and let Payload generate/push its own schema from
`payload.config.ts`. This guarantees exact column names/types/relationship
tables the app expects — a hand-written schema will drift and break
silently.

### Step 3 — data migration script
- Freeze a snapshot copy of the live SQLite file first (never read the live
  file directly while something else may be writing to it — this is exactly
  what caused the lead-duplication incident).
- Migrate collection-by-collection via Payload's Local API /
  `payload.db.create`, in dependency order (so relationships resolve).
- Special-case `users` — preserve the existing hashed password via a
  lower-level `db.create` rather than Payload's normal `create()` (which
  expects a plaintext password to hash).
- Idempotent, resumable: check-before-insert, but note last time
  `findByID`-based pre-checks were themselves unreliable against the flaky
  connection — verify any idempotency check against raw SQL ground truth,
  not just Payload's API, before trusting it.
- No abrupt `process.exit(0)` after writes — let the connection pool flush
  cleanly before the script exits; last time this caused writes to appear
  successful but not persist.
- Media: migrate metadata for all 149 records so ID references stay intact;
  flag the ~135 missing physical files for separate manual re-upload.

### Step 4 — verification
Compare row counts and spot-check content between source SQLite and target
Postgres via raw SQL (not just Payload's API) before considering any
collection migrated.

### Step 5 — cut over Hostinger
1. Commit + push the `payload.config.ts` adapter swap to the CMS repo's
   `main` (only after Steps 0–4 are fully verified).
2. In Hostinger's Node.js App Manager → `cms.nexovah.com` app → Environment
   Variables → change `DATABASE_URI` from the SQLite file path to the
   Supabase direct connection string.
3. Trigger/wait for redeploy.
4. Frontend (`dev.nexovah.com`, `nexovah.com`) needs no changes — it only
   talks to the `cms.nexovah.com` API either way.
5. Keep the SQLite file + its backups untouched on the server for a rollback
   window after cutover.

## Open questions for next time
- Was the connection flakiness specific to the local sandbox network, or to
  Supabase's pooler behavior generally? Step 0 (run from Hostinger, not
  local) should answer this.
- Decide where the ~135 missing media files live, if anywhere, before
  promising full media migration.
