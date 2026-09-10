# NS-05 V118 — server surveillance / tamper response

The browser is never trusted. During a connected run the client sends a small heartbeat every 5 seconds containing:
- run challenge and sequence number;
- elapsed run time and score;
- current game state;
- selected gameplay snapshot (battery, camera, monitor, doors, blackout);
- client anti-tamper flags.

The Render gateway verifies the LootLocker session, challenge, sequence, monotonic time/score, score rate and client flags. Suspicious runs are marked immediately and the player is blocked for the current security window.

If a run is flagged, the client switches to a neutral failure screen:

> ИЗВИНИ, НО НЕТ
> ПРОВЕРКА СМЕНЫ НЕ ПРОЙДЕНА.
> РЕЗУЛЬТАТ НЕ БУДЕТ ЗАСЧИТАН.

A suspicious fifth-night completion therefore cannot unlock the normal fifth-night completion path in this build.

Important: browser-side integrity checks are signals, not cryptographic proof. A determined cheater can modify the browser runtime. The trusted part is the Render server and its server-side state; for stronger guarantees, move authoritative gameplay state (or a compact event log) to the server.

## V118+ authoritative completion gate
- Each night starts with a server-issued challenge and server start timestamp.
- Heartbeats carry integrity and save-integrity fingerprints plus gameplay state snapshots.
- The server keeps a per-player risk/taint record for suspicious runs.
- Suspicious signals do not immediately end a normal night; they taint the five-night run.
- Final completion is authorized only after server-side heartbeat coverage, timing, monotonicity and integrity checks pass.
- A tainted player/run cannot unlock the fifth-night completion/finale; the client shows `ИЗВИНИ, НО НЕТ`.
- Online score/time are written by the server only after successful final authorization.
