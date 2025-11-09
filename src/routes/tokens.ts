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
    // period and sort: support period=1h|24h|7d and sort=change which orders by the corresponding provider-mapped field
    const period = (q.period || '24h').toLowerCase();
    const protocol = q.protocol as string | undefined;
    const sort = q.sort as string | undefined;

    // determine which mapped change field to use when period-based sorting/filtering requested
    let changeField: 'price_change_1h_pct' | 'price_change_24h_pct' | 'price_change_7d_pct' | null = null;
    if (period === '1h') changeField = 'price_change_1h_pct';
    else if (period === '24h') changeField = 'price_change_24h_pct';
    else if (period === '7d' || period === '7' || period === 'd7') changeField = 'price_change_7d_pct';

    const cache = await getCache<Record<string, TokenData>>('aggregated:tokens');
  let arr: TokenData[] = cache ? Object.values(cache) : Object.values(agg.getTokens());

    // filtering by protocol
    if (protocol) {
      arr = arr.filter((x) => (x.protocol || '').toLowerCase().includes(String(protocol).toLowerCase()));
    }

    // optional filtering by change magnitude: ?filter_change_gt=2
    const filterChangeGt = q.filter_change_gt ? Number(q.filter_change_gt) : null;
    if (filterChangeGt !== null && changeField) {
      arr = arr.filter((t) => (t as any)[changeField] !== null && (t as any)[changeField] !== undefined && Number((t as any)[changeField]) > filterChangeGt);
    }

    // sorting options: price_desc, price_asc, volume_desc, volume_asc, change
    if (sort === 'price_desc') arr.sort((a, b) => (b.price_sol || 0) - (a.price_sol || 0));
    else if (sort === 'price_asc') arr.sort((a, b) => (a.price_sol || 0) - (b.price_sol || 0));
    else if (sort === 'volume_desc') arr.sort((a, b) => (b.volume_sol || 0) - (a.volume_sol || 0));
    else if (sort === 'volume_asc') arr.sort((a, b) => (a.volume_sol || 0) - (b.volume_sol || 0));
    else if (sort === 'change' && changeField) {
      const dir = (q.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;
      arr.sort((a, b) => {
        const av = Number((a as any)[changeField] ?? 0);
        const bv = Number((b as any)[changeField] ?? 0);
        return (av - bv) * dir;
      });
    }

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
