import Fastify from 'fastify';
import tokensRoutes from '../src/routes/tokens';
import { setCache } from '../src/cache';
import { TokenData } from '../src/types';

describe('GET /tokens period sorting', () => {
  let app: ReturnType<typeof Fastify>;

  beforeAll(async () => {
    app = Fastify();
    // register the tokens plugin under prefix '/tokens'
    await app.register(tokensRoutes, { prefix: '/tokens' });
    await app.ready();

    // seed cache with deterministic tokens
    const tokens: Record<string, TokenData> = {
      'a': { token_address: 'a', token_ticker: 'AAA', price_sol: 1, price_change_24h_pct: 5, last_updated: Date.now() },
      'b': { token_address: 'b', token_ticker: 'BBB', price_sol: 2, price_change_24h_pct: 10, last_updated: Date.now() },
      'c': { token_address: 'c', token_ticker: 'CCC', price_sol: 3, price_change_24h_pct: -2, last_updated: Date.now() },
    };
    await setCache('aggregated:tokens', tokens, 60);
  });

  afterAll(async () => {
    await app.close();
  });

  test('sorts by 24h change desc when period=24h&sort=change', async () => {
    const res = await app.inject({ method: 'GET', url: '/tokens?period=24h&sort=change&limit=10' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    const items: TokenData[] = body.items;
    expect(items.length).toBeGreaterThanOrEqual(3);
    // first should have highest change (b:10), then a:5, then c:-2
    expect(items[0].token_address).toBe('b');
    expect(items[1].token_address).toBe('a');
    expect(items[2].token_address).toBe('c');
  });
});
