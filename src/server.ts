import Fastify from 'fastify';
import path from 'path';
import fastifyStatic from '@fastify/static';
import tokensRoutes from './routes/tokens';
import { Aggregator } from './aggregator';
import { initCache } from './cache';
import config from './config';
import { WebSocketServer, WebSocket } from 'ws';

const server = Fastify({ logger: true });

async function main() {
  // Initialize Redis or in-memory cache
  await initCache();

  // Serve static frontend files (optional)
  server.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  // Attach token routes
  server.register(tokensRoutes, { prefix: '/tokens' });

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

  // Handle WebSocket connections
  wss.on('connection', (ws: WebSocket) => {
    server.log.info('WebSocket client connected');

  ws.on('message', (msg: any) => {
      try {
        const data = JSON.parse(msg.toString());
        if (data.action === 'subscribe') {
          ws.send(JSON.stringify({ event: 'subscribed', data: { window: '24h' } }));
          try {
            const snapshot = aggregator.getTokens();
            ws.send(JSON.stringify({ event: 'snapshot', data: snapshot }));
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

  // --- Aggregator setup (for fetching and broadcasting token updates) ---
  const aggregator = new Aggregator();
  (server as any).aggregator = aggregator;

  // Broadcast token updates to all WS clients
  aggregator.on('update', (updates) => {
    const message = JSON.stringify({ event: 'tokens:update', data: updates });
    for (const client of wss.clients) {
      if (client.readyState === 1) {
        client.send(message);
      }
    }
  });

  aggregator.on('snapshot', (snapshot) => {
    // Optional: could send snapshot to clients here
  });

  // Start Fastify HTTP server
  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
    server.log.info(`HTTP Server running at http://localhost:${config.port}`);
    server.log.info(`WebSocket endpoint available at ws://localhost:${config.port}/live`);
  } catch (err) {
    server.log.error(err as Error);
    process.exit(1);
  }
}

main();
