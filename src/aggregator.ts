import { EventEmitter } from 'events';
import { TokenData, TokenMap } from './types';
import config from './config';
import { getWithRetry } from './httpClient';
import { getCache, setCache } from './cache';

function mergeToken(a: TokenData, b: TokenData): TokenData {
  return { ...a, ...b, last_updated: Date.now() };
}

export class Aggregator extends EventEmitter {
  private tokens: TokenMap = {};
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    super();
    this.start();
  }

  async start() {
    await this.loadAndSchedule();
  }

  async loadAndSchedule() {
    await this.fetchAndUpdate();
    this.timer = setInterval(() => this.fetchAndUpdate(), config.pollInterval * 1000);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }

  async fetchAndUpdate() {
    try {
      const cacheKey = 'aggregated:tokens';
      // Try cache first
      const cached = await getCache<TokenMap>(cacheKey);
      if (cached) {
        // Emit cached snapshot (initial load)
        this.tokens = cached;
        this.emit('snapshot', this.tokens);
      }

      // Fetch from two APIs
      const [ds, gt] = await Promise.allSettled([
        getWithRetry<any>('https://api.dexscreener.com/latest/dex/search?q=solana'),
        getWithRetry<any>('https://api.geckoterminal.com/api/v2/networks/solana/tokens')
      ]);

      const newMap: TokenMap = { ...(cached || {}) };

      if (ds.status === 'fulfilled') {
        const items = ds.value?.pairs || ds.value?.tokens || [];
        for (const it of items) {
          // try to pick address field; structure may vary
          const addr = it?.tokenAddress || it?.address || it?.id;
          if (!addr) continue;
          const key = String(addr).toLowerCase();
          const td: TokenData = {
            token_address: key,
            token_name: it.name || it?.tokenName || it?.token_name,
            token_ticker: it.symbol || it?.tokenTicker || it?.token_ticker,
            price_sol: Number(it.priceUsd) || undefined,
            volume_sol: Number(it.volume) || undefined,
            protocol: it.dex || it.protocol || 'DexScreener',
            source: 'dexscreener',
            last_updated: Date.now(),
          };
          newMap[key] = newMap[key] ? mergeToken(newMap[key], td) : td;
        }
      }

      if (gt.status === 'fulfilled') {
        const items = gt.value?.data || gt.value || [];
        for (const it of items) {
          const addr = it?.tokenAddress || it?.address || it?.id || it?.token_address;
          if (!addr) continue;
          const key = String(addr).toLowerCase();
          const td: TokenData = {
            token_address: key,
            token_name: it.name || it?.tokenName,
            token_ticker: it.symbol || it?.tokenTicker,
            price_sol: Number(it.price) || undefined,
            volume_sol: Number(it.volume) || undefined,
            protocol: it.protocol || 'GeckoTerminal',
            source: 'geckoterminal',
            last_updated: Date.now(),
          };
          newMap[key] = newMap[key] ? mergeToken(newMap[key], td) : td;
        }
      }

      // Compare previous tokens for changes
      const updates: TokenData[] = [];
      for (const k of Object.keys(newMap)) {
        const prev = this.tokens[k];
        const cur = newMap[k];
        if (!prev) updates.push(cur);
        else if (cur.price_sol !== prev.price_sol || cur.volume_sol !== prev.volume_sol) updates.push(cur);
      }

      this.tokens = newMap;
      await setCache('aggregated:tokens', this.tokens, config.cacheTTL);

      if (updates.length) this.emit('update', updates);
      // Also emit a snapshot periodically
      this.emit('snapshot', this.tokens);
    } catch (err) {
      console.error('Aggregator fetch error', err);
    }
  }

  getTokens(): TokenMap {
    return this.tokens;
  }
}

export default Aggregator;
