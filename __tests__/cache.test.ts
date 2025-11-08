import { setCache, getCache, initCache } from '../src/cache';

beforeAll(async () => {
  await initCache();
});

test('set and get cache in memory', async () => {
  await setCache('test:key', { a: 1 }, 1);
  const v = await getCache('test:key');
  expect(v).toEqual({ a: 1 });
});
