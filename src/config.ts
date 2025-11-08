const config = {
  port: Number(process.env.PORT || 3000),
  cacheTTL: Number(process.env.CACHE_TTL_SECONDS || 30),
  redisUrl: process.env.REDIS_URL || '',
  pollInterval: Number(process.env.POLL_INTERVAL_SECONDS || 15),
};

export default config;
