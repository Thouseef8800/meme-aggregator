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

    // sorting options (null/undefined values are treated as "last"):
    // - price_desc / price_asc (price_sol)
    // - volume_desc / volume_asc (volume_sol)
    // - marketcap_desc / marketcap_asc (market_cap)
    // - change (uses provider-mapped price_change_{period}_pct; requires period)
    // - volume_change (uses volume_change_24h_pct when available)
    const normalizeVal = (v: any): number | null => {
      if (v === null || v === undefined) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };

    // comparator that places null/undefined values at the end of the sorted list
    const byField = (field: string, order: 'asc' | 'desc' = 'desc') => {
      const dir = order === 'asc' ? 1 : -1;
      return (a: any, b: any) => {
        const av = normalizeVal((a as any)[field]);
        const bv = normalizeVal((b as any)[field]);
        if (av === null && bv === null) return 0;
        if (av === null) return 1; // a goes after b
        if (bv === null) return -1; // b goes after a
        if (av === bv) return 0;
        return (av - bv) * dir;
      };
    };

    const order = (q.order || 'desc').toLowerCase() === 'asc' ? 'asc' : 'desc';

    if (sort === 'price_desc' || sort === 'price_asc') arr.sort(byField('price_sol', sort === 'price_asc' ? 'asc' : 'desc'));
    else if (sort === 'volume_desc' || sort === 'volume_asc') arr.sort(byField('volume_sol', sort === 'volume_asc' ? 'asc' : 'desc'));
    else if (sort === 'marketcap_desc' || sort === 'marketcap_asc') arr.sort(byField('market_cap', sort === 'marketcap_asc' ? 'asc' : 'desc'));
    else if (sort === 'change' && changeField) arr.sort(byField(changeField, order));
    else if (sort === 'volume_change') arr.sort(byField('volume_change_24h_pct', order));

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
