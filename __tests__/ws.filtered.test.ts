import WebSocket from 'ws';
import { buildServer } from '../src/server';

let app: any;
let port: number;
let serverInstance: any;

beforeAll(async () => {
  const built = await buildServer();
  app = built.server;
  serverInstance = await app.listen({ port: 0 });
  // extract actual port
  const addr: any = app.server.address();
  port = typeof addr === 'object' ? addr.port : Number(process.env.PORT || 10000);
});

afterAll(async () => {
  if (app) await app.close();
});

test('WS filtered subscriptions receive only matching updates', (done) => {
  const url = `ws://127.0.0.1:${port}/live`;
  const clientA = new WebSocket(url);
  const clientB = new WebSocket(url);

  let aGot = false;
  let bGot = false;

  clientA.on('open', () => {
    // subscribe to protocol 'pancakeswap'
    clientA.send(JSON.stringify({ action: 'subscribe', filter: { protocol: 'pancakeswap' } }));
  });
  clientB.on('open', () => {
    // subscribe to tokens with symbol 'T1'
    clientB.send(JSON.stringify({ action: 'subscribe', filter: { symbols: ['T1'] } }));
  });

  clientA.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.event === 'snapshot' || msg.event === 'subscribed') return;
      if (msg.event === 'tokens:update') {
        const items = msg.data || [];
        // A should only get token with protocol pancakeswap (we will emit mixed updates)
        expect(items.length).toBeGreaterThanOrEqual(1);
        expect(items.every((t: any) => (t.protocol || '').toLowerCase().includes('pancakeswap'))).toBe(true);
        aGot = true;
        if (aGot && bGot) {
          clientA.close(); clientB.close(); done();
        }
      }
    } catch (e) { done(e); }
  });

  clientB.on('message', (data) => {
    try {
      const msg = JSON.parse(data.toString());
      if (msg.event === 'snapshot' || msg.event === 'subscribed') return;
      if (msg.event === 'tokens:update') {
        const items = msg.data || [];
        // B should only receive tokens with symbol T1
        expect(items.length).toBeGreaterThanOrEqual(1);
        expect(items.every((t: any) => (t.token_ticker || t.canonical_symbol || '') === 'T1')).toBe(true);
        bGot = true;
        if (aGot && bGot) {
          clientA.close(); clientB.close(); done();
        }
      }
    } catch (e) { done(e); }
  });

  // after both connected and subscribed, emit an aggregator update
  setTimeout(() => {
    const agg = (app as any).aggregator;
    // emit mixed updates
    agg.emit('update', [
      { token_address: '0x1', token_ticker: 'T1', protocol: 'pancakeswap', price_sol: 1 },
      { token_address: '0x2', token_ticker: 'T2', protocol: 'dexscreener', price_sol: 2 },
      { token_address: '0x3', token_ticker: 'T3', protocol: 'pancakeswap', price_sol: 3 },
    ]);
  }, 200);

  // safety timeout
  setTimeout(() => {
    if (!aGot || !bGot) done(new Error('Did not receive expected filtered updates in time'));
  }, 5000);
});
