import Fastify from 'fastify';
import tokensRoutes from '../src/routes/tokens';

describe('tokens route', () => {
  test('returns paginated tokens', async () => {
    const app = Fastify();
    // attach a minimal aggregator with fake tokens
    (app as any).aggregator = {
      getTokens: () => {
        const map: any = {};
        for (let i = 0; i < 30; i++) map[`a${i}`] = { token_address: `a${i}`, token_name: `t${i}`, volume_sol: i };
        return map;
      }
    };
    app.register(tokensRoutes, { prefix: '/tokens' });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/tokens?limit=10' });
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.items.length).toBe(10);
    expect(body.nextCursor).toBeDefined();
    await app.close();
  });
});
