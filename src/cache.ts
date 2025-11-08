import Redis from 'ioredis';
import config from './config';
import { TokenMap } from './types';

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
    await redis.set(key, str, 'EX', ttlSeconds || config.cacheTTL);
  } else {
    memoryCache.set(key, str);
    if (ttlSeconds) {
      const t = setTimeout(() => memoryCache.delete(key), ttlSeconds * 1000);
      try {
        if (t && typeof (t as any).unref === 'function') (t as any).unref();
      } catch {}
    }
  }
}

export async function getCache<T = any>(key: string): Promise<T | null> {
  if (redis) {
    const v = await redis.get(key);
    return v ? (JSON.parse(v) as T) : null;
  } else {
    const v = memoryCache.get(key);
    return v ? (JSON.parse(v) as T) : null;
  }
}

export async function delCache(key: string) {
  if (redis) await redis.del(key);
  else memoryCache.delete(key);
}

export function closeCache() {
  if (redis) redis.disconnect();
}
