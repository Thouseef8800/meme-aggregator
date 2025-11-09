const config = {
  port: Number(process.env.PORT || 3000),
  cacheTTL: Number(process.env.CACHE_TTL_SECONDS || 30),
  redisUrl: process.env.REDIS_URL || '',
  pollInterval: Number(process.env.POLL_INTERVAL_SECONDS || 30),
  priceChangePercent: Number(process.env.PRICE_CHANGE_PERCENT || 1),
  volumeChangePercent: Number(process.env.VOLUME_CHANGE_PERCENT || 100),
  spikeFactor: Number(process.env.SPIKE_FACTOR || 3),
  circuitFailures: Number(process.env.CIRCUIT_FAILURES || 3),
  circuitCooldownMs: Number(process.env.CIRCUIT_COOLDOWN_MS || 60000),
};

export default config;
