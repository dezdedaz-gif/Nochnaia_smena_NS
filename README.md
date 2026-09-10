# NS-05 V117.5 — trusted leaderboard gateway

V117.5 keeps the HTML5 client untrusted and moves the **score write** behind a small HTTPS server. This matters because itch.io serves the game as client-side HTML/JavaScript, so the browser cannot be treated as authoritative. LootLocker itself warns that direct Game API score submission makes false scores trivial. citeturn1search2

## Files

- `index.mjs` — dependency-free Node 20+ gateway.
- `package.json` — start script.
- `.env.example` — environment variables.

## What the gateway checks

1. The client must have a valid LootLocker Game API session token.
2. The server resolves that token through LootLocker Server API and compares the verified player ID with the submitted player ID.
3. Night must be 1–5.
4. Run time must be 5–3600 seconds.
5. Score must be 0–108000.
6. Score cannot exceed `time × 30 + 120`.
7. Client anti-cheat flags must be empty.
8. Strict CORS, payload-size limits, security headers, per-player/IP rate limiting, and replay protection block common abuse.
9. Only after those checks does the server write to LootLocker Server API. There is no insecure Game API write fallback.

LootLocker documents Server API as the API intended for a trusted server, and Server API sessions use the server key plus `LL-Version`. citeturn2search0turn2search1

## Important LootLocker setup

For the strict version, use the two leaderboards as **Player** leaderboards and keep metadata enabled. Do not enable Game API writes if you want the backend to be the only score writer. LootLocker documents that Game API direct score writes are not recommended because players can submit false scores from the client. citeturn1search2turn1search3

## Environment

Copy `.env.example` into your hosting environment and set:

```text
LOOTLOCKER_SERVER_API_KEY=your_secret_server_key
ALLOWED_ORIGIN=https://YOURNAME.itch.io
SCORE_BOARD=night_shift_score
TIME_BOARD=night_shift_time
GAME_VERSION=1.17.5.0
```

**Never** put `LOOTLOCKER_SERVER_API_KEY` into the game ZIP.

## Client

In `netlb-config.js`:

```js
window.NETLB_CONFIG = {
  gameKey: 'YOUR_LIVE_GAME_API_KEY',
  backendUrl: 'https://your-backend.example.com',
  ...
};
```

The Game API key is public/client-side. The Server API key is not.

If `backendUrl` is empty, V117.5 deliberately **does not submit scores online**. Local scores still work. This prevents the release from silently falling back to an insecure direct-write path.

## Deployment

The backend must be hosted separately over HTTPS. itch.io hosts the HTML5 ZIP, not your Node server. The game ZIP itself remains static and contains no server secret. itch.io requires an `index.html` in the ZIP and supports relative paths for HTML5 projects. citeturn0search0
