// NS-05 V117.5 — PRODUCTION ONLINE LEADERBOARD
// The Game API key is public. The Server API key must NEVER be placed here.
window.NETLB_CONFIG = {
  // IMPORTANT: replace the development key with the LIVE Game API key from LootLocker before release.
  gameKey: 'REPLACE_WITH_LIVE_GAME_API_KEY',
  devMode: false,
  environment: 'production',
  gameVersion: '1.17.5.0',
  host: 'https://api.lootlocker.com/game',
  backendUrl: 'https://REPLACE_WITH_YOUR_RENDER_HOST',
  boards: { score: 'night_shift_score', time: 'night_shift_time' },
  count: 50,
  clientWriteFallback: false
};
