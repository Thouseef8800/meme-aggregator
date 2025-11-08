import { FastifyPluginAsync, FastifyInstance } from 'fastify';
import { Aggregator } from '../aggregator';
import { TokenData } from '../types';
import { getCache } from '../cache';

const plugin: FastifyPluginAsync = async (fastify: FastifyInstance, opts) => {
  const agg = (fastify as any).aggregator as Aggregator;

  fastify.get('/', async (request, reply) => {
    const q = request.query as any;
    const limit = Number(q.limit || 20);
    const cursor = q.cursor as string | undefined;
    // period and sort are accepted but for demo we do naive
    const period = q.period || '24h';

    const cache = await getCache<Record<string, TokenData>>('aggregated:tokens');
    const arr: TokenData[] = cache ? Object.values(cache) : Object.values(agg.getTokens());

    // naive sort: by volume desc if requested
    if (q.sort === 'volume_desc') arr.sort((a, b) => (b.volume_sol || 0) - (a.volume_sol || 0));

    let start = 0;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, 'base64').toString('utf-8');
        start = Number(decoded) || 0;
      } catch (e) { start = 0; }
    }

    const page = arr.slice(start, start + limit);
    let nextCursor: string | undefined;
    if (start + limit < arr.length) nextCursor = Buffer.from(String(start + limit)).toString('base64');

    return { items: page, nextCursor };
  });
};

export default plugin;
