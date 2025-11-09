import { initCache, setCache, getCache, delCache } from '../src/cache';

beforeAll(async () => {
  await initCache();
});

describe('cache integration', () => {
  test('set/get/del cache', async () => {
    await setCache('int:key', { v: 2 }, 1);
    const v = await getCache('int:key');
    expect(v).toEqual({ v: 2 });
    await delCache('int:key');
    const after = await getCache('int:key');
    expect(after).toBeNull();
  });
});
