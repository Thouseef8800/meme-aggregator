import Redis from 'ioredis';
import config from './config';
import { TokenMap } from './types';
import metrics from './metrics';

let redis: Redis | null = null;
const memoryCache = new Map<string, string>();

export async function initCache() {
  if (config.redisUrl) {
    try {
      redis = new Redis(config.redisUrl);
      await redis.ping();
      console.log('Connected to Redis');
    } catch (err) {
      console.warn('Redis connection failed, using in-memory cache');
      redis = null;
    }
  }
}

export async function setCache(key: string, value: any, ttlSeconds?: number) {
  const str = JSON.stringify(value);
  if (redis) {
    try {
      await redis.set(key, str, 'EX', ttlSeconds || config.cacheTTL);
    } catch (err) {
      console.warn('Redis set failed, falling back to in-memory cache', err);
      // fallback to memory
      memoryCache.set(key, str);
      if (ttlSeconds) {
        const t = setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
        try { if (t && typeof (t as any).unref === 'function') (t as any).unref(); } catch {}
      }
  try { metrics.increment('cache_error_total', { op: 'set' }); } catch {}
      return;
    }
  } else {
    memoryCache.set(key, str);
    if (ttlSeconds) {
      const t = setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
      try {
        if (t && typeof (t as any).unref === 'function') (t as any).unref();
      } catch {}
    }
  }
  try { metrics.increment('cache_set_total'); } catch {}
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (redis) {
    try {
      const v = await redis.get(key);
      if (v) { try { metrics.increment('cache_hit_total'); } catch {} return (JSON.parse(v) as T); }
      try { metrics.increment('cache_miss_total'); } catch {}
      return null;
    } catch (err) {
      console.warn('Redis get failed, falling back to in-memory cache', err);
  try { metrics.increment('cache_error_total', { op: 'get' }); } catch {}
      const v = memoryCache.get(key);
      if (v) { try { metrics.increment('cache_hit_total'); } catch {} return (JSON.parse(v) as T); }
      try { metrics.increment('cache_miss_total'); } catch {}
      return null;
    }
  } else {
    const v = memoryCache.get(key);
    if (v) { try { metrics.increment('cache_hit_total'); } catch {} return (JSON.parse(v) as T); }
    try { metrics.increment('cache_miss_total'); } catch {}
    return null;
  }
}

export async function delCache(key: string) {
  if (redis) await redis.del(key);
  else memoryCache.delete(key);
}

// metadata helper for storing per-source headers like ETag / Last-Modified
export async function setMeta(key: string, meta: any) {
  const str = JSON.stringify(meta || {});
  if (redis) {
    try { await redis.set(key + ':meta', str); } catch (err) {
      console.warn('Redis setMeta failed, falling back to memory', err);
  try { metrics.increment('cache_error_total', { op: 'meta' }); } catch {}
      memoryCache.set(key + ':meta', str);
    }
  } else memoryCache.set(key + ':meta', str);
}

export async function getMeta<T = any>(key: string): Promise<T | null> {
  if (redis) {
    try {
      const v = await redis.get(key + ':meta');
      return v ? (JSON.parse(v) as T) : null;
    } catch (err) {
      console.warn('Redis getMeta failed, falling back to memory', err);
  try { metrics.increment('cache_error_total', { op: 'meta' }); } catch {}
      const v = memoryCache.get(key + ':meta');
      return v ? (JSON.parse(v) as T) : null;
    }
  } else {
    const v = memoryCache.get(key + ':meta');
    return v ? (JSON.parse(v) as T) : null;
  }
}

export function closeCache() {
  if (redis) redis.disconnect();
}
