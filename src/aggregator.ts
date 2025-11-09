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
    // Prevent the aggregator interval from keeping the Node process alive (helps tests exit cleanly)
    try {
      if (this.timer && typeof (this.timer as any).unref === 'function') (this.timer as any).unref();
    } catch {}
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

      // Fetch from primary API (DexScreener). GeckoTerminal endpoint was unreliable/404 — using DexScreener as primary source.
      let ds: any = null;
      try {
        ds = await getWithRetry<any>('https://api.dexscreener.com/latest/dex/search?q=solana');
      } catch (e) {
        // getWithRetry will abort on 4xx; log and continue with cached data
        console.warn('DexScreener fetch failed:', (e as Error).message);
      }

      const newMap: TokenMap = { ...(cached || {}) };

  if (ds) {
        // Diagnostic: log top-level keys and basic info to help map response shapes
        try {
          const topKeys = Object.keys(ds || {}).slice(0, 10);
          console.info('DexScreener response keys:', topKeys);
        } catch {}

        const items = ds?.pairs || ds?.tokens || ds?.data || ds?.pairs || [];
        console.info(`DexScreener returned ${Array.isArray(items) ? items.length : 0} items`);
        if (Array.isArray(items) && items.length > 0) {
          try { console.info('Sample item:', JSON.stringify(items[0]).slice(0, 800)); } catch {}
        }
        for (const it of items) {
          // Some responses are pair-based with baseToken and quoteToken. Add both tokens separately.
          const tokenCandidates: any[] = [];
          if (it.baseToken) tokenCandidates.push({ token: it.baseToken, role: 'base' });
          if (it.quoteToken) tokenCandidates.push({ token: it.quoteToken, role: 'quote' });
          if (it.token) tokenCandidates.push({ token: it.token, role: 'token' });
          // Some responses return token objects directly with address/contractAddress
          if (it.address || it.contractAddress || it.symbol) tokenCandidates.push({ token: it, role: 'direct' });

          for (const cand of tokenCandidates) {
            const tokenObj = cand.token || {};
            const addr = tokenObj.address || tokenObj.contractAddress;
            if (!addr) continue;
            const key = String(addr).toLowerCase();
            const td: TokenData = {
              token_address: key,
              token_name: tokenObj.name || tokenObj.tokenName || it.name || it.pairName,
                token_ticker: (tokenObj.symbol || tokenObj.tokenTicker || it.symbol || '').toUpperCase(),
                price_sol: Number(it.priceUsd || it.price || tokenObj.price || tokenObj.priceUsd) || undefined,
                volume_sol: Number(it.volume?.h24 || it.volume || tokenObj.usd24hVolume || tokenObj.volume) || undefined,
                protocol: it.dex || it.dexId || it.protocol || it.pairName || 'DexScreener',
                market_cap: Number(tokenObj.marketCap || tokenObj.market_cap || it.marketCap || it.market_cap) || undefined,
                canonical_symbol: (tokenObj.symbol || tokenObj.tokenTicker || it.symbol || '').toUpperCase(),
              source: 'dexscreener',
              last_updated: Date.now(),
            };
            newMap[key] = newMap[key] ? mergeToken(newMap[key], td) : td;
          }
        }
          // Post-process: mark primary address for canonical symbols (choose by highest volume)
          const symbolGroups: Record<string, { addr: string; vol: number }> = {};
          for (const [addr, data] of Object.entries(newMap)) {
            const sym = (data.canonical_symbol || data.token_ticker || '').toUpperCase();
            const vol = Number(data.volume_sol || 0);
            if (!sym) continue;
            if (!symbolGroups[sym] || vol > symbolGroups[sym].vol) symbolGroups[sym] = { addr, vol };
          }
          for (const [sym, entry] of Object.entries(symbolGroups)) {
            const a = entry.addr;
            if (newMap[a]) (newMap[a] as any).is_primary_for_symbol = true;
          }

          const keys = Object.keys(newMap);
          console.info(`Aggregated token keys count after processing items: ${keys.length}`);
      } else {
        console.warn('No DexScreener data available for this poll. Using cached tokens if any.');
      }

        // Also fetch from an additional DEX API (PancakeSwap tokens index) to satisfy multi-source requirement
        let ps: any = null;
        try {
          ps = await getWithRetry<any>('https://api.pancakeswap.info/api/v2/tokens');
        } catch (e) {
          console.warn('PancakeSwap fetch failed:', (e as Error).message);
        }

        if (ps) {
          try {
            // ps.data may be an object keyed by address, or an array
            const entries = ps.data && typeof ps.data === 'object' && !Array.isArray(ps.data)
              ? Object.values(ps.data)
              : ps.data || ps.tokens || [];
            console.info(`PancakeSwap returned ${Array.isArray(entries) ? entries.length : 0} items`);
            if (Array.isArray(entries) && entries.length > 0) {
              try { console.info('Sample Pancake item:', JSON.stringify(entries[0]).slice(0, 800)); } catch {}
            }
            for (const it of entries) {
              const addr = (it.address || it.token_address || it.contractAddress || it.id || it.base) && String((it.address || it.token_address || it.contractAddress || it.id || it.base)).toLowerCase();
              if (!addr) continue;
              const td: TokenData = {
                token_address: addr,
                token_name: it.name || it.tokenName || it.title || it.symbol,
                token_ticker: (it.symbol || '').toUpperCase(),
                price_sol: Number(it.price || it.price_usd || it.priceUSD || it.priceUsd) || undefined,
                volume_sol: undefined,
                protocol: 'pancakeswap',
                source: 'pancakeswap',
                last_updated: Date.now(),
              };
              newMap[addr] = newMap[addr] ? mergeToken(newMap[addr], td) : td;
            }
          } catch (e) {
            console.warn('Error processing PancakeSwap data:', (e as Error).message);
          }
        }

      // Compare previous tokens for changes with thresholding and spike detection
      const updates: TokenData[] = [];
      for (const k of Object.keys(newMap)) {
        const prev = this.tokens[k];
        const cur = newMap[k];
        if (!prev) {
          updates.push(cur);
          continue;
        }

        // compute percent changes where possible
        let price_change_pct: number | undefined = undefined;
        let volume_change_pct: number | undefined = undefined;
        const prevPrice = Number(prev.price_sol || 0);
        const curPrice = Number(cur.price_sol || 0);
        const prevVol = Number(prev.volume_sol || 0);
        const curVol = Number(cur.volume_sol || 0);

        if (prevPrice > 0 && curPrice > 0) {
          price_change_pct = ((curPrice - prevPrice) / prevPrice) * 100;
        }
        if (prevVol > 0 && curVol > 0) {
          volume_change_pct = ((curVol - prevVol) / prevVol) * 100;
        }

        const absPriceChange = Math.abs(price_change_pct || 0);
        const absVolumeChange = Math.abs(volume_change_pct || 0);

        const priceThreshold = Number(config.priceChangePercent || 1);
        const volumeThreshold = Number(config.volumeChangePercent || 100);
        const spikeFactor = Number(config.spikeFactor || 3);

        const isSpike = prevVol > 0 && curVol >= prevVol * spikeFactor;

        if (
          (price_change_pct !== undefined && absPriceChange >= priceThreshold) ||
          (volume_change_pct !== undefined && absVolumeChange >= volumeThreshold) ||
          isSpike
        ) {
          // attach computed fields to the emitted update copy
          const out: TokenData = { ...cur } as TokenData;
          if (price_change_pct !== undefined) out.price_change_pct = Number(price_change_pct.toFixed(4));
          if (volume_change_pct !== undefined) out.volume_change_pct = Number(volume_change_pct.toFixed(2));
          if (isSpike) out.is_spike = true;
          updates.push(out);
        }
      }

      this.tokens = newMap;
      await setCache('aggregated:tokens', this.tokens, config.cacheTTL);
  const total = Object.keys(this.tokens).length;
  console.info(`Aggregator: ${total} tokens aggregated, ${updates.length} updates detected`);
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
