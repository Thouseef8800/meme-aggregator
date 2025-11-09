import Fastify from 'fastify';
import tokensRoutes from '../src/routes/tokens';
import { setCache } from '../src/cache';
import { TokenData } from '../src/types';

describe('GET /tokens sorting by various metrics', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    await app.register(tokensRoutes, { prefix: '/tokens' });
    await app.ready();

    const tokens: Record<string, TokenData> = {
      't1': { token_address: 't1', token_ticker: 'T1', price_sol: 1, volume_sol: 50, market_cap: 1000, price_change_24h_pct: 2, volume_change_24h_pct: 5, last_updated: Date.now() },
      't2': { token_address: 't2', token_ticker: 'T2', price_sol: 2, volume_sol: 150, market_cap: 2000, price_change_24h_pct: 10, volume_change_24h_pct: 20, last_updated: Date.now() },
      't3': { token_address: 't3', token_ticker: 'T3', price_sol: 3, volume_sol: 100, market_cap: 500, price_change_24h_pct: -5, volume_change_24h_pct: -10, last_updated: Date.now() },
    };
    await setCache('aggregated:tokens', tokens, 60);
  });

  afterAll(async () => {
    await app.close();
  });

  test('sorts by market cap desc', async () => {
    const res = await app.inject({ method: 'GET', url: '/tokens?sort=marketcap_desc&limit=10' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const items: TokenData[] = body.items;
    expect(items[0].token_address).toBe('t2');
    expect(items[1].token_address).toBe('t1');
    expect(items[2].token_address).toBe('t3');
  });

  test('sorts by volume_change desc (24h)', async () => {
    const res = await app.inject({ method: 'GET', url: '/tokens?sort=volume_change&period=24h&limit=10' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const items: TokenData[] = body.items;
    // expected order t2 (20), t1 (5), t3 (-10)
    expect(items[0].token_address).toBe('t2');
    expect(items[1].token_address).toBe('t1');
    expect(items[2].token_address).toBe('t3');
  });
});
