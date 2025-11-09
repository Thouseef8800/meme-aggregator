import Fastify from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';
import tokensRoutes from './routes/tokens';
import metrics from './metrics';
import { Aggregator } from './aggregator';
import { initCache, closeCache } from './cache';
import config from './config';
import { WebSocketServer, WebSocket } from 'ws';

const server = Fastify({ logger: true });

export async function buildServer() {
  // Initialize Redis or in-memory cache
  await initCache();

  // Serve static frontend files (optional)
  server.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  // Attach token routes
  server.register(tokensRoutes, { prefix: '/tokens' });

  // Expose simple Prometheus-style metrics
  server.get('/metrics', async (_req, reply) => {
    try {
      const body = await metrics.renderPrometheus();
      reply.header('content-type', 'text/plain; version=0.0.4; charset=utf-8').send(body);
    } catch (err) {
      reply.code(500);
      return 'error';
    }
  });

  // Debug endpoint: show circuit-breaker state (read-only)
  server.get('/debug/circuits', async (_req, reply) => {
    try {
      // lazy require to avoid circular imports in tests
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const httpClient = require('./httpClient');
      const state = httpClient.getCircuitState ? httpClient.getCircuitState() : {};
      return state;
    } catch (err) {
      reply.code(500);
      return { error: 'unable to read circuits' };
    }
  });

  // --- WebSocket setup using 'ws' ---
  const wss = new WebSocketServer({ noServer: true });

  // Handle HTTP → WebSocket upgrade
  server.server.on('upgrade', (req, socket, head) => {
    if (req.url === '/live') {
      wss.handleUpgrade(req, socket, head, (ws: WebSocket) => {
        wss.emit('connection', ws, req);
      });
    } else {
      socket.destroy();
    }
  });

  // --- Aggregator setup (for fetching and broadcasting token updates) ---
  const aggregator = new Aggregator();
  (server as any).aggregator = aggregator;

  // Sequence number for outgoing update batches
  let seq = 0;

  // batching pending updates to reduce broadcast thrash
  let pendingUpdates: any[] = [];
  let flushTimer: ReturnType<typeof setTimeout> | null = null;
  const FLUSH_MS = 120; // batch window

  function scheduleFlush() {
    if (flushTimer) return;
    flushTimer = setTimeout(flushPending, FLUSH_MS);
    try { if (flushTimer && typeof (flushTimer as any).unref === 'function') (flushTimer as any).unref(); } catch {}
  }

  function flushPending() {
    const batch = pendingUpdates.splice(0, pendingUpdates.length);
    flushTimer = null;
    if (batch.length === 0) return;

    // incoming batch may contain duplicates for same token; prefer last one per address
    const dedup: Record<string, any> = {};
    for (const u of batch) {
      if (u && u.token_address) dedup[String(u.token_address).toLowerCase()] = Object.assign(dedup[String(u.token_address).toLowerCase()] || {}, u);
    }
    const updates = Object.values(dedup);

    // For each connected client, apply its filter and send only matching tokens
    for (const client of wss.clients) {
      try {
        if ((client as any).readyState !== 1) continue;
        const wsClient: any = client;
        const filter = wsClient._filter || null;
        const matched = filter ? updates.filter((t: any) => matchesFilter(t, filter)) : updates;
        if (matched.length === 0) continue;
        const message = JSON.stringify({ seq: ++seq, event: 'tokens:update', data: matched });
        wsClient.send(message);
      } catch (e) {
        // ignore send errors per-client
      }
    }
  }

  function matchesFilter(t: any, filter: any) {
    if (!t) return false;
    if (!filter) return true;
    if (filter.protocol) {
      if (!t.protocol || String(t.protocol).toLowerCase().indexOf(String(filter.protocol).toLowerCase()) === -1) return false;
    }
    if (filter.symbols && Array.isArray(filter.symbols) && filter.symbols.length > 0) {
      const sym = (t.token_ticker || t.canonical_symbol || '').toUpperCase();
      const ok = filter.symbols.map((s: string) => String(s).toUpperCase()).includes(sym);
      if (!ok) return false;
    }
    if (filter.min_price_change_pct !== undefined && filter.min_price_change_pct !== null) {
      const v = Number(t.price_change_pct ?? t.price_change_24h_pct ?? 0);
      if (Number.isNaN(v) || v < Number(filter.min_price_change_pct)) return false;
    }
    return true;
  }

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    server.log.info('WebSocket client connected');

    ws.on('message', (msg: any) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.action === 'subscribe') {
          // Accept optional filter object
          const filter = data.filter && typeof data.filter === 'object' ? data.filter : null;
          // store filter on ws client for per-client filtering
          (ws as any)._filter = filter;
          ws.send(JSON.stringify({ event: 'subscribed', data: { window: '24h' } }));
          // send current snapshot (cached) as initial payload — keep it filtered
          try {
            const snapshot = aggregator.getTokens();
            const arr = Object.values(snapshot || {});
            const filtered = filter ? arr.filter((t: any) => matchesFilter(t, filter)) : arr;
            ws.send(JSON.stringify({ seq: ++seq, event: 'snapshot', data: filtered }));
          } catch (e) {
            // ignore if aggregator not ready
          }
        }
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on('close', () => {
      server.log.info('WebSocket client disconnected');
    });
  });

  // Wire aggregator updates into the pending queue (batched)
  aggregator.on('update', (updates) => {
    pendingUpdates.push(...(updates || []));
    scheduleFlush();
  });

  aggregator.on('snapshot', (snapshot) => {
    // snapshot event ignored for broadcast; clients receive snapshot on subscribe
  });

  return { server, wss, aggregator };
}

// Only invoke main listen when run directly (so tests can import buildServer without starting the server)
if (require.main === module) {
  (async () => {
    const { server, wss, aggregator } = await buildServer();
    try {
      await server.listen({ port: config.port, host: '0.0.0.0' });
      server.log.info(`HTTP Server running at http://localhost:${config.port}`);
      server.log.info(`WebSocket endpoint available at ws://localhost:${config.port}/live`);

      const shutdown = async (signal: string) => {
        server.log.info(`Received ${signal}, shutting down...`);
        try {
          // stop aggregator timers
          try { aggregator.stop(); } catch (e) {}
          // close websocket server
          try { wss.close(); } catch (e) {}
          // close http server
          try { await server.close(); } catch (e) {}
          // close cache/redis
          try { await closeCache(); } catch (e) {}
        } finally {
          server.log.info('Shutdown complete');
          process.exit(0);
        }
      };

      process.once('SIGINT', () => shutdown('SIGINT'));
      process.once('SIGTERM', () => shutdown('SIGTERM'));
    } catch (err) {
      server.log.error(err as Error);
      process.exit(1);
    }
  })();
}
