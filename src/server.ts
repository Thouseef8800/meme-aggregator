import Fastify from 'fastify';
import fastifySocket from 'fastify-socket.io';
import tokensRoutes from './routes/tokens';
import { Aggregator } from './aggregator';
import { initCache } from './cache';
import config from './config';
import path from 'path';
import fastifyStatic from '@fastify/static';

const server = Fastify({ logger: true });

async function main() {
  await initCache();

  // serve demo client from /public
  server.register(fastifyStatic, {
    root: path.join(__dirname, '..', 'public'),
    prefix: '/',
  });

  await server.register(fastifySocket);

  // create aggregator and attach to server instance
  const aggregator = new Aggregator();
  // attach aggregator for route handlers
  (server as any).aggregator = aggregator;

  server.register(tokensRoutes, { prefix: '/tokens' });

  // socket.io events
  server.io.on('connection', socket => {
    server.log.info('socket connected: ' + socket.id);
    // send initial snapshot
    socket.on('subscribe:snapshot', async () => {
      const snapshot = aggregator.getTokens();
      socket.emit('snapshot', snapshot);
    });

    socket.on('disconnect', () => {
      server.log.info('socket disconnected: ' + socket.id);
    });
  });

  aggregator.on('update', (updates) => {
    server.io.emit('tokens:update', updates);
  });

  aggregator.on('snapshot', (snapshot) => {
    // for demo we do not flood sockets with every snapshot; in real app use finer control
  });

  try {
    await server.listen({ port: config.port, host: '0.0.0.0' });
    server.log.info(`Server listening on ${config.port}`);
  } catch (err) {
    server.log.error(err as Error);
    process.exit(1);
  }
}

main();
