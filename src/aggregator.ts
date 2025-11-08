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
