
## V118 — SERVER SURVEILLANCE / TAMPER RESPONSE
- Added 5-second trusted-gateway heartbeat telemetry.
- Added per-run server telemetry state and sequence validation.
- Added server-side detection for time rollback, score rollback, clock mismatch, score-rate anomalies and client tamper flags.
- Suspicious players/runs are blocked from leaderboard submission.
- Added runtime integrity checks for core game functions and leaderboard/save functions.
- Added `security_fail` screen: `ИЗВИНИ, НО НЕТ`.
- A failed security check at night completion prevents normal victory/progression.

### V118+ — authoritative completion gate
Server-authorized finalization, per-player risk memory, heartbeat coverage checks, runtime/save integrity fingerprints, and fifth-night rejection for tainted runs.
