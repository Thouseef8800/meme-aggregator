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
    const protocol = q.protocol as string | undefined;
    const sort = q.sort as string | undefined;

    const cache = await getCache<Record<string, TokenData>>('aggregated:tokens');
  let arr: TokenData[] = cache ? Object.values(cache) : Object.values(agg.getTokens());

    // filtering by protocol
    if (protocol) {
      arr = arr.filter((x) => (x.protocol || '').toLowerCase().includes(String(protocol).toLowerCase()));
    }

    // sorting options: price_desc, price_asc, volume_desc, volume_asc
    if (sort === 'price_desc') arr.sort((a, b) => (b.price_sol || 0) - (a.price_sol || 0));
    else if (sort === 'price_asc') arr.sort((a, b) => (a.price_sol || 0) - (b.price_sol || 0));
    else if (sort === 'volume_desc') arr.sort((a, b) => (b.volume_sol || 0) - (a.volume_sol || 0));
    else if (sort === 'volume_asc') arr.sort((a, b) => (a.volume_sol || 0) - (b.volume_sol || 0));

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
