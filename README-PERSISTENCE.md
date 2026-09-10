# NS-05 V119 — persistent server authority

The security journal is stored in Render PostgreSQL, not only in RAM.

## Persisted data
- active run/challenge per player and night
- server start time and last heartbeat
- heartbeat sequence and coverage
- last accepted run time / score
- integrity and save-integrity fingerprints
- last gameplay snapshot
- suspicious/tainted state and reason
- security events
- player risk state

If the web service restarts during a run, the server reloads active runs and risk records from PostgreSQL. A suspicious run remains tainted after a restart.

## Render
The included `server/render.yaml` provisions a Render Postgres database and wires its private connection string into `DATABASE_URL` using `fromDatabase`. Secrets such as the LootLocker Server API key remain `sync: false` and must be supplied in Render.

The database is intentionally used as the authoritative security journal. The browser never receives the database credentials.
